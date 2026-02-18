import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface SiteOption {
  _id: string;
  siteId: string;
  siteName: string;
}

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

export function ProjectLeaseForm() {
  const { projectId, leaseId } = useParams<{ projectId: string; leaseId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!leaseId;

  const [siteId, setSiteId] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseEndDate, setLeaseEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [escalationPercent, setEscalationPercent] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const { data: projectData } = useQuery({
    queryKey: ["projects", projectId, "meta"],
    queryFn: () => api<{ name: string }>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: sitesData } = useQuery({
    queryKey: ["projects", projectId, "sites-list"],
    queryFn: () => api<{ items: SiteOption[] }>(`/api/projects/${projectId}/sites?pageSize=100`),
    enabled: !!projectId,
  });

  const { data: lease } = useQuery({
    queryKey: ["projects", projectId, "leases", leaseId],
    queryFn: () => api<Lease>(`/api/projects/${projectId}/leases?pageSize=1`).then(async () => {
      const res = await api<{ items: Lease[] }>(`/api/projects/${projectId}/leases?pageSize=100`);
      return res.items.find((l) => l._id === leaseId);
    }),
    enabled: isEdit && !!projectId,
  });

  useEffect(() => {
    if (lease) {
      setSiteId(lease.siteId);
      setTenantName(lease.tenantName);
      setLeaseStartDate(lease.leaseStartDate.slice(0, 10));
      setLeaseEndDate(lease.leaseEndDate.slice(0, 10));
      setMonthlyRent(String(lease.monthlyRent));
      setEscalationPercent(lease.escalationPercent != null ? String(lease.escalationPercent) : "");
      setStatus(lease.status);
      setNotes(lease.notes ?? "");
    }
  }, [lease]);

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api(`/api/projects/${projectId}/leases/${siteId}`, { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "leases"] });
      navigate(`/projects/${projectId}/leases`);
    },
    onError: (err: any) => setError(err.message || "Failed to create lease"),
  });

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api(`/api/projects/${projectId}/leases/${leaseId}`, { method: "PUT", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "leases"] });
      navigate(`/projects/${projectId}/leases`);
    },
    onError: (err: any) => setError(err.message || "Failed to update lease"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const payload: Record<string, unknown> = {
      tenantName,
      leaseStartDate,
      leaseEndDate,
      monthlyRent: Number(monthlyRent),
      status,
      notes: notes || undefined,
    };
    if (escalationPercent) payload.escalationPercent = Number(escalationPercent);
    if (isEdit) {
      updateMut.mutate(payload);
    } else {
      if (!siteId) { setError("Please select a site"); return; }
      createMut.mutate(payload);
    }
  };

  const sites = sitesData?.items ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-primary">{projectData?.name ?? "..."}</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}/leases`} className="hover:text-primary">Leases</Link>
        <span>/</span>
        <span>{isEdit ? "Edit" : "New"}</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">{isEdit ? "Edit Lease" : "New Lease"}</h1>

      <Card>
        <CardHeader><CardTitle>Lease Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEdit && (
              <div>
                <label className="text-sm font-medium">Site</label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  required
                >
                  <option value="">Select site...</option>
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>{s.siteId} - {s.siteName}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Tenant Name</label>
              <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} required className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={leaseStartDate} onChange={(e) => setLeaseStartDate(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={leaseEndDate} onChange={(e) => setLeaseEndDate(e.target.value)} required className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Monthly Rent ($)</label>
                <Input type="number" min="0" step="0.01" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Escalation (%)</label>
                <Input type="number" min="0" max="100" step="0.01" value={escalationPercent} onChange={(e) => setEscalationPercent(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? "Saving..." : isEdit ? "Update Lease" : "Create Lease"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(`/projects/${projectId}/leases`)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
