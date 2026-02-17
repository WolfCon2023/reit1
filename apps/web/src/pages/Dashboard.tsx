import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { downloadSitesCsv } from "@/lib/exportCsv";

function ExportCsvButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={async () => { setLoading(true); try { await downloadSitesCsv(); } finally { setLoading(false); } }}>
      {loading ? "…" : "Download CSV"}
    </Button>
  );
}

interface SitesRes {
  total: number;
}
export function Dashboard() {
  const hasExport = useAuthStore((s) => s.hasPermission(PERMISSIONS.SITES_EXPORT));
  const { data: sites } = useQuery({
    queryKey: ["sites-count"],
    queryFn: () => api<SitesRes>("/api/sites?limit=1"),
  });
  const totalSites = sites?.total ?? 0;
  const lastUpdated = "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of sites and recent activity</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSites}</div>
            <p className="text-xs text-muted-foreground mt-1">Sites in database</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lastUpdated}</div>
            <p className="text-xs text-muted-foreground mt-1">Most recent change</p>
          </CardContent>
        </Card>
        {hasExport && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Export</CardTitle>
            </CardHeader>
            <CardContent>
              <ExportCsvButton />
            </CardContent>
          </Card>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
          <CardDescription>Latest import batches</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            View and run imports from the <Link to="/import" className="text-primary underline">Import</Link> page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
