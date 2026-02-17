import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface BackupFile {
  name: string;
  size: number;
  mtime: string | null;
}

export function Backups() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [pruning, setPruning] = useState(false);

  const { data: list } = useQuery({
    queryKey: ["admin-backup-list"],
    queryFn: () => api<BackupFile[]>("/api/admin/backup/list"),
  });

  const runBackup = async () => {
    setRunning(true);
    try {
      await api("/api/admin/backup/run", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["admin-backup-list"] });
    } finally {
      setRunning(false);
    }
  };
  const runPrune = async () => {
    setPruning(true);
    try {
      await api("/api/admin/backup/prune", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["admin-backup-list"] });
    } finally {
      setPruning(false);
    }
  };

  const files = list ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backups</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">MongoDB backups are stored in /data/backups. Run backup manually or use the scheduled job. Prune removes files older than retention (e.g. 30 days).</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runBackup} disabled={running}>{running ? "Running…" : "Run backup now"}</Button>
          <Button variant="outline" onClick={runPrune} disabled={pruning}>{pruning ? "Pruning…" : "Prune old backups"}</Button>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Backup files</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {files.length === 0 && <li>No backups yet</li>}
            {files.map((f) => (
              <li key={f.name}>
                {f.name} — {f.size ? `${(f.size / 1024 / 1024).toFixed(2)} MB` : "—"} {f.mtime ? `(${new Date(f.mtime).toLocaleString()})` : ""}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
