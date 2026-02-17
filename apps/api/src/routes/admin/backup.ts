import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";
import { config } from "../../config.js";
import { logAudit } from "../../lib/audit.js";

const execAsync = promisify(exec);
const router = Router();

router.post("/run", requireAuth, requirePermission(PERMISSIONS.BACKUPS_MANAGE), async (req, res) => {
  const backupDir = config.backupDir;
  await fs.mkdir(backupDir, { recursive: true });
  const logsDir = path.join(backupDir, "logs");
  await fs.mkdir(logsDir, { recursive: true });
  const d = new Date();
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, "0");
  const D = String(d.getUTCDate()).padStart(2, "0");
  const H = String(d.getUTCHours()).padStart(2, "0");
  const Min = String(d.getUTCMinutes()).padStart(2, "0");
  const S = String(d.getUTCSeconds()).padStart(2, "0");
  const filename = `reit_mongo_${Y}-${M}-${D}_${H}${Min}${S}Z.gz`;
  const filepath = path.join(backupDir, filename);
  const mongoUri = config.mongoUri;
  try {
    await execAsync(`mongodump --uri="${mongoUri}" --archive="${filepath}" --gzip`, {
      maxBuffer: 10 * 1024 * 1024,
    });
    const logLine = `${new Date().toISOString()} Backup completed: ${filename}\n`;
    await fs.appendFile(path.join(logsDir, "backup.log"), logLine);
    await logAudit(req.user!, "backup.run", "Backup", filename, { filename });
    res.json({ ok: true, filename });
  } catch (err) {
    const logLine = `${new Date().toISOString()} Backup failed: ${(err as Error).message}\n`;
    await fs.appendFile(path.join(logsDir, "backup.log"), logLine).catch(() => {});
    res.status(500).json({ error: "Backup failed", message: (err as Error).message });
  }
});

router.get("/list", requireAuth, requirePermission(PERMISSIONS.BACKUPS_MANAGE), async (_req, res) => {
  const backupDir = config.backupDir;
  try {
    const files = await fs.readdir(backupDir);
    const backups = files
      .filter((f) => f.endsWith(".gz"))
      .map((f) => ({
        name: f,
        path: path.join(backupDir, f),
      }));
    const withStats = await Promise.all(
      backups.map(async (b) => {
        try {
          const stat = await fs.stat(b.path);
          return { name: b.name, size: stat.size, mtime: stat.mtime };
        } catch {
          return { name: b.name, size: 0, mtime: null };
        }
      })
    );
    res.json(withStats);
  } catch {
    res.json([]);
  }
});

router.post("/prune", requireAuth, requirePermission(PERMISSIONS.BACKUPS_MANAGE), async (req, res) => {
  const retentionDays = config.backupRetentionDays;
  const backupDir = config.backupDir;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  try {
    const files = await fs.readdir(backupDir);
    let pruned = 0;
    for (const f of files) {
      if (!f.endsWith(".gz")) continue;
      const filepath = path.join(backupDir, f);
      const stat = await fs.stat(filepath);
      if (stat.mtime < cutoff) {
        await fs.unlink(filepath);
        pruned++;
      }
    }
    await logAudit(req.user!, "backup.prune", "Backup", "", { pruned, retentionDays });
    res.json({ ok: true, pruned });
  } catch (err) {
    res.status(500).json({ error: "Prune failed", message: (err as Error).message });
  }
});

export default router;
