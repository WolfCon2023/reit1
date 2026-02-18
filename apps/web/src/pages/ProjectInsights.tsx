import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface DuplicateGroup {
  key: string;
  count: number;
  sites: { _id: string; siteId: string; siteName: string; address: string; city: string; stateValue: string }[];
}

interface MissingField {
  field: string;
  count: number;
  samples: { siteId: string; siteName: string }[];
}

interface OutliersData {
  heightStats: { avg: number; stdDev: number; threshold: number };
  heightOutliers: { _id: string; siteId: string; siteName: string; structureHeight: number }[];
  zeroHeight: { _id: string; siteId: string; siteName: string; structureHeight: number }[];
  coordOutliers: { _id: string; siteId: string; siteName: string; latitude: number; longitude: number }[];
}

type Tab = "duplicates" | "missing" | "outliers";

export function ProjectInsights() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tab, setTab] = useState<Tab>("duplicates");

  const { data: projectData } = useQuery({
    queryKey: ["projects", projectId, "meta"],
    queryFn: () => api<{ name: string }>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: dupes, isLoading: loadingDupes } = useQuery({
    queryKey: ["projects", projectId, "insights", "duplicates"],
    queryFn: () => api<{ groups: DuplicateGroup[]; totalGroups: number }>(`/api/projects/${projectId}/insights/duplicates`),
    enabled: !!projectId && tab === "duplicates",
  });

  const { data: missing, isLoading: loadingMissing } = useQuery({
    queryKey: ["projects", projectId, "insights", "missing-fields"],
    queryFn: () => api<{ fields: MissingField[] }>(`/api/projects/${projectId}/insights/missing-fields`),
    enabled: !!projectId && tab === "missing",
  });

  const { data: outliers, isLoading: loadingOutliers } = useQuery({
    queryKey: ["projects", projectId, "insights", "outliers"],
    queryFn: () => api<OutliersData>(`/api/projects/${projectId}/insights/outliers`),
    enabled: !!projectId && tab === "outliers",
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "duplicates", label: "Duplicates" },
    { key: "missing", label: "Missing Fields" },
    { key: "outliers", label: "Outliers" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-primary">{projectData?.name ?? "..."}</Link>
        <span>/</span>
        <span>Insights</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Data Quality Insights</h1>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "duplicates" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Potential Duplicates {dupes ? `(${dupes.totalGroups} groups)` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDupes ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded bg-muted animate-pulse" />)}</div>
            ) : !dupes?.groups.length ? (
              <p className="text-muted-foreground py-4">No duplicate groups found.</p>
            ) : (
              <div className="space-y-4">
                {dupes.groups.map((group, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">{group.key} ({group.count} sites)</p>
                    <div className="space-y-1">
                      {group.sites.map((s) => (
                        <div key={s._id} className="flex items-center justify-between text-sm">
                          <span>{s.siteId} - {s.siteName}</span>
                          <Link to={`/projects/${projectId}/sites/${s._id}/edit`} className="text-primary text-xs hover:underline">Edit</Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "missing" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Sites with Missing Fields</CardTitle></CardHeader>
          <CardContent>
            {loadingMissing ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}</div>
            ) : !missing?.fields.length ? (
              <p className="text-muted-foreground py-4">No missing fields detected.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Field</th>
                      <th className="text-left p-2 font-medium">Missing Count</th>
                      <th className="text-left p-2 font-medium">Sample Sites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missing.fields.map((f) => (
                      <tr key={f.field} className="border-b">
                        <td className="p-2 font-mono text-xs">{f.field}</td>
                        <td className="p-2">{f.count}</td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {f.samples.map((s) => s.siteId).join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "outliers" && (
        <div className="space-y-4">
          {loadingOutliers ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded bg-muted animate-pulse" />)}</div>
          ) : (
            <>
              {outliers && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Structure Height Statistics</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Average</span><br /><span className="font-medium">{outliers.heightStats.avg} ft</span></div>
                      <div><span className="text-muted-foreground">Std Dev</span><br /><span className="font-medium">{outliers.heightStats.stdDev} ft</span></div>
                      <div><span className="text-muted-foreground">Outlier Threshold</span><br /><span className="font-medium">&gt; {outliers.heightStats.threshold} ft</span></div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {outliers?.heightOutliers.length ? (
                <Card>
                  <CardHeader><CardTitle className="text-base">Height Outliers ({outliers.heightOutliers.length})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {outliers.heightOutliers.map((s) => (
                        <div key={s._id} className="flex items-center justify-between text-sm">
                          <span>{s.siteId} - {s.siteName} ({s.structureHeight} ft)</span>
                          <Link to={`/projects/${projectId}/sites/${s._id}/edit`} className="text-primary text-xs hover:underline">Edit</Link>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {outliers?.zeroHeight.length ? (
                <Card>
                  <CardHeader><CardTitle className="text-base">Zero Height ({outliers.zeroHeight.length})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {outliers.zeroHeight.map((s) => (
                        <div key={s._id} className="flex items-center justify-between text-sm">
                          <span>{s.siteId} - {s.siteName}</span>
                          <Link to={`/projects/${projectId}/sites/${s._id}/edit`} className="text-primary text-xs hover:underline">Edit</Link>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {outliers?.coordOutliers.length ? (
                <Card>
                  <CardHeader><CardTitle className="text-base">Coordinate Outliers ({outliers.coordOutliers.length})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {outliers.coordOutliers.map((s) => (
                        <div key={s._id} className="flex items-center justify-between text-sm">
                          <span>{s.siteId} - {s.siteName} ({s.latitude}, {s.longitude})</span>
                          <Link to={`/projects/${projectId}/sites/${s._id}/edit`} className="text-primary text-xs hover:underline">Edit</Link>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {outliers && !outliers.heightOutliers.length && !outliers.zeroHeight.length && !outliers.coordOutliers.length && (
                <p className="text-muted-foreground py-4">No outliers detected.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
