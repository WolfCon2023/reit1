import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface AuditEntry {
  _id: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
interface AuditRes {
  items: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function AuditLog() {
  const [page, setPage] = useState(1);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (actor) params.set("actor", actor);
  if (action) params.set("action", action);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { data } = useQuery({
    queryKey: ["admin-audit", page, actor, action, from, to],
    queryFn: () => api<AuditRes>(`/api/admin/audit?${params}`),
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input placeholder="Actor user ID" value={actor} onChange={(e) => setActor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Input placeholder="e.g. site.create" value={action} onChange={(e) => setAction(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>From date</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To date</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Time</th>
                <th className="text-left p-2 font-medium">Actor</th>
                <th className="text-left p-2 font-medium">Action</th>
                <th className="text-left p-2 font-medium">Resource</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e._id} className="border-b">
                  <td className="p-2">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="p-2">{e.actorEmail}</td>
                  <td className="p-2">{e.action}</td>
                  <td className="p-2">{e.resourceType} {e.resourceId ? `#${e.resourceId}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between mt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
