import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface ProjectDetail {
  _id: string;
  name: string;
  description?: string;
  companyName?: string;
  isArchived: boolean;
  siteCount: number;
  lastImport: {
    uploadedAt: string;
    filename: string;
    importName?: string;
    importedRows: number;
    status: string;
  } | null;
  lastUpdatedSite: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMetrics {
  totalSites: number;
  avgStructureHeight: number;
  lastImportAt: string | null;
  lastUpdatedAt: string | null;
  sitesByState: { state: string; count: number }[];
  sitesByStructureType: { type: string; count: number }[];
  sitesByProvider: { provider: string; count: number }[];
}

const COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a",
  "#0891b2", "#4f46e5", "#c026d3", "#d97706", "#059669",
];

export function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const hasImport = useAuthStore((s) => s.hasPermission(PERMISSIONS.IMPORT_RUN));
  const hasSitesRead = useAuthStore((s) => s.hasPermission(PERMISSIONS.SITES_READ));
  const hasLeasesRead = useAuthStore((s) => s.hasPermission(PERMISSIONS.LEASES_READ));
  const hasDocsRead = useAuthStore((s) => s.hasPermission(PERMISSIONS.DOCUMENTS_READ));
  const hasInsights = useAuthStore((s) => s.hasPermission(PERMISSIONS.INSIGHTS_READ));

  const { data: project, isLoading, error, refetch } = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api<ProjectDetail>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: metrics } = useQuery({
    queryKey: ["projects", projectId, "metrics"],
    queryFn: () => api<ProjectMetrics>(`/api/projects/${projectId}/metrics`),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-2">Failed to load project.</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const stateData = (metrics?.sitesByState ?? []).slice(0, 10);
  const structureData = metrics?.sitesByStructureType ?? [];
  const providerData = (metrics?.sitesByProvider ?? []).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/projects" className="hover:text-primary">Projects</Link>
          <span>/</span>
          <span>{project.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.isArchived && (
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">Archived</span>
          )}
        </div>
        {project.description && <p className="text-muted-foreground">{project.description}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.siteCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Sites in this project</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Structure Height</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgStructureHeight ?? "—"} ft</div>
            <p className="text-xs text-muted-foreground mt-1">Across all sites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Import</CardTitle>
          </CardHeader>
          <CardContent>
            {project.lastImport ? (
              <>
                <div className="text-2xl font-bold">{project.lastImport.importedRows} rows</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {project.lastImport.importName || project.lastImport.filename} &middot;{" "}
                  {new Date(project.lastImport.uploadedAt).toLocaleDateString()}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground mt-1">No imports yet</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.lastUpdatedSite ? new Date(project.lastUpdatedSite).toLocaleDateString() : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Most recent site change</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        {hasSitesRead && (
          <Button asChild>
            <Link to={`/projects/${projectId}/sites`}>View Sites</Link>
          </Button>
        )}
        {hasSitesRead && (
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}/map`}>Map View</Link>
          </Button>
        )}
        {hasLeasesRead && (
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}/leases`}>Leases</Link>
          </Button>
        )}
        {hasDocsRead && (
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}/documents`}>Documents</Link>
          </Button>
        )}
        {hasInsights && (
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}/insights`}>Insights</Link>
          </Button>
        )}
        {hasImport && (
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}/import`}>Import Sites</Link>
          </Button>
        )}
      </div>

      {/* Charts */}
      {metrics && metrics.totalSites > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {stateData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sites by State (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stateData} layout="vertical" margin={{ left: 40 }}>
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="state" width={40} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {structureData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sites by Structure Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={structureData}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {structureData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {providerData.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Sites by Provider (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={providerData} margin={{ bottom: 60 }}>
                    <XAxis dataKey="provider" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Metadata and configuration</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div><span className="text-muted-foreground text-sm">Company</span><br /><span className="font-medium">{project.companyName || "—"}</span></div>
          <div><span className="text-muted-foreground text-sm">Status</span><br /><span className="font-medium">{project.isArchived ? "Archived" : "Active"}</span></div>
          <div><span className="text-muted-foreground text-sm">Created</span><br /><span className="font-medium">{new Date(project.createdAt).toLocaleString()}</span></div>
          <div><span className="text-muted-foreground text-sm">Updated</span><br /><span className="font-medium">{new Date(project.updatedAt).toLocaleString()}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
