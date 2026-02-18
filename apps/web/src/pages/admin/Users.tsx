import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import {
  UserPlus, Pencil, KeyRound, ShieldCheck, ShieldOff,
  Save, X, Users2,
} from "lucide-react";

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

  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => api<RoleOption[]>("/api/admin/roles"),
  });

  const roleOptions = roles ?? [];

  const createMutation = useMutation({
    mutationFn: (body: { email: string; name: string; password: string; roleIds: string[] }) =>
      api("/api/admin/users", { method: "POST", body }),
    onSuccess: () => {
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowForm(false);
      setForm({ email: "", name: "", password: "", roleIds: [] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { email?: string; name?: string; roleIds?: string[] } }) =>
      api(`/api/admin/users/${id}`, { method: "PUT", body }),
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api(`/api/admin/users/${id}/reset-password`, { method: "POST", body: { newPassword } }),
    onSuccess: () => { toast.success("Password reset successfully"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}/disable`, { method: "POST" }),
    onSuccess: () => { toast.success("User disabled"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}/enable`, { method: "POST" }),
    onSuccess: () => { toast.success("User enabled"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const startEditing = (u: UserRow) => {
    setEditingId(u._id);
    setForm({
      email: u.email,
      name: u.name,
      password: "",
      roleIds: (u.roles || []).map((r) => r._id),
    });
  };

  const toggleRole = (roleId: string) => {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(roleId)
        ? f.roleIds.filter((id) => id !== roleId)
        : [...f.roleIds, roleId],
    }));
  };

  const list = users ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users2 className="h-5 w-5 text-primary" />
          Users
        </CardTitle>
        {hasManage && (
          <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ email: "", name: "", password: "", roleIds: [] }); }} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Create user form */}
        {showForm && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">New User</h3>
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
                    <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email" required placeholder="user@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Full name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} type="password" required minLength={8} placeholder="Min 8 characters" />
                </div>
                <div className="space-y-2">
                  <Label>Roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {roleOptions.map((role) => (
                      <button
                        key={role._id}
                        type="button"
                        onClick={() => toggleRole(role._id)}
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                          form.roleIds.includes(role._id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        {form.roleIds.includes(role._id) && <ShieldCheck className="h-3 w-3 mr-1" />}
                        {role.name}
                      </button>
                    ))}
                  </div>
                  {roleOptions.length === 0 && <p className="text-xs text-muted-foreground">Loading roles...</p>}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    {createMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="gap-1.5">
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* User table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Roles</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Login</th>
                {hasManage && <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((u) => (
                <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm">{u.email}</td>
                  <td className="px-4 py-3 text-sm">
                    {editingId === u._id ? (
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    ) : (
                      u.name
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === u._id ? (
                      <div className="flex flex-wrap gap-1.5">
                        {roleOptions.map((role) => (
                          <button
                            key={role._id}
                            type="button"
                            onClick={() => toggleRole(role._id)}
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                              form.roleIds.includes(role._id)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-input hover:bg-accent"
                            }`}
                          >
                            {form.roleIds.includes(role._id) && <ShieldCheck className="h-3 w-3 mr-0.5" />}
                            {role.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(u.roles || []).length > 0 ? (
                          u.roles.map((r) => (
                            <Badge key={r._id} variant="default">{r.name}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No roles</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isActive ? "success" : "destructive"}>
                      {u.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                  </td>
                  {hasManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === u._id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateMutation.mutate({ id: u._id, body: { name: form.name, roleIds: form.roleIds } })}
                              disabled={updateMutation.isPending}
                              className="gap-1 h-8"
                            >
                              <Save className="h-3.5 w-3.5" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startEditing(u)} className="gap-1 h-8" title="Edit user">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {u.isActive ? (
                              <Button size="sm" variant="ghost" onClick={() => disableMutation.mutate(u._id)} className="gap-1 h-8 text-destructive" title="Disable user">
                                <ShieldOff className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => enableMutation.mutate(u._id)} className="gap-1 h-8 text-success" title="Enable user">
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const pw = prompt("New password (min 8 chars):");
                                if (pw && pw.length >= 8) resetPwMutation.mutate({ id: u._id, newPassword: pw });
                              }}
                              className="gap-1 h-8"
                              title="Reset password"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
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
