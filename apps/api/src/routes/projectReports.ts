import { Router } from "express";
import { Site, Project } from "../models/index.js";
import { Lease } from "../models/Lease.js";
import { Document } from "../models/Document.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";

const router = Router({ mergeParams: true });

async function resolveProject(projectId: string) {
  return Project.findById(projectId).lean();
}

router.get("/summary", requireAuth, requirePermission(PERMISSIONS.PROJECTS_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const base = { projectId: proj._id, isDeleted: { $ne: true } };

  const [
    totalSites,
    sitesByState,
    sitesByStructureType,
    sitesByProvider,
    heightStats,
    totalLeases,
    activeLeases,
    rentAgg,
    totalDocs,
    docsByCategory,
  ] = await Promise.all([
    Site.countDocuments(base),
    Site.aggregate([
      { $match: base },
      { $group: { _id: "$stateValue", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Site.aggregate([
      { $match: base },
      { $group: { _id: "$structureTypeValue", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Site.aggregate([
      { $match: base },
      { $group: { _id: "$provider", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Site.aggregate([
      { $match: { ...base, structureHeight: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$structureHeight" }, min: { $min: "$structureHeight" }, max: { $max: "$structureHeight" } } },
    ]),
    Lease.countDocuments({ projectId: proj._id, isDeleted: { $ne: true } }),
    Lease.countDocuments({ projectId: proj._id, isDeleted: { $ne: true }, status: "active" }),
    Lease.aggregate([
      { $match: { projectId: proj._id, isDeleted: { $ne: true }, status: "active" } },
      { $group: { _id: null, totalMonthlyRent: { $sum: "$monthlyRent" } } },
    ]),
    Document.countDocuments({ projectId: proj._id, isDeleted: { $ne: true } }),
    Document.aggregate([
      { $match: { projectId: proj._id, isDeleted: { $ne: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const totalMonthlyRent = rentAgg[0]?.totalMonthlyRent ?? 0;
  const height = heightStats[0] ?? { avg: 0, min: 0, max: 0 };

  res.json({
    project: { name: proj.name, companyName: proj.companyName, createdAt: proj.createdAt },
    sites: {
      total: totalSites,
      byState: sitesByState.map((s) => ({ state: s._id, count: s.count })),
      byStructureType: sitesByStructureType.map((s) => ({ type: s._id, count: s.count })),
      byProvider: sitesByProvider.map((s) => ({ provider: s._id, count: s.count })),
      heightStats: {
        avg: Math.round(height.avg * 100) / 100,
        min: height.min,
        max: height.max,
      },
    },
    leases: {
      total: totalLeases,
      active: activeLeases,
      totalMonthlyRent,
      totalAnnualizedRent: totalMonthlyRent * 12,
    },
    documents: {
      total: totalDocs,
      byCategory: docsByCategory.map((d) => ({ category: d._id, count: d.count })),
    },
    generatedAt: new Date().toISOString(),
  });
});

router.get("/leases.csv", requireAuth, requirePermission(PERMISSIONS.LEASES_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const leases = await Lease.find({ projectId: proj._id, isDeleted: { $ne: true } })
    .sort("-leaseEndDate")
    .lean();

  const headers = ["TENANT", "STATUS", "MONTHLY RENT", "ESCALATION %", "START DATE", "END DATE", "NOTES"];
  const rows = leases.map((l) => [
    l.tenantName,
    l.status,
    l.monthlyRent,
    l.escalationPercent ?? "",
    new Date(l.leaseStartDate).toLocaleDateString(),
    new Date(l.leaseEndDate).toLocaleDateString(),
    l.notes ?? "",
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${proj.name.replace(/[^a-zA-Z0-9]/g, "_")}_leases.csv`);
  res.send(csv);
});

export default router;
