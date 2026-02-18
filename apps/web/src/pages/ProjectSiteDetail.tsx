import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";

interface Site {
  _id: string;
  siteId: string;
  siteName: string;
  areaName?: string;
  districtName?: string;
  provider: string;
  providerResidentValue: string;
  address: string;
  city: string;
  county?: string;
  stateValue: string;
  zipCode: string;
  cmaId?: string;
  cmaName?: string;
  structureTypeValue: string;
  siteType?: string;
  ge?: string;
  structureHeight: number;
  latitude: number;
  longitude: number;
  latitudeNad83: number;
  longitudeNad83: number;
  siteAltId?: string;
}

export function ProjectSiteDetail() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const hasWrite = useAuthStore((s) => s.hasPermission(PERMISSIONS.SITES_WRITE));

  const { data: projectData } = useQuery({
    queryKey: ["projects", projectId, "meta"],
    queryFn: () => api<{ name: string }>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: site, isLoading, error, refetch } = useQuery({
    queryKey: ["projects", projectId, "sites", id],
    queryFn: () => api<Site>(`/api/projects/${projectId}/sites/${id}`),
    enabled: !!projectId && !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-2">{error ? "Failed to load site." : "Site not found."}</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-primary">{projectData?.name ?? "…"}</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}/sites`} className="hover:text-primary">Sites</Link>
        <span>/</span>
        <span>{site.siteId}</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{site.siteName}</h1>
        {hasWrite && (
          <Button asChild>
            <Link to={`/projects/${projectId}/sites/${site._id}/edit`}>Edit</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Site details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div><span className="text-muted-foreground">Site ID</span><br />{site.siteId}</div>
          <div><span className="text-muted-foreground">Provider</span><br />{site.provider}</div>
          <div><span className="text-muted-foreground">Provider Resident</span><br />{site.providerResidentValue}</div>
          <div><span className="text-muted-foreground">Address</span><br />{site.address}</div>
          <div><span className="text-muted-foreground">City</span><br />{site.city}</div>
          <div><span className="text-muted-foreground">County</span><br />{site.county || "—"}</div>
          <div><span className="text-muted-foreground">State</span><br />{site.stateValue}</div>
          <div><span className="text-muted-foreground">ZIP</span><br />{site.zipCode}</div>
          <div><span className="text-muted-foreground">CMA ID</span><br />{site.cmaId || "—"}</div>
          <div><span className="text-muted-foreground">CMA Name</span><br />{site.cmaName || "—"}</div>
          <div><span className="text-muted-foreground">Structure Type</span><br />{site.structureTypeValue}</div>
          <div><span className="text-muted-foreground">Site Type</span><br />{site.siteType || "—"}</div>
          <div><span className="text-muted-foreground">GE</span><br />{site.ge || "—"}</div>
          <div><span className="text-muted-foreground">Structure Height</span><br />{site.structureHeight}</div>
          <div><span className="text-muted-foreground">Latitude / Longitude (WGS84)</span><br />{site.latitude}, {site.longitude}</div>
          <div><span className="text-muted-foreground">Latitude / Longitude (NAD83)</span><br />{site.latitudeNad83}, {site.longitudeNad83}</div>
          <div><span className="text-muted-foreground">Site Alt ID</span><br />{site.siteAltId || "—"}</div>
        </CardContent>
      </Card>
    </div>
  );
}
