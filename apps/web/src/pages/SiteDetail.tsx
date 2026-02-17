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

export function SiteDetail() {
  const { id } = useParams<{ id: string }>();
  const hasWrite = useAuthStore((s) => s.hasPermission(PERMISSIONS.SITES_WRITE));
  const { data: site, isLoading, error } = useQuery({
    queryKey: ["site", id],
    queryFn: () => api<Site>(`/api/sites/${id}`),
    enabled: !!id,
  });

  if (isLoading || !site) {
    return <div className="text-muted-foreground">{error ? "Site not found." : "Loading…"}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{site.siteName}</h1>
        {hasWrite && (
          <Button asChild>
            <Link to={`/sites/${site._id}/edit`}>Edit</Link>
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Site details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div><span className="text-muted-foreground">Site ID</span><br />{site.siteId}</div>
          <div><span className="text-muted-foreground">Provider</span><br />{site.provider}</div>
          <div><span className="text-muted-foreground">Address</span><br />{site.address}</div>
          <div><span className="text-muted-foreground">City</span><br />{site.city}</div>
          <div><span className="text-muted-foreground">State</span><br />{site.stateValue}</div>
          <div><span className="text-muted-foreground">ZIP</span><br />{site.zipCode}</div>
          <div><span className="text-muted-foreground">Structure type</span><br />{site.structureTypeValue}</div>
          <div><span className="text-muted-foreground">Structure height</span><br />{site.structureHeight}</div>
          <div><span className="text-muted-foreground">Latitude / Longitude (WGS84)</span><br />{site.latitude}, {site.longitude}</div>
          <div><span className="text-muted-foreground">Latitude / Longitude (NAD83)</span><br />{site.latitudeNad83}, {site.longitudeNad83}</div>
        </CardContent>
      </Card>
    </div>
  );
}
