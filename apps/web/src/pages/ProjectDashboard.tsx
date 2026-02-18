import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";

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

export function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const hasImport = useAuthStore((s) => s.hasPermission(PERMISSIONS.IMPORT_RUN));
  const hasSitesRead = useAuthStore((s) => s.hasPermission(PERMISSIONS.SITES_READ));

  const { data: project, isLoading, error, refetch } = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api<ProjectDetail>(`/api/projects/${projectId}`),
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      <div className="flex gap-3">
        {hasSitesRead && (
          <Button asChild>
            <Link to={`/projects/${projectId}/sites`}>View Sites</Link>
          </Button>
        )}
        {hasImport && (
          <Button variant="outline" asChild>
            <Link to={`/projects/${projectId}/import`}>Import Sites</Link>
          </Button>
        )}
      </div>

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
