import { Router } from "express";
import { Site, Project } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.PROJECTS_READ), async (_req, res) => {
  const activeProjects = await Project.find({ isArchived: { $ne: true } }).select("_id").lean();
  const projectIds = activeProjects.map((p) => p._id);

  const [
    sitesByState,
    sitesByStructureType,
    sitesByProvider,
    stats,
  ] = await Promise.all([
    Site.aggregate([
      { $match: { projectId: { $in: projectIds }, isDeleted: { $ne: true } } },
      { $group: { _id: "$stateValue", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Site.aggregate([
      { $match: { projectId: { $in: projectIds }, isDeleted: { $ne: true } } },
      { $group: { _id: "$structureTypeValue", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Site.aggregate([
      { $match: { projectId: { $in: projectIds }, isDeleted: { $ne: true } } },
      { $group: { _id: "$provider", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Site.aggregate([
      { $match: { projectId: { $in: projectIds }, isDeleted: { $ne: true } } },
      { $group: { _id: null, total: { $sum: 1 }, avgHeight: { $avg: "$structureHeight" } } },
    ]),
  ]);

  res.json({
    totalProjects: activeProjects.length,
    totalSites: stats[0]?.total ?? 0,
    avgStructureHeight: Math.round((stats[0]?.avgHeight ?? 0) * 100) / 100,
    sitesByState: sitesByState.map((s) => ({ state: s._id, count: s.count })),
    sitesByStructureType: sitesByStructureType.map((s) => ({ type: s._id, count: s.count })),
    sitesByProvider: sitesByProvider.map((s) => ({ provider: s._id, count: s.count })),
  });
});

export default router;
