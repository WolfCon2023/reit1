import { Router } from "express";
import { Project, Site, ImportBatch } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { projectCreateSchema, projectUpdateSchema, PERMISSIONS } from "@reit1/shared";
import { logAudit } from "../lib/audit.js";

const router = Router();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", requireAuth, requirePermission(PERMISSIONS.PROJECTS_READ), async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const search = String(req.query.search ?? "").trim();
  const includeArchived = req.query.includeArchived === "true";

  const filter: Record<string, unknown> = {};
  if (!includeArchived) filter.isArchived = { $ne: true };
  if (search) {
    filter.$or = [
      { name: new RegExp(escapeRegex(search), "i") },
      { companyName: new RegExp(escapeRegex(search), "i") },
    ];
  }

  const [items, totalCount] = await Promise.all([
    Project.find(filter).sort("-updatedAt").skip((page - 1) * pageSize).limit(pageSize).lean(),
    Project.countDocuments(filter),
  ]);

  res.json({ items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) });
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.PROJECTS_MANAGE), async (req, res) => {
  const parsed = projectCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const existing = await Project.findOne({ name: parsed.data.name });
  if (existing) {
    res.status(409).json({ error: "A project with this name already exists" });
    return;
  }
  const project = await Project.create({
    ...parsed.data,
    createdBy: req.user!.userId,
    updatedBy: req.user!.userId,
  });
  await logAudit(req.user!, "project.create", "Project", project._id.toString(), { name: project.name });
  res.status(201).json(project);
});

router.get("/:id", requireAuth, requirePermission(PERMISSIONS.PROJECTS_READ), async (req, res) => {
  const project = await Project.findById(req.params.id).lean();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [siteCount, lastImport, lastUpdatedSite] = await Promise.all([
    Site.countDocuments({ projectId: project._id, isDeleted: { $ne: true } }),
    ImportBatch.findOne({ projectId: project._id }).sort("-uploadedAt").select("uploadedAt filename importName importedRows status").lean(),
    Site.findOne({ projectId: project._id, isDeleted: { $ne: true } }).sort("-updatedAt").select("updatedAt").lean(),
  ]);

  res.json({
    ...project,
    siteCount,
    lastImport: lastImport ?? null,
    lastUpdatedSite: lastUpdatedSite?.updatedAt ?? null,
  });
});

router.put("/:id", requireAuth, requirePermission(PERMISSIONS.PROJECTS_MANAGE), async (req, res) => {
  const parsed = projectUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (parsed.data.name && parsed.data.name !== project.name) {
    const dup = await Project.findOne({ name: parsed.data.name, _id: { $ne: project._id } });
    if (dup) {
      res.status(409).json({ error: "A project with this name already exists" });
      return;
    }
  }
  Object.assign(project, parsed.data);
  project.updatedBy = req.user!.userId;
  await project.save();
  await logAudit(req.user!, "project.update", "Project", project._id.toString(), { name: project.name });
  res.json(project);
});

router.post("/:id/archive", requireAuth, requirePermission(PERMISSIONS.PROJECTS_MANAGE), async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  project.isArchived = true;
  project.updatedBy = req.user!.userId;
  await project.save();
  await logAudit(req.user!, "project.archive", "Project", project._id.toString(), { name: project.name });
  res.json(project);
});

router.post("/:id/unarchive", requireAuth, requirePermission(PERMISSIONS.PROJECTS_MANAGE), async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  project.isArchived = false;
  project.updatedBy = req.user!.userId;
  await project.save();
  await logAudit(req.user!, "project.unarchive", "Project", project._id.toString(), { name: project.name });
  res.json(project);
});

export default router;
