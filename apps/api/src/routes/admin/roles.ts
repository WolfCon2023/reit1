import { Router } from "express";
import { Role, User } from "../../models/index.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { createRoleSchema, updateRoleSchema } from "@reit1/shared";
import { PERMISSIONS, ROLE_NAMES } from "@reit1/shared";
import { logAudit } from "../../lib/audit.js";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.ROLES_READ), async (_req, res) => {
  const roles = await Role.find({}).sort({ name: 1 }).lean();
  res.json(roles);
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.ROLES_MANAGE), async (req, res) => {
  const parsed = createRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const existing = await Role.findOne({ name: parsed.data.name });
  if (existing) {
    res.status(409).json({ error: "Role name already exists" });
    return;
  }
  const role = await Role.create({
    ...parsed.data,
    isSystem: false,
  });
  await logAudit(req.user!, "role.create", "Role", role._id.toString(), { name: role.name });
  res.status(201).json(role);
});

router.put("/:id", requireAuth, requirePermission(PERMISSIONS.ROLES_MANAGE), async (req, res) => {
  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const role = await Role.findById(req.params.id);
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  if (role.name === ROLE_NAMES.SUPER_ADMIN) {
    res.status(403).json({ error: "Cannot modify Super Admin role" });
    return;
  }
  Object.assign(role, parsed.data);
  await role.save();
  await logAudit(req.user!, "role.update", "Role", role._id.toString(), { name: role.name });
  res.json(role);
});

router.delete("/:id", requireAuth, requirePermission(PERMISSIONS.ROLES_MANAGE), async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) {
    res.status(404).json({ error: "Role not found" });
    return;
  }
  if (role.isSystem) {
    res.status(403).json({ error: "Cannot delete system role" });
    return;
  }
  const inUse = await User.countDocuments({ roles: role._id });
  if (inUse > 0) {
    res.status(409).json({ error: "Role is assigned to users; remove assignments first" });
    return;
  }
  await Role.findByIdAndDelete(role._id);
  await logAudit(req.user!, "role.delete", "Role", role._id.toString(), { name: role.name });
  res.json({ ok: true });
});

export default router;
