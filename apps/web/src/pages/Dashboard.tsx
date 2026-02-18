import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface GlobalMetrics {
  totalProjects: number;
  totalSites: number;
  avgStructureHeight: number;
  sitesByState: { state: string; count: number }[];
  sitesByStructureType: { type: string; count: number }[];
  sitesByProvider: { provider: string; count: number }[];
}

export function Dashboard() {
  const hasProjects = useAuthStore((s) => s.hasPermission(PERMISSIONS.PROJECTS_READ));

  const { data: metrics } = useQuery({
    queryKey: ["global-metrics"],
    queryFn: () => api<GlobalMetrics>("/api/metrics"),
    enabled: hasProjects,
  });

  const totalSites = metrics?.totalSites ?? 0;
  const totalProjects = metrics?.totalProjects ?? 0;
  const stateData = (metrics?.sitesByState ?? []).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of projects, sites, and recent activity</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Active projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSites}</div>
            <p className="text-xs text-muted-foreground mt-1">Sites across all projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Structure Height</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgStructureHeight ?? "—"} ft</div>
            <p className="text-xs text-muted-foreground mt-1">Across all projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/projects">View Projects</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/import">Import Sites</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {stateData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sites by State (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
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

      <ActivityFeed />

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Manage your REIT site data by project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Create or select a <Link to="/projects" className="text-primary underline">Project</Link> to group your site data.</p>
          <p>2. Import sites into a project from the <Link to="/import" className="text-primary underline">Import</Link> page, or add sites manually.</p>
          <p>3. View, edit, and export project sites from the project dashboard.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityFeed() {
  const { data } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: () => api<{ items: { _id: string; label: string; actorEmail: string; resourceType: string; createdAt: string }[] }>("/api/activity?limit=10"),
  });

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item._id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
              <div>
                <span className="font-medium">{item.actorEmail}</span>
                <span className="text-muted-foreground ml-1">{item.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatRelative(item.createdAt)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
