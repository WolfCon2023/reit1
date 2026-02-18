import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import {
  Plus, Search, Filter, ChevronLeft, ChevronRight,
  FolderKanban, ArrowRight, X,
} from "lucide-react";

interface Project {
  _id: string;
  name: string;
  description?: string;
  companyName?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectsRes {
  items: Project[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function Projects() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const hasManage = useAuthStore((s) => s.hasPermission(PERMISSIONS.PROJECTS_MANAGE));
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["projects", page, search, includeArchived],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(search && { search }),
        ...(includeArchived && { includeArchived: "true" }),
      });
      return api<ProjectsRes>(`/api/projects?${params}`);
    },
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your REIT site portfolios</p>
        </div>
        {hasManage && (
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setPage(1)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => { setIncludeArchived(e.target.checked); setPage(1); }}
            className="rounded border-input"
          />
          Show archived
        </label>
        <Button variant="secondary" size="sm" onClick={() => setPage(1)} className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Apply
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-2">Failed to load projects.</p>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <FolderKanban className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No projects yet.</p>
              {hasManage && (
                <Button onClick={() => setShowCreate(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create your first project
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Description</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Updated</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((proj) => (
                      <tr key={proj._id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-6 py-4">
                          <Link to={`/projects/${proj._id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                            {proj.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{proj.companyName || "—"}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate hidden md:table-cell">{proj.description || "—"}</td>
                        <td className="px-6 py-4">
                          {proj.isArchived ? (
                            <Badge variant="muted">Archived</Badge>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(proj.updatedAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <Link to={`/projects/${proj._id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data && data.totalCount > data.pageSize && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {data.page} of {data.totalPages} ({data.totalCount} total)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="gap-1">
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1">
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <CreateProjectDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["projects"] });
          }}
        />
      )}
    </div>
  );
}

function CreateProjectDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");

  const mutation = useMutation({
    mutationFn: (body: { name: string; description?: string; companyName?: string }) =>
      api("/api/projects", { method: "POST", body }),
    onSuccess: () => {
      toast.success("Project created successfully");
      onCreated();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name: name.trim(),
      ...(description.trim() && { description: description.trim() }),
      ...(companyName.trim() && { companyName: companyName.trim() }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-md mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold">Create Project</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="e.g. Northeast Portfolio" />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Wolf Consulting Group" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
            </div>
            {mutation.error && (
              <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} className="gap-2">
                {mutation.isPending ? "Creating..." : <><Plus className="h-4 w-4" /> Create</>}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
