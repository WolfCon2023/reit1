import { Router } from "express";
import { Lease } from "../models/Lease.js";
import { Project, Site } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { leaseCreateSchema, leaseUpdateSchema, PERMISSIONS } from "@reit1/shared";
import { logAudit } from "../lib/audit.js";

const router = Router({ mergeParams: true });

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveProject(projectId: string) {
  return Project.findById(projectId).lean();
}

router.get("/", requireAuth, requirePermission(PERMISSIONS.LEASES_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const status = String(req.query.status ?? "").trim();
  const siteId = String(req.query.siteId ?? "").trim();
  const search = String(req.query.search ?? "").trim();
  const expiringSoon = req.query.expiringSoon === "true";

  const filter: Record<string, unknown> = { projectId: proj._id, isDeleted: { $ne: true } };
  if (status) filter.status = status;
  if (siteId) filter.siteId = siteId;
  if (search) {
    filter.tenantName = new RegExp(escapeRegex(search), "i");
  }
  if (expiringSoon) {
    const window = new Date();
    window.setDate(window.getDate() + 90);
    filter.leaseEndDate = { $lte: window, $gte: new Date() };
    filter.status = "active";
  }

  const [items, totalCount] = await Promise.all([
    Lease.find(filter).sort("-leaseEndDate").skip((page - 1) * pageSize).limit(pageSize).lean(),
    Lease.countDocuments(filter),
  ]);

  res.json({ items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) });
});

router.get("/alerts", requireAuth, requirePermission(PERMISSIONS.LEASES_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const windowDays = Math.max(1, Number(req.query.windowDays) || 90);
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + windowDays);

  const leases = await Lease.find({
    projectId: proj._id,
    isDeleted: { $ne: true },
    status: "active",
    leaseEndDate: { $gte: now, $lte: future },
  }).sort("leaseEndDate").limit(50).lean();

  res.json({ items: leases, count: leases.length, windowDays });
});

router.post("/:siteId", requireAuth, requirePermission(PERMISSIONS.LEASES_WRITE), async (req, res) => {
  const { projectId, siteId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const site = await Site.findOne({ _id: siteId, projectId: proj._id, isDeleted: { $ne: true } });
  if (!site) { res.status(404).json({ error: "Site not found" }); return; }

  const parsed = leaseCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const lease = await Lease.create({
    ...parsed.data,
    projectId: proj._id,
    siteId: site._id,
    createdBy: req.user!.userId,
    updatedBy: req.user!.userId,
  });

  await logAudit(req.user!, "lease.create", "Lease", lease._id.toString(), { tenantName: lease.tenantName, projectId });
  res.status(201).json(lease);
});

router.put("/:leaseId", requireAuth, requirePermission(PERMISSIONS.LEASES_WRITE), async (req, res) => {
  const { projectId, leaseId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = leaseUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const lease = await Lease.findOne({ _id: leaseId, projectId: proj._id, isDeleted: { $ne: true } });
  if (!lease) { res.status(404).json({ error: "Lease not found" }); return; }

  Object.assign(lease, parsed.data);
  lease.updatedBy = req.user!.userId;
  await lease.save();

  await logAudit(req.user!, "lease.update", "Lease", lease._id.toString(), { tenantName: lease.tenantName, projectId });
  res.json(lease);
});

router.delete("/:leaseId", requireAuth, requirePermission(PERMISSIONS.LEASES_DELETE), async (req, res) => {
  const { projectId, leaseId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const lease = await Lease.findOne({ _id: leaseId, projectId: proj._id, isDeleted: { $ne: true } });
  if (!lease) { res.status(404).json({ error: "Lease not found" }); return; }

  lease.isDeleted = true;
  lease.updatedBy = req.user!.userId;
  await lease.save();

  await logAudit(req.user!, "lease.delete", "Lease", lease._id.toString(), { tenantName: lease.tenantName, projectId });
  res.json({ ok: true });
});

export default router;
