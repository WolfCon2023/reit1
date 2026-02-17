import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

interface BackupFile {
  name: string;
  size: number;
  mtime: string | null;
}

interface BackupRunResult {
  ok: boolean;
  filename?: string;
}

interface PruneResult {
  ok: boolean;
  pruned: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function parseBackupTimestamp(name: string): string | null {
  const match = name.match(/reit_mongo_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})Z/);
  if (!match) return null;
  const [, y, m, d, h, min, s] = match;
  return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
}

export function Backups() {
  const queryClient = useQueryClient();

  const [backupState, setBackupState] = useState<"idle" | "running" | "success" | "error">("idle");
  const [backupMessage, setBackupMessage] = useState("");
  const [pruneState, setPruneState] = useState<"idle" | "running" | "success" | "error">("idle");
  const [pruneMessage, setPruneMessage] = useState("");
  const [confirmPrune, setConfirmPrune] = useState(false);

  const {
    data: list,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-backup-list"],
    queryFn: () => api<BackupFile[]>("/api/admin/backup/list"),
    refetchInterval: backupState === "running" ? 3000 : false,
  });

  const handleRunBackup = async () => {
    setBackupState("running");
    setBackupMessage("");
    try {
      const result = await api<BackupRunResult>("/api/admin/backup/run", { method: "POST" });
      setBackupState("success");
      setBackupMessage(result.filename ? `Created ${result.filename}` : "Backup completed.");
      queryClient.invalidateQueries({ queryKey: ["admin-backup-list"] });
    } catch (err) {
      setBackupState("error");
      setBackupMessage(err instanceof Error ? err.message : "Backup failed.");
    }
  };

  const handlePrune = async () => {
    setConfirmPrune(false);
    setPruneState("running");
    setPruneMessage("");
    try {
      const result = await api<PruneResult>("/api/admin/backup/prune", { method: "POST" });
      setPruneState("success");
      setPruneMessage(result.pruned > 0 ? `Removed ${result.pruned} old backup(s).` : "No backups exceeded retention.");
      queryClient.invalidateQueries({ queryKey: ["admin-backup-list"] });
    } catch (err) {
      setPruneState("error");
      setPruneMessage(err instanceof Error ? err.message : "Prune failed.");
    }
  };

  const files = (list ?? []).sort((a, b) => {
    const ta = a.mtime ? new Date(a.mtime).getTime() : 0;
    const tb = b.mtime ? new Date(b.mtime).getTime() : 0;
    return tb - ta;
  });

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <div className="space-y-6">
      {/* On-demand backup card */}
      <Card>
        <CardHeader>
          <CardTitle>On-Demand Backup</CardTitle>
          <CardDescription>
            Trigger a full MongoDB dump immediately. The backup is compressed (.gz) and saved to the server volume.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRunBackup}
              disabled={backupState === "running"}
              className="min-w-[160px]"
            >
              {backupState === "running" ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  Backing up…
                </span>
              ) : (
                "Run backup now"
              )}
            </Button>
            {backupState === "running" && (
              <span className="text-sm text-muted-foreground">This may take a moment depending on database size.</span>
            )}
          </div>

          {backupState === "success" && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
              <strong>Backup complete.</strong> {backupMessage}
            </div>
          )}
          {backupState === "error" && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <strong>Backup failed.</strong> {backupMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prune card */}
      <Card>
        <CardHeader>
          <CardTitle>Retention &amp; Prune</CardTitle>
          <CardDescription>
            Remove backups that exceed the configured retention period (default 30 days). This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!confirmPrune ? (
            <Button
              variant="outline"
              onClick={() => setConfirmPrune(true)}
              disabled={pruneState === "running" || files.length === 0}
            >
              Prune old backups
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Delete backups older than retention?</span>
              <Button variant="destructive" size="sm" onClick={handlePrune}>
                Yes, prune
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmPrune(false)}>
                Cancel
              </Button>
            </div>
          )}

          {pruneState === "success" && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
              {pruneMessage}
            </div>
          )}
          {pruneState === "error" && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <strong>Prune failed.</strong> {pruneMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup files list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Backup Files</CardTitle>
            <CardDescription>
              {files.length} backup{files.length !== 1 ? "s" : ""} on volume
              {totalSize > 0 ? ` — ${formatBytes(totalSize)} total` : ""}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading backup list…</p>
          ) : isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Failed to load backup list. The backup volume may not be mounted.
            </div>
          ) : files.length === 0 ? (
            <div className="rounded-md border border-dashed px-6 py-8 text-center">
              <p className="text-muted-foreground">No backups yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Run backup now" above to create the first one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Filename</th>
                    <th className="text-left p-2 font-medium">Backup Time (UTC)</th>
                    <th className="text-right p-2 font-medium">Size</th>
                    <th className="text-left p-2 font-medium">File Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f, i) => {
                    const backupTs = parseBackupTimestamp(f.name);
                    return (
                      <tr
                        key={f.name}
                        className={`border-b transition-colors hover:bg-muted/50 ${i === 0 ? "bg-accent/30" : ""}`}
                      >
                        <td className="p-2 font-mono text-xs">
                          {f.name}
                          {i === 0 && (
                            <span className="ml-2 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                              Latest
                            </span>
                          )}
                        </td>
                        <td className="p-2">{backupTs ? formatDate(backupTs) : "—"}</td>
                        <td className="p-2 text-right tabular-nums">{formatBytes(f.size)}</td>
                        <td className="p-2 text-muted-foreground">{formatDate(f.mtime)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
