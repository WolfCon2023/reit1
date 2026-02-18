import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import multer from "multer";
import { SitePhoto } from "../models/SitePhoto.js";
import { Project, Site } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";
import { logAudit } from "../lib/audit.js";
import { config } from "../config.js";

const router = Router({ mergeParams: true });

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      const dir = path.join(config.documentUploadDir, "photos", "temp");
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(_req, file, cb) {
      cb(null, `${crypto.randomUUID()}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed"));
  },
});

async function resolveProject(projectId: string) {
  return Project.findById(projectId).lean();
}

router.get("/:siteId/photos", requireAuth, requirePermission(PERMISSIONS.SITES_READ), async (req, res) => {
  const { projectId, siteId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const photos = await SitePhoto.find({
    projectId: proj._id,
    siteId,
    isDeleted: { $ne: true },
  }).sort("-createdAt").lean();

  res.json({ items: photos });
});

router.post("/:siteId/photos", requireAuth, requirePermission(PERMISSIONS.SITES_WRITE), upload.single("photo"), async (req, res) => {
  const { projectId, siteId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const site = await Site.findOne({ _id: siteId, projectId: proj._id, isDeleted: { $ne: true } });
  if (!site) { res.status(404).json({ error: "Site not found" }); return; }
  if (!req.file) { res.status(400).json({ error: "Photo file is required" }); return; }

  const destDir = path.join(config.documentUploadDir, "photos", String(proj._id), siteId);
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, req.file.filename);
  fs.renameSync(req.file.path, destPath);

  const { title, isPrimary } = req.body;

  if (isPrimary === "true") {
    await SitePhoto.updateMany({ projectId: proj._id, siteId, isPrimary: true }, { isPrimary: false });
  }

  const photo = await SitePhoto.create({
    projectId: proj._id,
    siteId: site._id,
    title: title || req.file.originalname,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    storagePath: destPath,
    isPrimary: isPrimary === "true",
    uploadedBy: req.user!.userId,
  });

  await logAudit(req.user!, "photo.upload", "SitePhoto", photo._id.toString(), { siteId, projectId });
  res.status(201).json(photo);
});

router.get("/:siteId/photos/:photoId/file", requireAuth, requirePermission(PERMISSIONS.SITES_READ), async (req, res) => {
  const { projectId, siteId, photoId } = req.params;
  const photo = await SitePhoto.findOne({ _id: photoId, projectId, siteId, isDeleted: { $ne: true } });
  if (!photo || !fs.existsSync(photo.storagePath)) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }
  res.setHeader("Content-Type", photo.mimeType);
  res.setHeader("Cache-Control", "public, max-age=86400");
  fs.createReadStream(photo.storagePath).pipe(res);
});

router.delete("/:siteId/photos/:photoId", requireAuth, requirePermission(PERMISSIONS.SITES_WRITE), async (req, res) => {
  const { projectId, siteId, photoId } = req.params;
  const proj = await resolveProject(projectId);
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const photo = await SitePhoto.findOne({ _id: photoId, projectId: proj._id, siteId, isDeleted: { $ne: true } });
  if (!photo) { res.status(404).json({ error: "Photo not found" }); return; }

  photo.isDeleted = true;
  await photo.save();

  await logAudit(req.user!, "photo.delete", "SitePhoto", photoId, { siteId, projectId });
  res.json({ ok: true });
});

export default router;
