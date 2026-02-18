import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { US_STATES, STRUCTURE_TYPES, PROVIDER_RESIDENT_OPTIONS } from "@/lib/constants";
import { downloadProjectSitesCsv } from "@/lib/exportCsv";

interface Site {
  _id: string;
  siteId: string;
  siteName: string;
  address: string;
  city: string;
  stateValue: string;
  provider: string;
  structureTypeValue: string;
  providerResidentValue: string;
}

interface SitesRes {
  items: Site[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function ProjectSites() {
  const { projectId } = useParams<{ projectId: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [provider, setProvider] = useState("");
  const [structureType, setStructureType] = useState("");
  const [providerResident, setProviderResident] = useState("");
  const hasWrite = useAuthStore((s) => s.hasPermission(PERMISSIONS.SITES_WRITE));
  const hasExport = useAuthStore((s) => s.hasPermission(PERMISSIONS.PROJECTS_EXPORT));

  const { data: projectData } = useQuery({
    queryKey: ["projects", projectId, "meta"],
    queryFn: () => api<{ name: string }>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["projects", projectId, "sites", { page, search, state, provider, structureType, providerResident }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(search && { search }),
        ...(state && { state }),
        ...(provider && { provider }),
        ...(structureType && { structureType }),
        ...(providerResident && { providerResident }),
      });
      return api<SitesRes>(`/api/projects/${projectId}/sites?${params}`);
    },
    enabled: !!projectId,
  });

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (!projectId) return;
    setExporting(true);
    try { await downloadProjectSitesCsv(projectId); } finally { setExporting(false); }
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-primary">{projectData?.name ?? "…"}</Link>
        <span>/</span>
        <span>Sites</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
        <div className="flex gap-2">
          {hasWrite && (
            <Button asChild>
              <Link to={`/projects/${projectId}/sites/new`}>Add Site</Link>
            </Button>
          )}
          {hasExport && (
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setPage(1)} />
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>
              <option value="">All states</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input placeholder="Provider" value={provider} onChange={(e) => setProvider(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setPage(1)} />
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={structureType} onChange={(e) => { setStructureType(e.target.value); setPage(1); }}>
              <option value="">All structure types</option>
              {STRUCTURE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={providerResident} onChange={(e) => { setProviderResident(e.target.value); setPage(1); }}>
              <option value="">Provider resident</option>
              {PROVIDER_RESIDENT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button variant="secondary" onClick={() => setPage(1)}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-2">Failed to load sites.</p>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No sites yet. Import or add manually.</p>
              <div className="flex gap-2 justify-center">
                {hasWrite && (
                  <Button asChild><Link to={`/projects/${projectId}/sites/new`}>Add Site</Link></Button>
                )}
                <Button variant="outline" asChild>
                  <Link to={`/projects/${projectId}/import`}>Import</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Site ID</th>
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium">Address</th>
                      <th className="text-left p-2 font-medium">City</th>
                      <th className="text-left p-2 font-medium">State</th>
                      <th className="text-left p-2 font-medium">Provider</th>
                      <th className="text-left p-2 font-medium">Structure</th>
                      {hasWrite && <th className="w-20" />}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((site) => (
                      <tr key={site._id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <Link to={`/projects/${projectId}/sites/${site._id}`} className="text-primary hover:underline">{site.siteId}</Link>
                        </td>
                        <td className="p-2">{site.siteName}</td>
                        <td className="p-2">{site.address}</td>
                        <td className="p-2">{site.city}</td>
                        <td className="p-2">{site.stateValue}</td>
                        <td className="p-2">{site.provider}</td>
                        <td className="p-2">{site.structureTypeValue}</td>
                        {hasWrite && (
                          <td className="p-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/projects/${projectId}/sites/${site._id}/edit`}>Edit</Link>
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data && data.totalCount > data.pageSize && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.totalCount} total)</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
