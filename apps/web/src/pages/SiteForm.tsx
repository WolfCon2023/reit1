import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { US_STATES, STRUCTURE_TYPES, PROVIDER_RESIDENT_OPTIONS } from "@/lib/constants";

interface SitePayload {
  siteId: string;
  siteName: string;
  areaName?: string;
  districtName?: string;
  provider: string;
  providerResidentMode: "preset" | "manual";
  providerResidentValue: string;
  address: string;
  city: string;
  county?: string;
  stateMode: "preset" | "manual";
  stateValue: string;
  zipCode: string;
  cmaId?: string;
  cmaName?: string;
  structureTypeMode: "preset" | "manual";
  structureTypeValue: string;
  siteType?: string;
  ge?: string;
  structureHeight: number;
  latitude: number;
  longitude: number;
  siteAltId?: string;
}

const emptyForm: SitePayload = {
  siteId: "",
  siteName: "",
  provider: "",
  providerResidentMode: "preset",
  providerResidentValue: "No",
  address: "",
  city: "",
  stateMode: "preset",
  stateValue: "",
  zipCode: "",
  structureTypeMode: "preset",
  structureTypeValue: "unclassified",
  structureHeight: 0,
  latitude: 0,
  longitude: 0,
};

export function SiteForm() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SitePayload>(emptyForm);
  const [zipSearch, setZipSearch] = useState("");

  const { data: site } = useQuery({
    queryKey: ["site", id],
    queryFn: () => api<SitePayload & { latitudeNad83?: number; longitudeNad83?: number }>(`/api/sites/${id}`),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (site) {
      setForm({
        ...emptyForm,
        siteId: site.siteId,
        siteName: site.siteName,
        areaName: site.areaName,
        districtName: site.districtName,
        provider: site.provider,
        providerResidentMode: site.providerResidentMode,
        providerResidentValue: site.providerResidentValue,
        address: site.address,
        city: site.city,
        county: site.county,
        stateMode: site.stateMode,
        stateValue: site.stateValue,
        zipCode: site.zipCode,
        cmaId: site.cmaId,
        cmaName: site.cmaName,
        structureTypeMode: site.structureTypeMode,
        structureTypeValue: site.structureTypeValue,
        siteType: site.siteType,
        ge: site.ge,
        structureHeight: site.structureHeight ?? 0,
        latitude: site.latitude,
        longitude: site.longitude,
        siteAltId: site.siteAltId,
      });
    }
  }, [site]);

  const zipLookup = useQuery({
    queryKey: ["zip", zipSearch],
    queryFn: () => api<{ city?: string; state?: string; county?: string }>(`/api/geo/zip/${zipSearch}`),
    enabled: zipSearch.length >= 5,
  });

  useEffect(() => {
    const d = zipLookup.data;
    if (d?.city || d?.state) {
      setForm((f) => ({
        ...f,
        ...(d.city && { city: d.city }),
        ...(d.state && { stateValue: d.state }),
      }));
    }
  }, [zipLookup.data]);

  const update = (patch: Partial<SitePayload>) => setForm((f) => ({ ...f, ...patch }));

  const createMutation = useMutation({
    mutationFn: (body: SitePayload) => api(`/api/sites`, { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      navigate("/sites");
    },
  });
  const updateMutation = useMutation({
    mutationFn: (body: Partial<SitePayload>) => api(`/api/sites/${id}`, { method: "PUT", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["site", id] });
      navigate(`/sites/${id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) createMutation.mutate(form);
    else updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{isNew ? "New Site" : "Edit Site"}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Site information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Site ID *</Label>
                <Input value={form.siteId} onChange={(e) => update({ siteId: e.target.value })} required disabled={!isNew} />
              </div>
              <div className="space-y-2">
                <Label>Site Name *</Label>
                <Input value={form.siteName} onChange={(e) => update({ siteName: e.target.value })} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provider *</Label>
                <Input value={form.provider} onChange={(e) => update({ provider: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Provider Resident *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.providerResidentValue}
                  onChange={(e) => update({ providerResidentValue: e.target.value })}
                >
                  {PROVIDER_RESIDENT_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input value={form.address} onChange={(e) => update({ address: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ZIP Code *</Label>
                <Input
                  value={form.zipCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    update({ zipCode: v });
                    if (v.replace(/\D/g, "").length >= 5) setZipSearch(v.replace(/\D/g, "").slice(0, 5));
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>City *</Label>
                <Input value={form.city} onChange={(e) => update({ city: e.target.value })} required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>State *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.stateValue}
                  onChange={(e) => update({ stateValue: e.target.value })}
                >
                  <option value="">Select</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Structure Type *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.structureTypeValue}
                  onChange={(e) => update({ structureTypeValue: e.target.value })}
                >
                  {STRUCTURE_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Latitude *</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude || ""}
                  onChange={(e) => update({ latitude: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude *</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude || ""}
                  onChange={(e) => update({ longitude: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Structure Height</Label>
              <Input
                type="number"
                min={0}
                value={form.structureHeight ?? ""}
                onChange={(e) => update({ structureHeight: Math.max(0, parseFloat(e.target.value) || 0) })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {isNew ? "Create" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
