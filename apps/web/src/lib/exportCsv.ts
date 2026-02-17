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
