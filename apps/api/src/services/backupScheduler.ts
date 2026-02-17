import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

const execAsync = promisify(exec);

export function startBackupScheduler(): void {
  if (!config.enableBackupScheduler) return;

  const runBackup = async () => {
    const backupDir = config.backupDir;
    await fs.mkdir(backupDir, { recursive: true });
    await fs.mkdir(path.join(backupDir, "logs"), { recursive: true });
    const d = new Date();
    const Y = d.getUTCFullYear();
    const M = String(d.getUTCMonth() + 1).padStart(2, "0");
    const D = String(d.getUTCDate()).padStart(2, "0");
    const H = String(d.getUTCHours()).padStart(2, "0");
    const Min = String(d.getUTCMinutes()).padStart(2, "0");
    const S = String(d.getUTCSeconds()).padStart(2, "0");
    const filename = `reit_mongo_${Y}-${M}-${D}_${H}${Min}${S}Z.gz`;
    const filepath = path.join(backupDir, filename);
    try {
      await execAsync(`mongodump --uri="${config.mongoUri}" --archive="${filepath}" --gzip`, {
        maxBuffer: 50 * 1024 * 1024,
      });
      await fs.appendFile(
        path.join(backupDir, "logs", "backup.log"),
        `${new Date().toISOString()} Scheduled backup: ${filename}\n`
      );
    } catch (err) {
      console.error("Scheduled backup failed:", err);
    }
  };

  const runPrune = async () => {
    const backupDir = config.backupDir;
    const retentionDays = config.backupRetentionDays;
    try {
      const files = await fs.readdir(backupDir);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      for (const f of files) {
        if (!f.endsWith(".gz")) continue;
        const filepath = path.join(backupDir, f);
        const stat = await fs.stat(filepath);
        if (stat.mtime < cutoff) await fs.unlink(filepath);
      }
    } catch {
      // ignore
    }
  };

  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(config.backupScheduleHourUtc, config.backupScheduleMinuteUtc, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const ms = next.getTime() - now.getTime();
    setTimeout(async () => {
      await runBackup();
      await runPrune();
      scheduleNext();
    }, ms);
  };

  scheduleNext();
  console.log("Backup scheduler enabled (daily at UTC %s:%s)", config.backupScheduleHourUtc, config.backupScheduleMinuteUtc);
}
