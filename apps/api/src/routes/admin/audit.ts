import { Router } from "express";
import { AuditLog } from "../../models/index.js";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.AUDIT_READ), async (req, res) => {
  const actor = String(req.query.actor ?? "").trim();
  const action = String(req.query.action ?? "").trim();
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const filter: Record<string, unknown> = {};
  if (actor) filter.actorUserId = actor;
  if (action) filter.action = new RegExp(escapeRegex(action), "i");
  if (from || to) {
    filter.createdAt = {};
    if (from) (filter.createdAt as Record<string, Date>).$gte = from;
    if (to) (filter.createdAt as Record<string, Date>).$lte = to;
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default router;
