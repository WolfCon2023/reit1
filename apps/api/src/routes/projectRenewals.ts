import { Router } from "express";
import { LeaseRenewal } from "../models/LeaseRenewal.js";
import { Lease } from "../models/Lease.js";
import { Project } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";
import { logAudit } from "../lib/audit.js";

const router = Router({ mergeParams: true });

async function resolveProject(projectId: string) {
  return Project.findById(projectId).lean();
}

router.get("/", requireAuth, requirePermission(PERMISSIONS.LEASES_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const status = String(req.query.status ?? "").trim();
  const filter: Record<string, unknown> = { projectId: proj._id };
  if (status) filter.status = status;

  const items = await LeaseRenewal.find(filter).sort("-createdAt").limit(100).lean();
  res.json({ items });
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.LEASES_WRITE), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const { leaseId, proposedEndDate, proposedMonthlyRent, notes } = req.body;
  if (!leaseId || !proposedEndDate || proposedMonthlyRent == null) {
    res.status(400).json({ error: "leaseId, proposedEndDate, and proposedMonthlyRent are required" });
    return;
  }

  const lease = await Lease.findOne({ _id: leaseId, projectId: proj._id, isDeleted: { $ne: true } });
  if (!lease) { res.status(404).json({ error: "Lease not found" }); return; }

  const renewal = await LeaseRenewal.create({
    projectId: proj._id,
    leaseId: lease._id,
    siteId: lease.siteId,
    tenantName: lease.tenantName,
    currentEndDate: lease.leaseEndDate,
    proposedEndDate: new Date(proposedEndDate),
    proposedMonthlyRent: Number(proposedMonthlyRent),
    notes,
    status: "pending",
    requestedBy: req.user!.userId,
  });

  await logAudit(req.user!, "renewal.create", "LeaseRenewal", renewal._id.toString(), {
    leaseId, tenantName: lease.tenantName, projectId,
  });
  res.status(201).json(renewal);
});

router.post("/:renewalId/approve", requireAuth, requirePermission(PERMISSIONS.LEASES_WRITE), async (req, res) => {
  const { projectId, renewalId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const renewal = await LeaseRenewal.findOne({ _id: renewalId, projectId: proj._id, status: "pending" });
  if (!renewal) { res.status(404).json({ error: "Renewal not found or already processed" }); return; }

  renewal.status = "approved";
  renewal.reviewedBy = req.user!.userId;
  renewal.reviewedAt = new Date();
  renewal.reviewNotes = req.body.reviewNotes ?? "";
  await renewal.save();

  const lease = await Lease.findById(renewal.leaseId);
  if (lease && !lease.isDeleted) {
    lease.leaseEndDate = renewal.proposedEndDate;
    lease.monthlyRent = renewal.proposedMonthlyRent;
    lease.updatedBy = req.user!.userId;
    await lease.save();
  }

  await logAudit(req.user!, "renewal.approve", "LeaseRenewal", renewalId, {
    tenantName: renewal.tenantName, projectId,
  });
  res.json(renewal);
});

router.post("/:renewalId/reject", requireAuth, requirePermission(PERMISSIONS.LEASES_WRITE), async (req, res) => {
  const { projectId, renewalId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const renewal = await LeaseRenewal.findOne({ _id: renewalId, projectId: proj._id, status: "pending" });
  if (!renewal) { res.status(404).json({ error: "Renewal not found or already processed" }); return; }

  renewal.status = "rejected";
  renewal.reviewedBy = req.user!.userId;
  renewal.reviewedAt = new Date();
  renewal.reviewNotes = req.body.reviewNotes ?? "";
  await renewal.save();

  await logAudit(req.user!, "renewal.reject", "LeaseRenewal", renewalId, {
    tenantName: renewal.tenantName, projectId,
  });
  res.json(renewal);
});

export default router;
