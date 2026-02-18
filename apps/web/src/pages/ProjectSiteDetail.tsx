import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getBaseUrl } from "@/lib/api";
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

interface SiteLease {
  _id: string;
  tenantName: string;
  monthlyRent: number;
  leaseStartDate: string;
  leaseEndDate: string;
  status: string;
}

interface SiteDoc {
  _id: string;
  title: string;
  filename: string;
  category: string;
  uploadedAt: string;
}

interface SitePhoto {
  _id: string;
  title: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  createdAt: string;
}

export function ProjectSiteDetail() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const queryClient = useQueryClient();
  const hasWrite = useAuthStore((s) => s.hasPermission(PERMISSIONS.SITES_WRITE));
  const hasLeases = useAuthStore((s) => s.hasPermission(PERMISSIONS.LEASES_READ));
  const hasDocs = useAuthStore((s) => s.hasPermission(PERMISSIONS.DOCUMENTS_READ));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const { data: leasesData } = useQuery({
    queryKey: ["projects", projectId, "sites", id, "leases"],
    queryFn: () => api<{ items: SiteLease[] }>(`/api/projects/${projectId}/leases?siteId=${id}&pageSize=10`),
    enabled: !!projectId && !!id && hasLeases,
  });

  const { data: docsData } = useQuery({
    queryKey: ["projects", projectId, "sites", id, "documents"],
    queryFn: () => api<{ items: SiteDoc[] }>(`/api/projects/${projectId}/documents?siteId=${id}&pageSize=10`),
    enabled: !!projectId && !!id && hasDocs,
  });

  const { data: photosData } = useQuery({
    queryKey: ["projects", projectId, "sites", id, "photos"],
    queryFn: () => api<{ items: SitePhoto[] }>(`/api/projects/${projectId}/sites/${id}/photos`),
    enabled: !!projectId && !!id,
  });

  const deletePhotoMut = useMutation({
    mutationFn: (photoId: string) => api(`/api/projects/${projectId}/sites/${id}/photos/${photoId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", projectId, "sites", id, "photos"] }),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("title", file.name);
      const token = localStorage.getItem("accessToken");
      await fetch(`${getBaseUrl()}/api/projects/${projectId}/sites/${id}/photos`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "sites", id, "photos"] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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

  const siteLeases = leasesData?.items ?? [];
  const siteDocs = docsData?.items ?? [];
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-primary">{projectData?.name ?? "..."}</Link>
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
        <CardHeader><CardTitle>Site Details</CardTitle></CardHeader>
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

      {hasLeases && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leases</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/projects/${projectId}/leases/new`}>Add Lease</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {siteLeases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leases for this site.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Tenant</th>
                      <th className="text-left p-2 font-medium">Rent</th>
                      <th className="text-left p-2 font-medium">End Date</th>
                      <th className="text-left p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteLeases.map((l) => (
                      <tr key={l._id} className="border-b">
                        <td className="p-2">{l.tenantName}</td>
                        <td className="p-2">{fmt(l.monthlyRent)}</td>
                        <td className="p-2">{new Date(l.leaseEndDate).toLocaleDateString()}</td>
                        <td className="p-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            l.status === "active" ? "bg-green-100 text-green-800" :
                            l.status === "expired" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hasDocs && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Documents</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/projects/${projectId}/documents`}>View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {siteDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents for this site.</p>
            ) : (
              <div className="space-y-2">
                {siteDocs.map((d) => (
                  <div key={d._id} className="flex items-center justify-between text-sm border-b py-2">
                    <div>
                      <span className="font-medium">{d.title}</span>
                      <span className="text-muted-foreground ml-2">({d.category})</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(d.uploadedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Photos</CardTitle>
          {hasWrite && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Photo"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {(photosData?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos for this site.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {(photosData?.items ?? []).map((photo) => (
                <div key={photo._id} className="relative group rounded-lg overflow-hidden border">
                  <img
                    src={`${getBaseUrl()}/api/projects/${projectId}/sites/${id}/photos/${photo._id}/file`}
                    alt={photo.title}
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                    <div className="w-full p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs font-medium truncate">{photo.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs">{(photo.sizeBytes / 1024).toFixed(0)} KB</span>
                        {hasWrite && (
                          <button
                            onClick={() => deletePhotoMut.mutate(photo._id)}
                            className="text-xs text-red-300 hover:text-red-100"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {photo.isPrimary && (
                    <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">Primary</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
