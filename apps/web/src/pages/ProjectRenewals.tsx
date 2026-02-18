import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { RotateCcw, Plus, Check, X as XIcon } from "lucide-react";

interface Renewal {
  _id: string;
  leaseId: string;
  tenantName: string;
  currentEndDate: string;
  proposedEndDate: string;
  proposedMonthlyRent: number;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

interface Lease {
  _id: string;
  tenantName: string;
  leaseEndDate: string;
  monthlyRent: number;
}

export function ProjectRenewals() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const hasWrite = useAuthStore((s) => s.hasPermission(PERMISSIONS.LEASES_WRITE));
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedLease, setSelectedLease] = useState("");
  const [proposedEndDate, setProposedEndDate] = useState("");
  const [proposedRent, setProposedRent] = useState("");
  const [renewalNotes, setRenewalNotes] = useState("");

  const { data: projectData } = useQuery({
    queryKey: ["projects", projectId, "meta"],
    queryFn: () => api<{ name: string }>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", projectId, "renewals", statusFilter],
    queryFn: () => api<{ items: Renewal[] }>(`/api/projects/${projectId}/renewals?${params}`),
    enabled: !!projectId,
  });

  const { data: leasesData } = useQuery({
    queryKey: ["projects", projectId, "leases-for-renewal"],
    queryFn: () => api<{ items: Lease[] }>(`/api/projects/${projectId}/leases?status=active&pageSize=100`),
    enabled: !!projectId && showForm,
  });

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/projects/${projectId}/renewals`, { method: "POST", body }),
    onSuccess: () => {
      toast.success("Renewal request submitted");
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "renewals"] });
      setShowForm(false);
      setSelectedLease("");
      setProposedEndDate("");
      setProposedRent("");
      setRenewalNotes("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) =>
      api(`/api/projects/${projectId}/renewals/${id}/approve`, { method: "POST", body: { reviewNotes } }),
    onSuccess: () => { toast.success("Renewal approved"); queryClient.invalidateQueries({ queryKey: ["projects", projectId, "renewals"] }); },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reviewNotes }: { id: string; reviewNotes?: string }) =>
      api(`/api/projects/${projectId}/renewals/${id}/reject`, { method: "POST", body: { reviewNotes } }),
    onSuccess: () => { toast.success("Renewal rejected"); queryClient.invalidateQueries({ queryKey: ["projects", projectId, "renewals"] }); },
  });

  const items = data?.items ?? [];
  const leases = leasesData?.items ?? [];
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-primary">{projectData?.name ?? "..."}</Link>
        <span>/</span>
        <span>Renewals</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RotateCcw className="h-7 w-7 text-primary" />
          Lease Renewals
        </h1>
        {hasWrite && (
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            {showForm ? <><XIcon className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Request Renewal</>}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Renewal Request</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMut.mutate({
                  leaseId: selectedLease,
                  proposedEndDate,
                  proposedMonthlyRent: Number(proposedRent),
                  notes: renewalNotes || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium">Lease</label>
                <select
                  value={selectedLease}
                  onChange={(e) => setSelectedLease(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  required
                >
                  <option value="">Select lease...</option>
                  {leases.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.tenantName} — {fmt(l.monthlyRent)}/mo — expires {new Date(l.leaseEndDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Proposed End Date</label>
                  <Input type="date" value={proposedEndDate} onChange={(e) => setProposedEndDate(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Proposed Monthly Rent ($)</label>
                  <Input type="number" min="0" step="0.01" value={proposedRent} onChange={(e) => setProposedRent(e.target.value)} required className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                />
              </div>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded bg-muted animate-pulse" />)}</div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No renewal requests found.</p>
          ) : (
            <div className="space-y-4">
              {items.map((r) => (
                <div key={r._id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{r.tenantName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Current end: {new Date(r.currentEndDate).toLocaleDateString()} →
                        Proposed: {new Date(r.proposedEndDate).toLocaleDateString()} at {fmt(r.proposedMonthlyRent)}/mo
                      </p>
                      {r.notes && <p className="text-sm mt-1">{r.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">Requested: {new Date(r.createdAt).toLocaleString()}</p>
                      {r.reviewedAt && (
                        <p className="text-xs text-muted-foreground">
                          Reviewed: {new Date(r.reviewedAt).toLocaleString()}
                          {r.reviewNotes && ` — "${r.reviewNotes}"`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        r.status === "pending" ? "warning" :
                        r.status === "approved" ? "success" : "destructive"
                      }>
                        {r.status}
                      </Badge>
                      {r.status === "pending" && hasWrite && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveMut.mutate({ id: r._id })}
                            disabled={approveMut.isPending}
                            className="gap-1.5"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive gap-1.5"
                            onClick={() => rejectMut.mutate({ id: r._id })}
                            disabled={rejectMut.isPending}
                          >
                            <XIcon className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
