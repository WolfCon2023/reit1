import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import multer from "multer";
import { Document } from "../models/Document.js";
import { Project, Site } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";
import { logAudit } from "../lib/audit.js";
import { config } from "../config.js";

const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      const dir = path.join(config.documentUploadDir, "temp");
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(_req, file, cb) {
      cb(null, `${crypto.randomUUID()}-${file.originalname}`);
    },
  }),
  limits: { fileSize: config.documentMaxMb * 1024 * 1024 },
});

async function resolveProject(projectId: string) {
  return Project.findById(projectId).lean();
}

router.get("/", requireAuth, requirePermission(PERMISSIONS.DOCUMENTS_READ), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  const category = String(req.query.category ?? "").trim();
  const siteId = String(req.query.siteId ?? "").trim();
  const expiringSoon = req.query.expiringSoon === "true";

  const filter: Record<string, unknown> = { projectId: proj._id, isDeleted: { $ne: true } };
  if (category) filter.category = category;
  if (siteId) filter.siteId = siteId;
  if (expiringSoon) {
    const d90 = new Date();
    d90.setDate(d90.getDate() + 90);
    filter.expiresAt = { $lte: d90, $gte: new Date() };
  }

  const [items, totalCount] = await Promise.all([
    Document.find(filter).sort("-uploadedAt").skip((page - 1) * pageSize).limit(pageSize).lean(),
    Document.countDocuments(filter),
  ]);

  res.json({ items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) });
});

router.post("/", requireAuth, requirePermission(PERMISSIONS.DOCUMENTS_WRITE), upload.single("file"), async (req, res) => {
  const { projectId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }
  if (!req.file) { res.status(400).json({ error: "File is required" }); return; }

  const { title, category, expiresAt, siteId } = req.body;
  if (!title || !category) {
    res.status(400).json({ error: "title and category are required" });
    return;
  }

  const destDir = path.join(config.documentUploadDir, String(proj._id));
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, req.file.filename);
  fs.renameSync(req.file.path, destPath);

  const doc = await Document.create({
    projectId: proj._id,
    siteId: siteId || undefined,
    category,
    title,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    storageProvider: "local-volume",
    storagePath: destPath,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    uploadedBy: req.user!.userId,
  });

  await logAudit(req.user!, "document.upload", "Document", doc._id.toString(), { title, category, projectId });
  res.status(201).json(doc);
});

router.post("/:siteId/upload", requireAuth, requirePermission(PERMISSIONS.DOCUMENTS_WRITE), upload.single("file"), async (req, res) => {
  const { projectId, siteId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const site = await Site.findOne({ _id: siteId, projectId: proj._id, isDeleted: { $ne: true } });
  if (!site) { res.status(404).json({ error: "Site not found" }); return; }
  if (!req.file) { res.status(400).json({ error: "File is required" }); return; }

  const { title, category, expiresAt } = req.body;
  if (!title || !category) {
    res.status(400).json({ error: "title and category are required" });
    return;
  }

  const destDir = path.join(config.documentUploadDir, String(proj._id));
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, req.file.filename);
  fs.renameSync(req.file.path, destPath);

  const doc = await Document.create({
    projectId: proj._id,
    siteId: site._id,
    category,
    title,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    storageProvider: "local-volume",
    storagePath: destPath,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    uploadedBy: req.user!.userId,
  });

  await logAudit(req.user!, "document.upload", "Document", doc._id.toString(), { title, category, projectId, siteId });
  res.status(201).json(doc);
});

router.get("/:docId/download", requireAuth, requirePermission(PERMISSIONS.DOCUMENTS_READ), async (req, res) => {
  const { projectId, docId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const doc = await Document.findOne({ _id: docId, projectId: proj._id, isDeleted: { $ne: true } });
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  if (!fs.existsSync(doc.storagePath)) {
    res.status(404).json({ error: "File not found on disk" });
    return;
  }

  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${doc.filename}"`);
  fs.createReadStream(doc.storagePath).pipe(res);
});

router.delete("/:docId", requireAuth, requirePermission(PERMISSIONS.DOCUMENTS_DELETE), async (req, res) => {
  const { projectId, docId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const doc = await Document.findOne({ _id: docId, projectId: proj._id, isDeleted: { $ne: true } });
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  doc.isDeleted = true;
  await doc.save();

  await logAudit(req.user!, "document.delete", "Document", doc._id.toString(), { title: doc.title, projectId });
  res.json({ ok: true });
});

export default router;
