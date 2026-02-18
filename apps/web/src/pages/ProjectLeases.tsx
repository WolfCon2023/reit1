import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";

interface Lease {
  _id: string;
  siteId: string;
  tenantName: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: number;
  escalationPercent?: number;
  status: string;
  notes?: string;
}

interface LeasesRes {
  items: Lease[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface RevenueSummary {
  totalMonthlyRent: number;
  totalAnnualizedRent: number;
  leasesExpiringIn30: number;
  leasesExpiringIn60: number;
  leasesExpiringIn90: number;
}

export function ProjectLeases() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const hasWrite = useAuthStore((s) => s.hasPermission(PERMISSIONS.LEASES_WRITE));
  const hasDelete = useAuthStore((s) => s.hasPermission(PERMISSIONS.LEASES_DELETE));
  const hasRevenue = useAuthStore((s) => s.hasPermission(PERMISSIONS.REVENUE_READ));

  const { data: projectData } = useQuery({
    queryKey: ["projects", projectId, "meta"],
    queryFn: () => api<{ name: string }>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (statusFilter) params.set("status", statusFilter);
  if (search) params.set("search", search);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["projects", projectId, "leases", { page, statusFilter, search }],
    queryFn: () => api<LeasesRes>(`/api/projects/${projectId}/leases?${params}`),
    enabled: !!projectId,
  });

  const { data: revenue } = useQuery({
    queryKey: ["projects", projectId, "revenue"],
    queryFn: () => api<RevenueSummary>(`/api/projects/${projectId}/revenue/summary`),
    enabled: !!projectId && hasRevenue,
  });

  const deleteMut = useMutation({
    mutationFn: (leaseId: string) => api(`/api/projects/${projectId}/leases/${leaseId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", projectId, "leases"] }),
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-primary">{projectData?.name ?? "..."}</Link>
        <span>/</span>
        <span>Leases</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Leases</h1>
        {hasWrite && (
          <Button asChild>
            <Link to={`/projects/${projectId}/leases/new`}>Add Lease</Link>
          </Button>
        )}
      </div>

      {hasRevenue && revenue && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{fmt(revenue.totalMonthlyRent)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Annualized Revenue</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{fmt(revenue.totalAnnualizedRent)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Expiring (30 days)</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{revenue.leasesExpiringIn30}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Expiring (90 days)</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{revenue.leasesExpiringIn90}</div></CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search tenant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setPage(1)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-2">Failed to load leases.</p>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No leases found.</p>
              {hasWrite && (
                <Button asChild><Link to={`/projects/${projectId}/leases/new`}>Add Lease</Link></Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Tenant</th>
                      <th className="text-left p-2 font-medium">Monthly Rent</th>
                      <th className="text-left p-2 font-medium">Start</th>
                      <th className="text-left p-2 font-medium">End</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="w-32" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((lease) => (
                      <tr key={lease._id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{lease.tenantName}</td>
                        <td className="p-2">{fmt(lease.monthlyRent)}</td>
                        <td className="p-2">{new Date(lease.leaseStartDate).toLocaleDateString()}</td>
                        <td className="p-2">{new Date(lease.leaseEndDate).toLocaleDateString()}</td>
                        <td className="p-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            lease.status === "active" ? "bg-green-100 text-green-800" :
                            lease.status === "expired" ? "bg-red-100 text-red-800" :
                            lease.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {lease.status}
                          </span>
                        </td>
                        <td className="p-2 flex gap-1">
                          {hasWrite && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/projects/${projectId}/leases/${lease._id}/edit`}>Edit</Link>
                            </Button>
                          )}
                          {hasDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => { if (confirm("Delete this lease?")) deleteMut.mutate(lease._id); }}
                            >
                              Delete
                            </Button>
                          )}
                        </td>
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
