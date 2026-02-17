import { Router } from "express";
import bcrypt from "bcrypt";
import { User } from "../../models/index.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { createUserSchema, updateUserSchema, resetPasswordSchema } from "@reit1/shared";
import { PERMISSIONS } from "@reit1/shared";
import { logAudit } from "../../lib/audit.js";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.USERS_READ), async (_req, res) => {
  const users = await User.find({})
    .select("email name roles isActive lastLoginAt createdAt")
    .populate("roles", "name")
    .sort({ createdAt: -1 })
    .lean();
  res.json(users.map((u) => ({
    ...u,
    id: u._id,
    roles: Array.isArray(u.roles) ? u.roles.map((r: unknown) => {
      const x = r as { _id?: string; name?: string };
      return { _id: x?._id ?? "", name: x?.name ?? String(r) };
    }) : [],
  })));
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { email, name, password, roleIds } = parsed.data;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email: email.toLowerCase(),
    name,
    passwordHash,
    roles: roleIds,
    isActive: true,
  });
  await logAudit(req.user!, "user.create", "User", user._id.toString(), { email: user.email });
  res.status(201).json({
    id: user._id,
    email: user.email,
    name: user.name,
    roles: user.roles,
    isActive: user.isActive,
    createdAt: user.createdAt,
  });
});

router.put("/:id", requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { email, name, roleIds } = parsed.data;
  if (email) user.email = email.toLowerCase();
  if (name) user.name = name;
  if (roleIds) user.roles = roleIds;
  await user.save();
  await logAudit(req.user!, "user.update", "User", user._id.toString(), { email: user.email });
  res.json(user);
});

router.post("/:id/reset-password", requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await user.save();
  await logAudit(req.user!, "user.resetPassword", "User", user._id.toString(), {});
  res.json({ ok: true });
});

router.post("/:id/disable", requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  user.isActive = false;
  await user.save();
  await logAudit(req.user!, "user.disable", "User", user._id.toString(), { email: user.email });
  res.json(user);
});

router.post("/:id/enable", requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  user.isActive = true;
  await user.save();
  await logAudit(req.user!, "user.enable", "User", user._id.toString(), { email: user.email });
  res.json(user);
});

export default router;
