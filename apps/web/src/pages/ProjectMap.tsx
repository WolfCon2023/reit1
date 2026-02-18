import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface MapSite {
  _id: string;
  siteId: string;
  siteName: string;
  address: string;
  city: string;
  stateValue: string;
  provider: string;
  structureTypeValue: string;
  structureHeight: number;
  latitude: number;
  longitude: number;
}

interface MapResponse {
  items: MapSite[];
  count: number;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;

type ColorBy = "none" | "provider" | "structureType" | "state";

const MARKER_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed",
  "#0891b2", "#db2777", "#059669", "#ea580c", "#4f46e5",
];

type ColorMap = globalThis.Map<string, string>;

function getMarkerColor(site: MapSite, colorBy: ColorBy, colorMap: ColorMap): string {
  if (colorBy === "none") return "#2563eb";
  const key = colorBy === "provider" ? site.provider :
    colorBy === "structureType" ? site.structureTypeValue : site.stateValue;
  if (!colorMap.has(key)) {
    colorMap.set(key, MARKER_COLORS[colorMap.size % MARKER_COLORS.length]);
  }
  return colorMap.get(key)!;
}

export function ProjectMap() {
  const { projectId } = useParams<{ projectId: string }>();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [structureFilter, setStructureFilter] = useState("");
  const [selectedSite, setSelectedSite] = useState<MapSite | null>(null);
  const [colorBy, setColorBy] = useState<ColorBy>("none");
  const [radiusLat, setRadiusLat] = useState("");
  const [radiusLng, setRadiusLng] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("10");
  const [radiusMode, setRadiusMode] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (stateFilter) params.set("state", stateFilter);
  if (providerFilter) params.set("provider", providerFilter);
  if (structureFilter) params.set("structureType", structureFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["project-sites-map", projectId, search, stateFilter, providerFilter, structureFilter],
    queryFn: () => api<MapResponse>(`/api/projects/${projectId}/sites/map?${params.toString()}`),
    enabled: !!projectId && !radiusMode,
  });

  const { data: radiusData } = useQuery({
    queryKey: ["project-sites-radius", projectId, radiusLat, radiusLng, radiusMiles],
    queryFn: () => api<MapResponse>(`/api/projects/${projectId}/sites/map/radius?lat=${radiusLat}&lng=${radiusLng}&radius=${radiusMiles}`),
    enabled: !!projectId && radiusMode && !!radiusLat && !!radiusLng,
  });

  const sites = radiusMode ? (radiusData?.items ?? []) : (data?.items ?? []);
  const colorMap: ColorMap = new globalThis.Map();

  const handleMarkerClick = useCallback((site: MapSite) => {
    setSelectedSite(site);
  }, []);

  if (!API_KEY) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/projects" className="hover:text-primary">Projects</Link>
          <span>/</span>
          <Link to={`/projects/${projectId}`} className="hover:text-primary">Dashboard</Link>
          <span>/</span>
          <span>Map</span>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Google Maps API key not configured.</p>
            <p className="text-sm text-muted-foreground mt-1">Set <code>VITE_GOOGLE_MAPS_API_KEY</code> environment variable and rebuild.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-primary">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-primary">Dashboard</Link>
        <span>/</span>
        <span>Map</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Site Map</h1>
        <span className="text-sm text-muted-foreground">{sites.length} sites</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search sites..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        />
        <input
          type="text"
          placeholder="State"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm w-24"
        />
        <input
          type="text"
          placeholder="Provider"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm w-32"
        />
        <input
          type="text"
          placeholder="Structure Type"
          value={structureFilter}
          onChange={(e) => setStructureFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm w-36"
        />
        <select
          value={colorBy}
          onChange={(e) => setColorBy(e.target.value as ColorBy)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="none">Default markers</option>
          <option value="provider">Color by Provider</option>
          <option value="structureType">Color by Structure Type</option>
          <option value="state">Color by State</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={radiusMode ? "default" : "outline"}
          size="sm"
          onClick={() => setRadiusMode(!radiusMode)}
        >
          {radiusMode ? "Exit Radius Search" : "Radius Search"}
        </Button>
        {radiusMode && (
          <>
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={radiusLat}
              onChange={(e) => setRadiusLat(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm w-28"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={radiusLng}
              onChange={(e) => setRadiusLng(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm w-28"
            />
            <input
              type="number"
              placeholder="Miles"
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm w-20"
            />
          </>
        )}
      </div>

      <div className="relative rounded-lg border overflow-hidden" style={{ height: "calc(100vh - 280px)" }}>
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <div className="text-sm text-muted-foreground">Loading sites...</div>
          </div>
        )}
        <APIProvider apiKey={API_KEY}>
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={DEFAULT_ZOOM}
            mapId="reit-site-map"
            gestureHandling="greedy"
            disableDefaultUI={false}
            style={{ width: "100%", height: "100%" }}
          >
            {sites.map((site) => {
              const color = getMarkerColor(site, colorBy, colorMap);
              return (
                <AdvancedMarker
                  key={site._id}
                  position={{ lat: site.latitude, lng: site.longitude }}
                  onClick={() => handleMarkerClick(site)}
                >
                  {colorBy !== "none" && (
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: color,
                        border: "2px solid white",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      }}
                    />
                  )}
                </AdvancedMarker>
              );
            })}
            {selectedSite && (
              <InfoWindow
                position={{ lat: selectedSite.latitude, lng: selectedSite.longitude }}
                onCloseClick={() => setSelectedSite(null)}
              >
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-sm">{selectedSite.siteName}</h3>
                  <p className="text-xs text-gray-600 mt-1">{selectedSite.siteId}</p>
                  <p className="text-xs text-gray-600">{selectedSite.address}, {selectedSite.city}, {selectedSite.stateValue}</p>
                  <p className="text-xs text-gray-600">Provider: {selectedSite.provider}</p>
                  <p className="text-xs text-gray-600">Type: {selectedSite.structureTypeValue}</p>
                  <p className="text-xs text-gray-600">Height: {selectedSite.structureHeight} ft</p>
                  <div className="flex gap-2 mt-2">
                    <Link
                      to={`/projects/${projectId}/sites/${selectedSite._id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View Details
                    </Link>
                    <Link
                      to={`/projects/${projectId}/sites/${selectedSite._id}/edit`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {colorBy !== "none" && colorMap.size > 0 && (
        <div className="flex flex-wrap gap-3 text-xs">
          {Array.from(colorMap.entries()).map(([key, color]: [string, string]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span>{key || "(empty)"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
