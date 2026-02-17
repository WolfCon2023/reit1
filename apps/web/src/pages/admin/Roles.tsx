import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface RoleRow {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
}

export function Roles() {
  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => api<RoleRow[]>("/api/admin/roles"),
  });

  const list = roles ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">System roles cannot be deleted. Permissions are managed on the backend.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {list.map((r) => (
            <div key={r._id} className="rounded-lg border p-4">
              <div className="font-medium flex items-center gap-2">
                {r.name}
                {r.isSystem && <span className="text-xs bg-muted px-2 py-0.5 rounded">System</span>}
              </div>
              {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {r.permissions?.slice(0, 15).map((p) => (
                  <span key={p} className="text-xs bg-secondary px-2 py-0.5 rounded">{p}</span>
                ))}
                {(r.permissions?.length ?? 0) > 15 && <span className="text-xs text-muted-foreground">+{r.permissions!.length - 15} more</span>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
