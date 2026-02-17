import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { loginSchema } from "@reit1/shared";
import { config } from "../config.js";
import { logAudit } from "../lib/audit.js";
import type { JwtPayload, RequestUser } from "@reit1/shared";

const router = Router();

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
  user.lastLoginAt = new Date();
  await user.save();

  const payload: JwtPayload = { userId: user._id.toString(), email: user.email };
  const token = jwt.sign(
    payload as object,
    config.jwtSecret as jwt.Secret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );

  const reqUser: RequestUser = {
    userId: user._id.toString(),
    email: user.email,
    permissions: [], // not needed for audit
  };
  await logAudit(reqUser, "auth.login", "User", user._id.toString(), { email: user.email });

  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.userId)
    .select("email name roles isActive lastLoginAt")
    .populate("roles", "name permissions");
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const roles = (user.roles as unknown as { _id: string; name: string; permissions: string[] }[]) || [];
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
