import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiBlob, getBaseUrl } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PERMISSIONS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";

interface Doc {
  _id: string;
  title: string;
  filename: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt?: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface DocsRes {
  items: Doc[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

const CATEGORIES = ["Permit", "Zoning", "Lease", "Engineering", "Insurance", "Other"];

export function ProjectDocuments() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const hasWrite = useAuthStore((s) => s.hasPermission(PERMISSIONS.DOCUMENTS_WRITE));
  const hasDelete = useAuthStore((s) => s.hasPermission(PERMISSIONS.DOCUMENTS_DELETE));
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Other");
  const [expiresAt, setExpiresAt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: projectData } = useQuery({
    queryKey: ["projects", projectId, "meta"],
    queryFn: () => api<{ name: string }>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (category) params.set("category", category);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["projects", projectId, "documents", { page, category }],
    queryFn: () => api<DocsRes>(`/api/projects/${projectId}/documents?${params}`),
    enabled: !!projectId,
  });

  const uploadMut = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`${getBaseUrl()}/api/projects/${projectId}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "documents"] });
      setShowUpload(false);
      setTitle("");
      setExpiresAt("");
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  const deleteMut = useMutation({
    mutationFn: (docId: string) => api(`/api/projects/${projectId}/documents/${docId}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Document deleted"); queryClient.invalidateQueries({ queryKey: ["projects", projectId, "documents"] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !title) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    fd.append("category", uploadCategory);
    if (expiresAt) fd.append("expiresAt", expiresAt);
    uploadMut.mutate(fd);
  };

  const handleDownload = async (doc: Doc) => {
    try {
      const blob = await apiBlob(`/api/projects/${projectId}/documents/${doc._id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-primary">{projectData?.name ?? "..."}</Link>
        <span>/</span>
        <span>Documents</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        {hasWrite && (
          <Button onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? "Cancel Upload" : "Upload Document"}
          </Button>
        )}
      </div>

      {showUpload && (
        <Card>
          <CardHeader><CardTitle>Upload Document</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Expires At (optional)</label>
                  <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">File</label>
                <input ref={fileRef} type="file" required className="mt-1 block w-full text-sm" />
              </div>
              {uploadMut.error && <p className="text-sm text-destructive">{(uploadMut.error as Error).message}</p>}
              <Button type="submit" disabled={uploadMut.isPending}>
                {uploadMut.isPending ? "Uploading..." : "Upload"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
              <p className="text-destructive mb-2">Failed to load documents.</p>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No documents found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Title</th>
                      <th className="text-left p-2 font-medium">Category</th>
                      <th className="text-left p-2 font-medium">Filename</th>
                      <th className="text-left p-2 font-medium">Size</th>
                      <th className="text-left p-2 font-medium">Uploaded</th>
                      <th className="text-left p-2 font-medium">Expires</th>
                      <th className="w-32" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((doc) => (
                      <tr key={doc._id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{doc.title}</td>
                        <td className="p-2">
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">{doc.category}</span>
                        </td>
                        <td className="p-2">{doc.filename}</td>
                        <td className="p-2">{formatSize(doc.sizeBytes)}</td>
                        <td className="p-2">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                        <td className="p-2">{doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString() : "—"}</td>
                        <td className="p-2 flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>Download</Button>
                          {hasDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => { if (confirm("Delete this document?")) deleteMut.mutate(doc._id); }}
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
