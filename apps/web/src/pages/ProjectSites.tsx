import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { US_STATES, STRUCTURE_TYPES, PROVIDER_RESIDENT_OPTIONS } from "@/lib/constants";
import { downloadProjectSitesCsv } from "@/lib/exportCsv";

interface SavedView {
  _id: string;
  name: string;
  query: Record<string, string>;
  isDefault?: boolean;
}

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
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [provider, setProvider] = useState("");
  const [structureType, setStructureType] = useState("");
  const [providerResident, setProviderResident] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkField, setShowBulkField] = useState(false);
  const [bulkField, setBulkField] = useState("structureTypeValue");
  const [bulkValue, setBulkValue] = useState("");
  const [showSaveView, setShowSaveView] = useState(false);
  const [viewName, setViewName] = useState("");
  const hasWrite = useAuthStore((s) => s.hasPermission(PERMISSIONS.SITES_WRITE));
  const hasDelete = useAuthStore((s) => s.hasPermission(PERMISSIONS.SITES_DELETE));
  const hasExport = useAuthStore((s) => s.hasPermission(PERMISSIONS.PROJECTS_EXPORT));
  const hasViews = useAuthStore((s) => s.hasPermission(PERMISSIONS.VIEWS_MANAGE));

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

  const { data: viewsData } = useQuery({
    queryKey: ["projects", projectId, "views"],
    queryFn: () => api<{ items: SavedView[] }>(`/api/projects/${projectId}/views`),
    enabled: !!projectId && hasViews,
  });

  const saveViewMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/projects/${projectId}/views`, { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "views"] });
      setShowSaveView(false);
      setViewName("");
    },
  });

  const bulkMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/projects/${projectId}/sites/bulk`, { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "sites"] });
      setSelectedIds(new Set());
      setShowBulkField(false);
    },
  });

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (!projectId) return;
    setExporting(true);
    try { await downloadProjectSitesCsv(projectId); } finally { setExporting(false); }
  };

  const applyView = (view: SavedView) => {
    const q = view.query;
    if (q.search !== undefined) setSearch(q.search);
    if (q.state !== undefined) setState(q.state);
    if (q.provider !== undefined) setProvider(q.provider);
    if (q.structureType !== undefined) setStructureType(q.structureType);
    if (q.providerResident !== undefined) setProviderResident(q.providerResident);
    setPage(1);
  };

  const handleSaveView = () => {
    if (!viewName.trim()) return;
    saveViewMut.mutate({
      name: viewName.trim(),
      query: { search, state, provider, structureType, providerResident },
    });
  };

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selectedIds.size} selected sites?`)) return;
    bulkMut.mutate({ action: "delete", siteIds: [...selectedIds] });
  };

  const handleBulkUpdate = () => {
    if (!bulkValue.trim()) return;
    bulkMut.mutate({ action: "update", siteIds: [...selectedIds], patch: { [bulkField]: bulkValue } });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((s) => s._id)));
    }
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

      {hasViews && (
        <div className="flex flex-wrap items-center gap-2">
          {viewsData?.items?.map((v) => (
            <Button key={v._id} variant="outline" size="sm" onClick={() => applyView(v)}>
              {v.name}
            </Button>
          ))}
          {showSaveView ? (
            <div className="flex gap-1 items-center">
              <Input
                placeholder="View name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                className="w-36 h-8"
              />
              <Button size="sm" onClick={handleSaveView} disabled={saveViewMut.isPending}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSaveView(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowSaveView(true)}>Save Current View</Button>
          )}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-muted/50 border rounded-lg p-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          {hasDelete && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkMut.isPending}>
              Delete Selected
            </Button>
          )}
          {hasWrite && !showBulkField && (
            <Button variant="outline" size="sm" onClick={() => setShowBulkField(true)}>Update Field</Button>
          )}
          {hasWrite && showBulkField && (
            <>
              <select
                value={bulkField}
                onChange={(e) => setBulkField(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="structureTypeValue">Structure Type</option>
                <option value="provider">Provider</option>
                <option value="stateValue">State</option>
                <option value="ge">GE</option>
                <option value="siteType">Site Type</option>
              </select>
              <Input
                placeholder="New value"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="w-32 h-8"
              />
              <Button size="sm" onClick={handleBulkUpdate} disabled={bulkMut.isPending}>Apply</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowBulkField(false)}>Cancel</Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

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
                      <th className="p-2 w-10">
                        <input
                          type="checkbox"
                          checked={items.length > 0 && selectedIds.size === items.length}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </th>
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
                      <tr key={site._id} className={`border-b hover:bg-muted/50 ${selectedIds.has(site._id) ? "bg-primary/5" : ""}`}>
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(site._id)}
                            onChange={() => toggleSelect(site._id)}
                            className="rounded"
                          />
                        </td>
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
