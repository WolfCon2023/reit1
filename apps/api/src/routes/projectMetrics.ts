import { Router } from "express";
import mongoose from "mongoose";
import { Site, ImportBatch } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, requirePermission(PERMISSIONS.PROJECTS_READ), async (req, res) => {
  const { projectId } = req.params;
  const pid = new mongoose.Types.ObjectId(projectId);
  const baseMatch = { projectId: pid, isDeleted: { $ne: true } };

  const [
    sitesByState,
    sitesByStructureType,
    sitesByProvider,
    stats,
    lastImport,
    lastUpdatedSite,
  ] = await Promise.all([
    Site.aggregate([
      { $match: baseMatch },
      { $group: { _id: "$stateValue", count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
    ]),
    Site.aggregate([
      { $match: baseMatch },
      { $group: { _id: "$structureTypeValue", count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
    ]),
    Site.aggregate([
      { $match: baseMatch },
      { $group: { _id: "$provider", count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
    ]),
    Site.aggregate([
      { $match: baseMatch },
      { $group: { _id: null, total: { $sum: 1 }, avgHeight: { $avg: "$structureHeight" } } },
    ]),
    ImportBatch.findOne({ projectId }).sort("-uploadedAt").select("uploadedAt").lean(),
    Site.findOne({ projectId: pid, isDeleted: { $ne: true } }).sort("-updatedAt").select("updatedAt").lean(),
  ]);

  const totalSites = stats[0]?.total ?? 0;
  const avgStructureHeight = stats[0]?.avgHeight ?? 0;

  res.json({
    totalSites,
    avgStructureHeight: Math.round(avgStructureHeight * 100) / 100,
    lastImportAt: lastImport?.uploadedAt ?? null,
    lastUpdatedAt: lastUpdatedSite?.updatedAt ?? null,
    sitesByState: sitesByState.map((s) => ({ state: s._id, count: s.count })),
    sitesByStructureType: sitesByStructureType.map((s) => ({ type: s._id, count: s.count })),
    sitesByProvider: sitesByProvider.map((s) => ({ provider: s._id, count: s.count })),
  });
});

export default router;
