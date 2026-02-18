import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiBlob } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface Project {
  _id: string;
  name: string;
}

interface ProjectsRes {
  items: Project[];
  totalCount: number;
}

interface UploadResult {
  batchId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: { row: number; errors: string[] }[];
  preview: Record<string, unknown>[];
}

export function ImportPage() {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const [selectedProjectId, setSelectedProjectId] = useState(routeProjectId ?? "");
  const [importName, setImportName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [commitResult, setCommitResult] = useState<{ importedRows: number; errorRows: number } | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTemplate = useAuthStore((s) => s.hasPermission(PERMISSIONS.IMPORT_TEMPLATE_DOWNLOAD));
  const hasRun = useAuthStore((s) => s.hasPermission(PERMISSIONS.IMPORT_RUN));
  const hasManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.PROJECTS_MANAGE));

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const activeProjectId = routeProjectId || selectedProjectId;

  const { data: projectsData } = useQuery({
    queryKey: ["projects", "all-for-select"],
    queryFn: () => api<ProjectsRes>("/api/projects?pageSize=100"),
    enabled: !routeProjectId,
  });

  const { data: projectData } = useQuery({
    queryKey: ["projects", activeProjectId, "meta"],
    queryFn: () => api<{ name: string }>(`/api/projects/${activeProjectId}`),
    enabled: !!activeProjectId,
  });

  const handleDownloadTemplate = async () => {
    try {
      const blob = await apiBlob("/api/import/template");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "REIT_Site_Import_Template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError("");
    setUploadResult(null);
    setCommitted(false);
    setCommitResult(null);
    if (!f) { setFile(null); return; }
    if (f.size > MAX_FILE_SIZE) { setError("File must be 10MB or smaller"); setFile(null); return; }
    if (!f.name.endsWith(".xlsx")) { setError("Only .xlsx files are allowed"); setFile(null); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !hasRun || !activeProjectId) return;
    setError("");
    setUploadResult(null);
    setCommitted(false);
    setCommitResult(null);
    const formData = new FormData();
    formData.append("file", file);
    if (importName.trim()) formData.append("importName", importName.trim());
    const token = localStorage.getItem("accessToken");
    const apiUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";
    const res = await fetch(`${apiUrl}/api/projects/${activeProjectId}/import/xlsx`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || res.statusText);
      return;
    }
    setUploadResult(await res.json());
  };

  const handleCommit = async () => {
    if (!uploadResult?.batchId || !activeProjectId) return;
    setCommitting(true);
    setError("");
    try {
      const result = await api<{ importedRows: number; errorRows: number; status: string }>(
        `/api/projects/${activeProjectId}/import/commit`,
        { method: "POST", body: { batchId: uploadResult.batchId } }
      );
      setUploadResult(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setCommitted(true);
      setCommitResult({ importedRows: result.importedRows, errorRows: result.errorRows });
      queryClient.invalidateQueries({ queryKey: ["projects", activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", activeProjectId, "sites"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Commit failed");
    } finally {
      setCommitting(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      const proj = await api<{ _id: string }>("/api/projects", { method: "POST", body: { name: newProjectName.trim() } });
      setSelectedProjectId(proj._id);
      setShowCreateProject(false);
      setNewProjectName("");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <div className="space-y-6">
      {routeProjectId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/projects" className="hover:text-primary">Projects</Link>
          <span>/</span>
          <Link to={`/projects/${routeProjectId}`} className="hover:text-primary">{projectData?.name ?? "…"}</Link>
          <span>/</span>
          <span>Import</span>
        </div>
      )}

      <h1 className="text-3xl font-bold tracking-tight">Import Sites</h1>

      {!routeProjectId && (
        <Card>
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
            <CardDescription>Choose which project to import sites into</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Project *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={selectedProjectId}
                  onChange={(e) => { setSelectedProjectId(e.target.value); setUploadResult(null); setCommitted(false); }}
                >
                  <option value="">Select a project…</option>
                  {projectsData?.items.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {hasManage && (
                <Button variant="outline" onClick={() => setShowCreateProject(true)}>New Project</Button>
              )}
            </div>
            {showCreateProject && (
              <div className="flex gap-2 items-end border-t pt-4">
                <div className="flex-1">
                  <Label>New Project Name</Label>
                  <Input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="mt-1" autoFocus />
                </div>
                <Button onClick={handleCreateProject} disabled={creatingProject}>{creatingProject ? "Creating…" : "Create"}</Button>
                <Button variant="outline" onClick={() => setShowCreateProject(false)}>Cancel</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hasRun && activeProjectId && (
        <Card>
          <CardHeader>
            <CardTitle>Import Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Import Name (optional)</Label>
              <Input placeholder="e.g. Q1 2026 Site Data" value={importName} onChange={(e) => setImportName(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {hasTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
            <CardDescription>Download the required Excel template with validation lists</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDownloadTemplate}>Download Required Template</Button>
          </CardContent>
        </Card>
      )}

      {hasRun && activeProjectId && (
        <Card>
          <CardHeader>
            <CardTitle>Upload</CardTitle>
            <CardDescription>Upload a .xlsx file (max 10MB). Headers must match the template exactly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">{error}</div>
            )}

            {committed && commitResult && (
              <div className="rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm p-4 space-y-3">
                <p className="font-medium">
                  Import complete: {commitResult.importedRows} rows imported. {commitResult.errorRows > 0 ? `${commitResult.errorRows} errors.` : ""}
                </p>
                <Button asChild>
                  <Link to={`/projects/${activeProjectId}/sites`}>Go to Project Sites</Link>
                </Button>
              </div>
            )}

            {!committed && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground"
                />
                {file && (
                  <div className="flex gap-2">
                    <Button onClick={handleUpload}>Parse & Preview</Button>
                  </div>
                )}
                {uploadResult && (
                  <div className="space-y-4 border-t pt-4">
                    <p className="text-sm">
                      Total: {uploadResult.totalRows} · Valid: {uploadResult.validRows} · Errors: {uploadResult.errorRows}
                    </p>
                    {uploadResult.errors?.length > 0 && (
                      <div className="max-h-40 overflow-auto rounded border p-2 text-xs">
                        {uploadResult.errors.slice(0, 50).map((e, i) => (
                          <div key={i}>Row {e.row}: {e.errors.join(", ")}</div>
                        ))}
                        {uploadResult.errors.length > 50 && <div>… and more</div>}
                      </div>
                    )}
                    {uploadResult.preview?.length > 0 && (
                      <>
                        <p className="font-medium">Preview (first rows)</p>
                        <div className="overflow-x-auto rounded border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                {Object.keys(uploadResult.preview[0]).map((k) => (
                                  <th key={k} className="p-2 text-left font-medium">{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {uploadResult.preview.slice(0, 10).map((row, i) => (
                                <tr key={i} className="border-b">
                                  {Object.values(row).map((v, j) => (
                                    <td key={j} className="p-2">{String(v)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <Button onClick={handleCommit} disabled={committing}>
                          {committing ? "Importing…" : `Import ${uploadResult.validRows} valid rows`}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {hasRun && !activeProjectId && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Select a project above to begin importing.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
