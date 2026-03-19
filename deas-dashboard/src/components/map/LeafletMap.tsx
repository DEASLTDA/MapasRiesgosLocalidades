"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap, CircleMarker, Tooltip } from "react-leaflet";
import type { LocalidadData } from "@/types";
import { getCrimeColor } from "@/components/charts/CrimeBarChart";
import L from "leaflet";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapController({ data }: { data: LocalidadData | null }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    map.flyTo(data.center, data.zoom, { duration: 1.4, easeLinearity: 0.4 });
  }, [data, map]);
  return null;
}

interface Props {
  data: LocalidadData | null;
  selectedCrime: string | null;
}

export default function LeafletMap({ data, selectedCrime }: Props) {
  const initial: [number, number] = [4.6510, -74.0560];

  const visiblePoints = data?.points.filter((p) =>
    selectedCrime ? p.type === selectedCrime : true
  ) ?? [];

  return (
    <MapContainer
      center={initial}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <MapController data={data} />

      {visiblePoints.map((p, i) => {
        const cfg = getCrimeColor(p.type);
        const isFiltered = !!selectedCrime;
        return (
          <CircleMarker
            key={`${selectedCrime ?? "all"}-${i}`}
            center={[p.lat, p.lng]}
            radius={isFiltered ? p.intensity * 16 : p.intensity * 13}
            pathOptions={{
              color: isFiltered ? cfg.dot : "transparent",
              weight: isFiltered ? 1.5 : 0,
              fillColor: cfg.dot,
              fillOpacity: isFiltered ? 0.75 + p.intensity * 0.2 : 0.45 + p.intensity * 0.3,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>{p.type}</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>{p.localidad}</div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
