import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { toast } from "sonner";
import { Cog, ScrollText } from "lucide-react";

interface AdminSettings {
  auditLoggingEnabled: boolean;
}

export function Settings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api<AdminSettings>("/api/admin/settings"),
  });

  const toggleMut = useMutation({
    mutationFn: (enabled: boolean) =>
      api<AdminSettings>("/api/admin/settings", {
        method: "PUT",
        body: { auditLoggingEnabled: enabled },
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(`Audit logging ${data.auditLoggingEnabled ? "enabled" : "disabled"}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const auditEnabled = settings?.auditLoggingEnabled ?? true;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="h-5 w-5 text-primary" />
            System Settings
          </CardTitle>
          <CardDescription>Manage runtime system configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Audit logging toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <ScrollText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Audit Logging</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {auditEnabled
                    ? "All user actions are being recorded to the audit log."
                    : "Audit logging is disabled. No actions are being recorded."}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleMut.mutate(!auditEnabled)}
              disabled={isLoading || toggleMut.isPending}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                auditEnabled ? "bg-primary" : "bg-input"
              }`}
              role="switch"
              aria-checked={auditEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                  auditEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Note: This toggle controls runtime audit logging only. Set the <code className="bg-muted px-1 py-0.5 rounded text-[11px]">AUDIT_LOGGING_ENABLED</code> environment variable to <code className="bg-muted px-1 py-0.5 rounded text-[11px]">false</code> to disable it on startup.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
