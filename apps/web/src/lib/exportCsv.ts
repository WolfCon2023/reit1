import { apiBlob } from "./api";

export async function downloadSitesCsv(): Promise<void> {
  const blob = await apiBlob("/api/sites/export.csv");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sites.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadProjectSitesCsv(projectId: string): Promise<void> {
  const blob = await apiBlob(`/api/projects/${projectId}/sites/export.csv`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "project_sites.csv";
  a.click();
  URL.revokeObjectURL(url);
}
