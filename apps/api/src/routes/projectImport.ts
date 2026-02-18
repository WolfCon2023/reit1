import { Router } from "express";
import multer from "multer";
import path from "path";
import { ImportBatch, Site, Project } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS, IMPORT_TEMPLATE_HEADERS } from "@reit1/shared";
import { ensureNad83 } from "../services/coordinates.js";
import { logAudit } from "../lib/audit.js";
import { config } from "../config.js";
import { parseXlsxAndValidate } from "../services/importParse.js";

const router = Router({ mergeParams: true });
const uploadMaxBytes = config.uploadMaxMb * 1024 * 1024;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: uploadMaxBytes },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".xlsx") {
      cb(new Error("Only .xlsx files are allowed"));
      return;
    }
    cb(null, true);
  },
});

router.post("/xlsx", requireAuth, requirePermission(PERMISSIONS.IMPORT_RUN), upload.single("file"), async (req, res) => {
  const { projectId } = req.params;
  const proj = await Project.findById(projectId).lean();
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const result = await parseXlsxAndValidate(req.file.buffer);
  if (result.headerMismatch) {
    res.status(400).json({ error: "Header mismatch", expected: IMPORT_TEMPLATE_HEADERS, received: result.receivedHeaders });
    return;
  }
  const importName = String(req.body.importName ?? "").trim() || undefined;
  const validRowsStored = result.validRows.slice(0, 10000);
  const batch = await ImportBatch.create({
    projectId: proj._id,
    importName,
    uploadedBy: req.user!.userId,
    filename: req.file.originalname,
    totalRows: result.rows.length,
    importedRows: 0,
    errorRows: result.errors.length,
    errorDetails: result.errors.slice(0, 500).map((e) => ({ row: e.row, messages: e.errors })),
    validRows: validRowsStored,
    status: "pending",
  });
  res.status(201).json({
    batchId: batch._id.toString(),
    totalRows: batch.totalRows,
    validRows: result.validRows.length,
    errorRows: result.errors.length,
    errors: result.errors.slice(0, 100),
    preview: result.validRows.slice(0, 20),
  });
});

router.post("/commit", requireAuth, requirePermission(PERMISSIONS.IMPORT_RUN), async (req, res) => {
  const { projectId } = req.params;
  const proj = await Project.findById(projectId).lean();
  if (!proj) { res.status(404).json({ error: "Project not found" }); return; }

  const { batchId } = req.body;
  if (!batchId) {
    res.status(400).json({ error: "batchId required" });
    return;
  }
  const batch = await ImportBatch.findOne({ _id: batchId, projectId: proj._id });
  if (!batch) {
    res.status(404).json({ error: "Import batch not found" });
    return;
  }
  if (batch.status !== "pending") {
    res.status(400).json({ error: "Batch already committed" });
    return;
  }
  const validRows = (batch.validRows || []) as Array<Record<string, unknown>>;
  let imported = 0;
  for (const row of validRows) {
    const siteId = String(row["SITE ID"] ?? "").trim();
    const existing = await Site.findOne({ projectId: proj._id, siteId, isDeleted: { $ne: true } });
    if (existing) continue;
    const lat = Number(row["LATITUDE"]);
    const lon = Number(row["LONGITUDE"]);
    const nad83 = ensureNad83(lat, lon);
    await Site.create({
      projectId: proj._id,
      siteId,
      siteName: String(row["SITE NAME"] ?? "").trim(),
      areaName: trim(row["AREA NAME"]),
      districtName: trim(row["DISTRICT NAME"]),
      provider: String(row["PROVIDER"] ?? "").trim(),
      providerResidentMode: "preset",
      providerResidentValue: String(row["PROVIDER RESIDENT"] ?? "").trim() || "No",
      address: String(row["ADDRESS"] ?? "").trim(),
      city: String(row["CITY"] ?? "").trim(),
      county: trim(row["COUNTY"]),
      stateMode: "preset",
      stateValue: String(row["STATE"] ?? "").trim(),
      zipCode: String(row["ZIP CODE"] ?? "").trim(),
      zipFull: normalizeZip(String(row["ZIP CODE"])),
      cmaId: trim(row["CMA ID"]),
      cmaName: trim(row["CMA NAME"]),
      structureTypeMode: "preset",
      structureTypeValue: String(row["STRUCTURE TYPE"] ?? "").trim() || "unclassified",
      siteType: trim(row["SITE TYPE"]),
      ge: trim(row["GE"]),
      structureHeight: Math.max(0, Number(row["STRUCTURE HEIGHT"]) || 0),
      latitude: lat,
      longitude: lon,
      latitudeNad83: nad83.latitudeNad83,
      longitudeNad83: nad83.longitudeNad83,
      siteAltId: trim(row["SITE ALT ID"]),
      createdBy: req.user!.userId,
      updatedBy: req.user!.userId,
    });
    imported++;
  }
  batch.importedRows = imported;
  batch.errorRows = batch.totalRows - imported;
  batch.status = batch.errorRows > 0 ? "partial" : "committed";
  await batch.save();
  await logAudit(req.user!, "import.commit", "ImportBatch", batch._id.toString(), {
    filename: batch.filename,
    projectId,
    totalRows: batch.totalRows,
    importedRows: imported,
  });
  res.json({ batchId: batch._id, importedRows: imported, errorRows: batch.errorRows, status: batch.status });
});

function trim(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}
function normalizeZip(v: unknown): string {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  return digits.slice(0, 5);
}

export default router;
