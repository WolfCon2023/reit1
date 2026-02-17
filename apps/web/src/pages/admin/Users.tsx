import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";

interface UserRow {
  _id: string;
  email: string;
  name: string;
  roles: { _id: string; name: string }[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}
interface RoleOption {
  _id: string;
  name: string;
}

export function Users() {
  const queryClient = useQueryClient();
  const hasManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.USERS_MANAGE));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "", roleIds: [] as string[] });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<UserRow[]>("/api/admin/users"),
  });
  useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => api<RoleOption[]>("/api/admin/roles"),
  });

  const createMutation = useMutation({
    mutationFn: (body: { email: string; name: string; password: string; roleIds: string[] }) =>
      api("/api/admin/users", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowForm(false);
      setForm({ email: "", name: "", password: "", roleIds: [] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { email?: string; name?: string; roleIds?: string[] } }) =>
      api(`/api/admin/users/${id}`, { method: "PUT", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingId(null);
    },
  });
  const resetPwMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api(`/api/admin/users/${id}/reset-password`, { method: "POST", body: { newPassword } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const disableMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}/disable`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const enableMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}/enable`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const list = users ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Users</CardTitle>
        {hasManage && (
          <Button onClick={() => setShowForm(true)}>Create user</Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <Card className="mb-4 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email" required />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} type="password" required minLength={8} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Email</th>
                <th className="text-left p-2 font-medium">Name</th>
                <th className="text-left p-2 font-medium">Roles</th>
                <th className="text-left p-2 font-medium">Status</th>
                {hasManage && <th className="w-40" />}
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u._id} className="border-b">
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{(u.roles || []).map((r) => r.name).join(", ") || "—"}</td>
                  <td className="p-2">{u.isActive ? "Active" : "Disabled"}</td>
                  {hasManage && (
                    <td className="p-2 space-x-1">
                      {editingId === u._id ? (
                        <>
                          <Button size="sm" onClick={() => updateMutation.mutate({ id: u._id, body: { name: form.name, roleIds: form.roleIds } })}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(u._id); setForm({ ...form, name: u.name, roleIds: (u.roles || []).map((r) => r._id) }); }}>Edit</Button>
                          {u.isActive ? (
                            <Button size="sm" variant="ghost" onClick={() => disableMutation.mutate(u._id)}>Disable</Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => enableMutation.mutate(u._id)}>Enable</Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { const pw = prompt("New password (min 8 chars):"); if (pw && pw.length >= 8) resetPwMutation.mutate({ id: u._id, newPassword: pw }); }}>Reset password</Button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
