import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  FolderKanban,
  MapPin,
  Ruler,
  Zap,
  ArrowRight,
  Upload,
  Clock,
} from "lucide-react";

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
        <p className="text-muted-foreground mt-1">Overview of your REIT portfolio</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Projects" value={totalProjects} subtitle="Active projects" icon={FolderKanban} iconColor="text-blue-600" />
        <StatCard title="Total Sites" value={totalSites} subtitle="Sites across all projects" icon={MapPin} iconColor="text-emerald-600" />
        <StatCard title="Avg Structure Height" value={`${metrics?.avgStructureHeight ?? "—"} ft`} subtitle="Across all projects" icon={Ruler} iconColor="text-violet-600" />
        <div className="rounded-lg border bg-card p-6 shadow-card hover:shadow-card-hover transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Quick Actions</p>
            </div>
            <div className="rounded-lg bg-amber-100 dark:bg-amber-950/30 p-2.5">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <Button variant="outline" size="sm" asChild className="justify-between">
              <Link to="/projects">
                View Projects <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="justify-between">
              <Link to="/import">
                Import Sites <Upload className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {stateData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Sites by State (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stateData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="state" width={40} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(221, 83%, 53%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <ActivityFeed />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Getting Started
          </CardTitle>
          <CardDescription>Manage your REIT site data by project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg border p-4 bg-accent/30">
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Create a Project</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <Link to="/projects" className="text-primary hover:underline">Go to Projects</Link> to create or select one.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4 bg-accent/30">
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Import Sites</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload site data from the <Link to="/import" className="text-primary hover:underline">Import</Link> page.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4 bg-accent/30">
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Manage & Export</p>
                <p className="text-xs text-muted-foreground mt-1">View, edit, and export from the project dashboard.</p>
              </div>
            </div>
          </div>
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
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={item._id} className={`flex items-center justify-between py-2.5 text-sm ${idx < items.length - 1 ? "border-b" : ""}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">{item.actorEmail.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-medium">{item.actorEmail.split("@")[0]}</span>
                  <span className="text-muted-foreground ml-1.5">{item.label}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-4">{formatRelative(item.createdAt)}</span>
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
