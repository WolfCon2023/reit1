import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import {
  loginSchema,
  mfaLoginSchema,
  forgotPasswordSchema,
  resetPasswordWithCodeSchema,
} from "@reit1/shared";
import { config } from "../config.js";
import { logAudit } from "../lib/audit.js";
import { sendResetCodeEmail } from "../services/email.js";
import * as mfaService from "../services/mfa.js";
import type { JwtPayload, RequestUser } from "@reit1/shared";

const router = Router();

const RESET_EXPIRY_MS = 15 * 60 * 1000;

function generateCode(): string {
  return crypto.randomInt(100_000, 999_999).toString();
}

function issueAccessToken(user: { _id: unknown; email: string }) {
  const payload: JwtPayload = { userId: String(user._id), email: user.email };
  return jwt.sign(payload as object, config.jwtSecret as jwt.Secret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

// ── POST /login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.mfaEnabled) {
    const mfaPayload = { userId: user._id.toString(), purpose: "mfa_verification" };
    const mfaToken = jwt.sign(mfaPayload as object, config.jwtSecret as jwt.Secret, {
      expiresIn: "5m",
    } as jwt.SignOptions);
    res.json({
      requiresMfa: true,
      mfaToken,
      message: "Please enter your two-factor authentication code",
    });
    return;
  }

  user.lastLoginAt = new Date();
  await user.save();
  const token = issueAccessToken(user);

  const reqUser: RequestUser = { userId: user._id.toString(), email: user.email, permissions: [] };
  await logAudit(reqUser, "auth.login", "User", user._id.toString(), { email: user.email });

  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

// ── POST /login/mfa ─────────────────────────────────────────────────
router.post("/login/mfa", async (req, res) => {
  const parsed = mfaLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { mfaToken, code } = parsed.data;

  let decoded: { userId: string; purpose?: string };
  try {
    decoded = jwt.verify(mfaToken, config.jwtSecret) as { userId: string; purpose?: string };
  } catch {
    res.status(401).json({ error: "MFA session expired. Please login again." });
    return;
  }
  if (decoded.purpose !== "mfa_verification") {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const result = await mfaService.verifyMfaLogin(decoded.userId, code);
  if (!result.success) {
    res.status(401).json({ error: result.message });
    return;
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or disabled" });
    return;
  }

  user.lastLoginAt = new Date();
  await user.save();
  const token = issueAccessToken(user);

  const reqUser: RequestUser = { userId: user._id.toString(), email: user.email, permissions: [] };
  await logAudit(reqUser, "auth.login", "User", user._id.toString(), {
    email: user.email,
    mfa: true,
  });

  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

// ── POST /forgot-password ───────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const user = await User.findOne({ email: parsed.data.email.toLowerCase(), isActive: true });
  if (user) {
    const code = generateCode();
    user.resetCode = await bcrypt.hash(code, 10);
    user.resetExpiresAt = new Date(Date.now() + RESET_EXPIRY_MS);
    await user.save();
    sendResetCodeEmail(user.email, user.name, code).catch((err) =>
      console.error("Failed to send reset code email:", err)
    );
  }
  res.json({ ok: true });
});

// ── POST /reset-password ────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordWithCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { email, code, newPassword } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user || !user.resetCode || !user.resetExpiresAt) {
    res.status(400).json({ error: "Invalid or expired reset code." });
    return;
  }
  if (user.resetExpiresAt < new Date()) {
    user.resetCode = undefined;
    user.resetExpiresAt = undefined;
    await user.save();
    res.status(400).json({ error: "Reset code has expired. Please request a new one." });
    return;
  }
  const codeMatch = await bcrypt.compare(code, user.resetCode);
  if (!codeMatch) {
    res.status(400).json({ error: "Invalid reset code." });
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.resetCode = undefined;
  user.resetExpiresAt = undefined;
  await user.save();

  const reqUser: RequestUser = { userId: user._id.toString(), email: user.email, permissions: [] };
  await logAudit(reqUser, "auth.resetPassword", "User", user._id.toString(), {
    method: "self-service",
  });
  res.json({ ok: true });
});

// ── GET /me ─────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.userId)
    .select("email name roles isActive lastLoginAt mfaEnabled")
    .populate("roles", "name permissions");
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const roles =
    (user.roles as unknown as { _id: string; name: string; permissions: string[] }[]) || [];
  const permissions = [...new Set(roles.flatMap((r) => r.permissions || []))];
  res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    mfaEnabled: !!user.mfaEnabled,
    permissions,
    roles: roles.map((r) => ({ id: r._id, name: r.name })),
  });
});

export default router;
