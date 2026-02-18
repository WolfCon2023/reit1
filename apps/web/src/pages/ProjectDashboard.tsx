import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  MapPin, Ruler, Upload, Calendar,
  Map, Receipt, FileText, Lightbulb, RotateCcw, Building2, LayoutDashboard,
} from "lucide-react";

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
  "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#22c55e",
  "#06b6d4", "#6366f1", "#d946ef", "#eab308", "#14b8a6",
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
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}
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

  const quickLinks = [
    { label: "Sites", icon: LayoutDashboard, to: `/projects/${projectId}/sites`, show: hasSitesRead },
    { label: "Map View", icon: Map, to: `/projects/${projectId}/map`, show: hasSitesRead },
    { label: "Leases", icon: Receipt, to: `/projects/${projectId}/leases`, show: hasLeasesRead },
    { label: "Renewals", icon: RotateCcw, to: `/projects/${projectId}/renewals`, show: hasLeasesRead },
    { label: "Documents", icon: FileText, to: `/projects/${projectId}/documents`, show: hasDocsRead },
    { label: "Insights", icon: Lightbulb, to: `/projects/${projectId}/insights`, show: hasInsights },
    { label: "Import", icon: Upload, to: `/projects/${projectId}/import`, show: hasImport },
  ].filter((l) => l.show);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/projects" className="hover:text-primary transition-colors">Projects</Link>
          <span>/</span>
          <span>{project.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.isArchived ? (
              <Badge variant="muted">Archived</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </div>
        </div>
        {project.description && <p className="text-muted-foreground">{project.description}</p>}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Sites" value={project.siteCount} subtitle="Sites in this project" icon={MapPin} iconColor="text-blue-600" />
        <StatCard title="Avg Structure Height" value={`${metrics?.avgStructureHeight ?? "—"} ft`} subtitle="Across all sites" icon={Ruler} iconColor="text-violet-600" />
        <StatCard
          title="Last Import"
          value={project.lastImport ? `${project.lastImport.importedRows} rows` : "—"}
          subtitle={project.lastImport ? `${project.lastImport.importName || project.lastImport.filename} \u00b7 ${new Date(project.lastImport.uploadedAt).toLocaleDateString()}` : "No imports yet"}
          icon={Upload}
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Last Updated"
          value={project.lastUpdatedSite ? new Date(project.lastUpdatedSite).toLocaleDateString() : "—"}
          subtitle="Most recent site change"
          icon={Calendar}
          iconColor="text-amber-600"
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center hover:bg-accent/50 hover:border-primary/20 transition-all duration-150 group"
          >
            <link.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-medium">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Charts */}
      {metrics && metrics.totalSites > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {stateData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  Sites by State (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stateData} layout="vertical" margin={{ left: 40 }}>
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="state" width={40} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {structureData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  Sites by Structure Type
                </CardTitle>
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  Sites by Provider (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={providerData} margin={{ bottom: 60 }}>
                    <XAxis dataKey="provider" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Project details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Project Details
          </CardTitle>
          <CardDescription>Metadata and configuration</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-accent/30 p-3">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Company</span>
            <p className="font-medium mt-1">{project.companyName || "—"}</p>
          </div>
          <div className="rounded-lg bg-accent/30 p-3">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Status</span>
            <p className="font-medium mt-1">{project.isArchived ? "Archived" : "Active"}</p>
          </div>
          <div className="rounded-lg bg-accent/30 p-3">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Created</span>
            <p className="font-medium mt-1">{new Date(project.createdAt).toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-accent/30 p-3">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Updated</span>
            <p className="font-medium mt-1">{new Date(project.updatedAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
