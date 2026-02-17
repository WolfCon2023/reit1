import { useState, useRef } from "react";
import { api, apiBlob } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UploadResult {
  batchId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: { row: number; errors: string[] }[];
  preview: Record<string, unknown>[];
}

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTemplate = useAuthStore((s) => s.hasPermission(PERMISSIONS.IMPORT_TEMPLATE_DOWNLOAD));
  const hasRun = useAuthStore((s) => s.hasPermission(PERMISSIONS.IMPORT_RUN));

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
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("File must be 10MB or smaller");
      setFile(null);
      return;
    }
    if (!f.name.endsWith(".xlsx")) {
      setError("Only .xlsx files are allowed");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !hasRun) return;
    setError("");
    setUploadResult(null);
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("accessToken");
    const apiUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? "";
  const res = await fetch(`${apiUrl}/api/import/xlsx`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || res.statusText);
      return;
    }
    const data = await res.json();
    setUploadResult(data);
  };

  const handleCommit = async () => {
    if (!uploadResult?.batchId) return;
    setCommitting(true);
    setError("");
    try {
      const result = await api<{ importedRows: number; errorRows: number; status: string }>(
        "/api/import/commit",
        { method: "POST", body: { batchId: uploadResult.batchId } }
      );
      setUploadResult(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      alert(`Imported ${result.importedRows} rows. ${result.errorRows} errors.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Commit failed");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Import Sites</h1>
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
      {hasRun && (
        <Card>
          <CardHeader>
            <CardTitle>Upload</CardTitle>
            <CardDescription>Upload a .xlsx file (max 10MB). Headers must match the template exactly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">{error}</div>
            )}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
