import { Router } from "express";
import { Site, Project } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";

const router = Router({ mergeParams: true });

async function resolveProject(projectId: string) {
  return Project.findById(projectId).lean();
}

router.get("/duplicates", requireAuth, requirePermission(PERMISSIONS.INSIGHTS_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const groups = await Site.aggregate([
    { $match: { projectId: proj._id, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: {
          address: { $toLower: { $trim: { input: "$address" } } },
          city: { $toLower: { $trim: { input: "$city" } } },
          state: { $toLower: { $trim: { input: "$stateValue" } } },
        },
        count: { $sum: 1 },
        sites: {
          $push: {
            _id: "$_id",
            siteId: "$siteId",
            siteName: "$siteName",
            address: "$address",
            city: "$city",
            stateValue: "$stateValue",
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);

  res.json({
    groups: groups.map((g) => ({
      key: `${g._id.address}, ${g._id.city}, ${g._id.state}`,
      count: g.count,
      sites: g.sites,
    })),
    totalGroups: groups.length,
  });
});

router.get("/missing-fields", requireAuth, requirePermission(PERMISSIONS.INSIGHTS_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const base = { projectId: proj._id, isDeleted: { $ne: true } };
  const fields = [
    { field: "county", query: { ...base, $or: [{ county: { $exists: false } }, { county: "" }, { county: null }] } },
    { field: "cmaId", query: { ...base, $or: [{ cmaId: { $exists: false } }, { cmaId: "" }, { cmaId: null }] } },
    { field: "cmaName", query: { ...base, $or: [{ cmaName: { $exists: false } }, { cmaName: "" }, { cmaName: null }] } },
    { field: "siteType", query: { ...base, $or: [{ siteType: { $exists: false } }, { siteType: "" }, { siteType: null }] } },
    { field: "ge", query: { ...base, $or: [{ ge: { $exists: false } }, { ge: "" }, { ge: null }] } },
    { field: "siteAltId", query: { ...base, $or: [{ siteAltId: { $exists: false } }, { siteAltId: "" }, { siteAltId: null }] } },
    { field: "structureHeight", query: { ...base, structureHeight: 0 } },
  ];

  const results = await Promise.all(
    fields.map(async ({ field, query }) => {
      const [count, samples] = await Promise.all([
        Site.countDocuments(query),
        Site.find(query).select("siteId siteName").limit(5).lean(),
      ]);
      return { field, count, samples };
    })
  );

  res.json({ fields: results.filter((r) => r.count > 0) });
});

router.get("/outliers", requireAuth, requirePermission(PERMISSIONS.INSIGHTS_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const base = { projectId: proj._id, isDeleted: { $ne: true } };

  const heightStats = await Site.aggregate([
    { $match: { ...base, structureHeight: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        avg: { $avg: "$structureHeight" },
        stdDev: { $stdDevPop: "$structureHeight" },
      },
    },
  ]);

  const avg = heightStats[0]?.avg ?? 0;
  const stdDev = heightStats[0]?.stdDev ?? 0;
  const threshold = avg + 2 * stdDev;

  const [heightOutliers, zeroHeight, coordOutliers] = await Promise.all([
    threshold > 0
      ? Site.find({ ...base, structureHeight: { $gt: threshold } })
          .select("siteId siteName structureHeight")
          .limit(50)
          .lean()
      : Promise.resolve([]),
    Site.find({ ...base, structureHeight: 0 })
      .select("siteId siteName structureHeight")
      .limit(50)
      .lean(),
    Site.find({
      ...base,
      $or: [
        { latitude: { $lt: 24 } },
        { latitude: { $gt: 50 } },
        { longitude: { $lt: -125 } },
        { longitude: { $gt: -66 } },
      ],
    })
      .select("siteId siteName latitude longitude")
      .limit(50)
      .lean(),
  ]);

  res.json({
    heightStats: { avg: Math.round(avg * 100) / 100, stdDev: Math.round(stdDev * 100) / 100, threshold: Math.round(threshold * 100) / 100 },
    heightOutliers,
    zeroHeight,
    coordOutliers,
  });
});

export default router;
