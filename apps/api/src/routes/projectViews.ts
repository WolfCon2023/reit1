import { Router } from "express";
import { SavedView } from "../models/SavedView.js";
import { Project } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";
import { logAudit } from "../lib/audit.js";

const router = Router({ mergeParams: true });

async function resolveProject(projectId: string) {
  return Project.findById(projectId).lean();
}

router.get("/", requireAuth, requirePermission(PERMISSIONS.VIEWS_MANAGE), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const views = await SavedView.find({ projectId: proj._id }).sort("-updatedAt").lean();
  res.json({ items: views });
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.VIEWS_MANAGE), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const { name, query, columns, isDefault } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  if (isDefault) {
    await SavedView.updateMany({ projectId: proj._id, isDefault: true }, { isDefault: false });
  }

  const view = await SavedView.create({
    projectId: proj._id,
    name,
    resourceType: "sites",
    query: query ?? {},
    columns: columns ?? [],
    isDefault: isDefault ?? false,
    createdBy: req.user!.userId,
  });

  await logAudit(req.user!, "view.create", "SavedView", view._id.toString(), { name, projectId });
  res.status(201).json(view);
});

router.put("/:viewId", requireAuth, requirePermission(PERMISSIONS.VIEWS_MANAGE), async (req, res) => {
  const { projectId, viewId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const view = await SavedView.findOne({ _id: viewId, projectId: proj._id });
  if (!view) { res.status(404).json({ error: "View not found" }); return; }

  const { name, query, columns, isDefault } = req.body;
  if (isDefault) {
    await SavedView.updateMany({ projectId: proj._id, _id: { $ne: view._id }, isDefault: true }, { isDefault: false });
  }

  if (name !== undefined) view.name = name;
  if (query !== undefined) view.query = query;
  if (columns !== undefined) view.columns = columns;
  if (isDefault !== undefined) view.isDefault = isDefault;
  await view.save();

  await logAudit(req.user!, "view.update", "SavedView", view._id.toString(), { name: view.name, projectId });
  res.json(view);
});

router.delete("/:viewId", requireAuth, requirePermission(PERMISSIONS.VIEWS_MANAGE), async (req, res) => {
  const { projectId, viewId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const view = await SavedView.findOneAndDelete({ _id: viewId, projectId: proj._id });
  if (!view) { res.status(404).json({ error: "View not found" }); return; }

  await logAudit(req.user!, "view.delete", "SavedView", viewId, { name: view.name, projectId });
  res.json({ ok: true });
});

export default router;
