import { Router } from "express";
import { Site, Project } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { siteCreateSchema, siteUpdateSchema, PERMISSIONS } from "@reit1/shared";
import { ensureNad83 } from "../services/coordinates.js";
import { logAudit } from "../lib/audit.js";

const router = Router({ mergeParams: true });

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeZipFull(zip: string): string {
  const digits = zip.replace(/\D/g, "");
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  return digits.slice(0, 5);
}

async function resolveProject(projectId: string) {
  return Project.findById(projectId).lean();
}

router.get("/", requireAuth, requirePermission(PERMISSIONS.SITES_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const search = String(req.query.search ?? "").trim();
  const state = String(req.query.state ?? "").trim();
  const provider = String(req.query.provider ?? "").trim();
  const structureType = String(req.query.structureType ?? "").trim();
  const providerResident = String(req.query.providerResident ?? "").trim();
  const sort = String(req.query.sort ?? "-updatedAt");

  const filter: Record<string, unknown> = { projectId: proj._id, isDeleted: { $ne: true } };
  if (state) filter.stateValue = state;
  if (provider) filter.provider = provider;
  if (structureType) filter.structureTypeValue = structureType;
  if (providerResident) filter.providerResidentValue = providerResident;
  if (search) {
    filter.$or = [
      { siteId: new RegExp(escapeRegex(search), "i") },
      { siteName: new RegExp(escapeRegex(search), "i") },
      { address: new RegExp(escapeRegex(search), "i") },
      { city: new RegExp(escapeRegex(search), "i") },
    ];
  }

  const [items, totalCount] = await Promise.all([
    Site.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Site.countDocuments(filter),
  ]);

  res.json({ items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) });
});

router.get("/export.csv", requireAuth, requirePermission(PERMISSIONS.PROJECTS_EXPORT), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const search = String(req.query.search ?? "").trim();
  const state = String(req.query.state ?? "").trim();
  const provider = String(req.query.provider ?? "").trim();
  const structureType = String(req.query.structureType ?? "").trim();

  const filter: Record<string, unknown> = { projectId: proj._id, isDeleted: { $ne: true } };
  if (state) filter.stateValue = state;
  if (provider) filter.provider = provider;
  if (structureType) filter.structureTypeValue = structureType;
  if (search) {
    filter.$or = [
      { siteId: new RegExp(escapeRegex(search), "i") },
      { siteName: new RegExp(escapeRegex(search), "i") },
    ];
  }

  const sites = await Site.find(filter).lean();
  const headers = [
    "SITE ID", "SITE NAME", "AREA NAME", "DISTRICT NAME", "PROVIDER", "PROVIDER RESIDENT",
    "ADDRESS", "CITY", "COUNTY", "STATE", "ZIP CODE", "CMA ID", "CMA NAME", "STRUCTURE TYPE",
    "SITE TYPE", "GE", "STRUCTURE HEIGHT", "LATITUDE", "LONGITUDE", "LATITUDE_NAD83", "LONGITUDE_NAD83", "SITE ALT ID",
  ];
  const rows = sites.map((s) => [
    s.siteId, s.siteName, s.areaName ?? "", s.districtName ?? "", s.provider, s.providerResidentValue,
    s.address, s.city, s.county ?? "", s.stateValue, s.zipCode, s.cmaId ?? "", s.cmaName ?? "", s.structureTypeValue,
    s.siteType ?? "", s.ge ?? "", s.structureHeight, s.latitude, s.longitude, s.latitudeNad83, s.longitudeNad83, s.siteAltId ?? "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${proj.name.replace(/[^a-zA-Z0-9]/g, "_")}_sites.csv`);
  res.send(csv);
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.SITES_WRITE), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const parsed = siteCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const nad83 = ensureNad83(data.latitude, data.longitude);
  const existing = await Site.findOne({ projectId: proj._id, siteId: data.siteId, isDeleted: { $ne: true } });
  if (existing) {
    res.status(409).json({ error: "Site ID already exists in this project" });
    return;
  }
  const site = await Site.create({
    ...data,
    ...nad83,
    projectId: proj._id,
    zipFull: normalizeZipFull(data.zipCode),
    createdBy: req.user!.userId,
    updatedBy: req.user!.userId,
  });
  await logAudit(req.user!, "site.create", "Site", site._id.toString(), { siteId: site.siteId, projectId });
  res.status(201).json(site);
});

router.get("/:id", requireAuth, requirePermission(PERMISSIONS.SITES_READ), async (req, res) => {
  const { projectId, id } = req.params;
  const site = await Site.findOne({ _id: id, projectId, isDeleted: { $ne: true } }).lean();
  if (!site) {
    res.status(404).json({ error: "Site not found" });
    return;
  }
  res.json(site);
});

router.put("/:id", requireAuth, requirePermission(PERMISSIONS.SITES_WRITE), async (req, res) => {
  const { projectId, id } = req.params;
  const parsed = siteUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const site = await Site.findOne({ _id: id, projectId, isDeleted: { $ne: true } });
  if (!site) {
    res.status(404).json({ error: "Site not found" });
    return;
  }
  const data = parsed.data;
  if (data.latitude != null && data.longitude != null) {
    const nad83 = ensureNad83(data.latitude, data.longitude);
    Object.assign(site, data, nad83);
  } else {
    Object.assign(site, data);
  }
  if (data.zipCode) site.zipFull = normalizeZipFull(data.zipCode);
  site.updatedBy = req.user!.userId;
  await site.save();
  await logAudit(req.user!, "site.update", "Site", site._id.toString(), { siteId: site.siteId, projectId });
  res.json(site);
});

router.delete("/:id", requireAuth, requirePermission(PERMISSIONS.SITES_DELETE), async (req, res) => {
  const { projectId, id } = req.params;
  const site = await Site.findOne({ _id: id, projectId, isDeleted: { $ne: true } });
  if (!site) {
    res.status(404).json({ error: "Site not found" });
    return;
  }
  site.isDeleted = true;
  site.updatedBy = req.user!.userId;
  await site.save();
  await logAudit(req.user!, "site.delete", "Site", site._id.toString(), { siteId: site.siteId, projectId });
  res.json({ ok: true });
});

export default router;
