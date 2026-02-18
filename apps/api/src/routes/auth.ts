import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import {
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordWithCodeSchema,
} from "@reit1/shared";
import { config } from "../config.js";
import { logAudit } from "../lib/audit.js";
import { sendOtpEmail, sendResetCodeEmail } from "../services/email.js";
import type { JwtPayload, RequestUser } from "@reit1/shared";

const router = Router();

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESET_EXPIRY_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function generateCode(): string {
  return crypto.randomInt(100_000, 999_999).toString();
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

  const code = generateCode();
  user.otpHash = await bcrypt.hash(code, 10);
  user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  user.otpAttempts = 0;
  await user.save();

  sendOtpEmail(user.email, user.name, code).catch((err) =>
    console.error("Failed to send OTP email:", err)
  );

  const otpPayload = { userId: user._id.toString(), purpose: "otp" };
  const otpToken = jwt.sign(otpPayload as object, config.jwtSecret as jwt.Secret, {
    expiresIn: "5m",
  } as jwt.SignOptions);

  res.json({ requiresOtp: true, otpToken });
});

// ── POST /verify-otp ────────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { otpToken, code } = parsed.data;

  let decoded: { userId: string; purpose?: string };
  try {
    decoded = jwt.verify(otpToken, config.jwtSecret) as { userId: string; purpose?: string };
  } catch {
    res.status(401).json({ error: "OTP session expired. Please log in again." });
    return;
  }
  if (decoded.purpose !== "otp") {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or disabled" });
    return;
  }
  if (!user.otpHash || !user.otpExpiresAt) {
    res.status(401).json({ error: "No pending OTP. Please log in again." });
    return;
  }
  if (user.otpExpiresAt < new Date()) {
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    await user.save();
    res.status(401).json({ error: "OTP has expired. Please log in again." });
    return;
  }
  if ((user.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    await user.save();
    res.status(429).json({ error: "Too many attempts. Please log in again." });
    return;
  }

  const codeMatch = await bcrypt.compare(code, user.otpHash);
  if (!codeMatch) {
    user.otpAttempts = (user.otpAttempts ?? 0) + 1;
    await user.save();
    const remaining = MAX_OTP_ATTEMPTS - (user.otpAttempts ?? 0);
    res.status(401).json({ error: `Invalid code. ${remaining} attempt(s) remaining.` });
    return;
  }

  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  user.lastLoginAt = new Date();
  await user.save();

  const payload: JwtPayload = { userId: user._id.toString(), email: user.email };
  const token = jwt.sign(payload as object, config.jwtSecret as jwt.Secret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);

  const reqUser: RequestUser = {
    userId: user._id.toString(),
    email: user.email,
    permissions: [],
  };
  await logAudit(reqUser, "auth.login", "User", user._id.toString(), { email: user.email });

  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

// ── POST /forgot-password ───────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  // Always return 200 to prevent email enumeration
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

  const reqUser: RequestUser = {
    userId: user._id.toString(),
    email: user.email,
    permissions: [],
  };
  await logAudit(reqUser, "auth.resetPassword", "User", user._id.toString(), {
    method: "self-service",
  });

  res.json({ ok: true });
});

// ── GET /me ─────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.userId)
    .select("email name roles isActive lastLoginAt")
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
    permissions,
    roles: roles.map((r) => ({ id: r._id, name: r.name })),
  });
});

export default router;
