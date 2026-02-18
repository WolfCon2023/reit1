import { Router } from "express";
import { Lease } from "../models/Lease.js";
import { Project } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";

const router = Router({ mergeParams: true });

async function resolveProject(projectId: string) {
  return Project.findById(projectId).lean();
}

router.get("/summary", requireAuth, requirePermission(PERMISSIONS.REVENUE_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const now = new Date();
  const d30 = new Date(); d30.setDate(d30.getDate() + 30);
  const d60 = new Date(); d60.setDate(d60.getDate() + 60);
  const d90 = new Date(); d90.setDate(d90.getDate() + 90);

  const baseFilter = { projectId: proj._id, isDeleted: { $ne: true } };

  const [rentAgg, expiring30, expiring60, expiring90, revenueByTenant] = await Promise.all([
    Lease.aggregate([
      { $match: { ...baseFilter, status: "active" } },
      { $group: { _id: null, totalMonthlyRent: { $sum: "$monthlyRent" } } },
    ]),
    Lease.countDocuments({ ...baseFilter, status: "active", leaseEndDate: { $gte: now, $lte: d30 } }),
    Lease.countDocuments({ ...baseFilter, status: "active", leaseEndDate: { $gte: now, $lte: d60 } }),
    Lease.countDocuments({ ...baseFilter, status: "active", leaseEndDate: { $gte: now, $lte: d90 } }),
    Lease.aggregate([
      { $match: { ...baseFilter, status: "active" } },
      { $group: { _id: "$tenantName", monthlyRent: { $sum: "$monthlyRent" } } },
      { $sort: { monthlyRent: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const totalMonthlyRent = rentAgg[0]?.totalMonthlyRent ?? 0;

  res.json({
    totalMonthlyRent,
    totalAnnualizedRent: totalMonthlyRent * 12,
    leasesExpiringIn30: expiring30,
    leasesExpiringIn60: expiring60,
    leasesExpiringIn90: expiring90,
    revenueByTenant: revenueByTenant.map((r) => ({ tenant: r._id, monthlyRent: r.monthlyRent })),
  });
});

export default router;
