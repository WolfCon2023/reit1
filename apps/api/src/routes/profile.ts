import { Router } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../lib/audit.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.userId)
    .select("email name isActive lastLoginAt createdAt")
    .lean();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.put("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { name } = req.body;
  if (name && typeof name === "string" && name.trim().length > 0) {
    user.name = name.trim();
  }
  await user.save();
  await logAudit(req.user!, "profile.update", "User", user._id.toString(), { name: user.name });
  res.json({ name: user.name, email: user.email });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const user = await User.findById(req.user!.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  await logAudit(req.user!, "profile.change_password", "User", user._id.toString());
  res.json({ ok: true, message: "Password changed successfully" });
});

export default router;
