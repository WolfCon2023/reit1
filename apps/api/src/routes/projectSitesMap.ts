import { Router } from "express";
import { Site, Project } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";

const router = Router({ mergeParams: true });

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveProject(projectId: string) {
  return Project.findById(projectId).lean();
}

router.get("/", requireAuth, requirePermission(PERMISSIONS.SITES_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const filter: Record<string, unknown> = {
    projectId: proj._id,
    isDeleted: { $ne: true },
    "siteLocation.coordinates": { $exists: true },
  };

  const { bbox, search, state, provider, structureType } = req.query;
  if (bbox) {
    const parts = String(bbox).split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      const [swLat, swLng, neLat, neLng] = parts;
      filter.siteLocation = {
        $geoWithin: {
          $box: [[swLng, swLat], [neLng, neLat]],
        },
      };
    }
  }
  if (state) filter.stateValue = String(state);
  if (provider) filter.provider = String(provider);
  if (structureType) filter.structureTypeValue = String(structureType);
  if (search) {
    const s = String(search).trim();
    filter.$or = [
      { siteId: new RegExp(escapeRegex(s), "i") },
      { siteName: new RegExp(escapeRegex(s), "i") },
      { address: new RegExp(escapeRegex(s), "i") },
    ];
  }

  const sites = await Site.find(filter)
    .select("siteId siteName address city stateValue provider structureTypeValue structureHeight latitude longitude siteLocation")
    .limit(5000)
    .lean();

  res.json({ items: sites, count: sites.length });
});

router.get("/radius", requireAuth, requirePermission(PERMISSIONS.SITES_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusMiles = Number(req.query.radius) || 10;

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "lat and lng are required" });
    return;
  }

  const radiusMeters = radiusMiles * 1609.34;

  const sites = await Site.find({
    projectId: proj._id,
    isDeleted: { $ne: true },
    siteLocation: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusMeters,
      },
    },
  })
    .select("siteId siteName address city stateValue provider structureTypeValue structureHeight latitude longitude")
    .limit(500)
    .lean();

  res.json({ items: sites, count: sites.length, center: { lat, lng }, radiusMiles });
});

router.get("/geojson", requireAuth, requirePermission(PERMISSIONS.SITES_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const filter: Record<string, unknown> = {
    projectId: proj._id,
    isDeleted: { $ne: true },
    "siteLocation.coordinates": { $exists: true },
  };

  const sites = await Site.find(filter)
    .select("siteId siteName address city stateValue latitude longitude siteLocation")
    .limit(5000)
    .lean();

  const features = sites.map((s) => ({
    type: "Feature" as const,
    geometry: s.siteLocation ?? { type: "Point", coordinates: [s.longitude, s.latitude] },
    properties: {
      _id: s._id,
      siteId: s.siteId,
      siteName: s.siteName,
      address: s.address,
      city: s.city,
      state: s.stateValue,
    },
  }));

  res.json({ type: "FeatureCollection", features });
});

export default router;
