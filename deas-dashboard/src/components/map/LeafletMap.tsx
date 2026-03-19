"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap, CircleMarker, Tooltip, Marker } from "react-leaflet";
import type { LocalidadData } from "@/types";
import type { Incidencia } from "@/components/bitacora/IncidenciasModule";
import { getCrimeColor } from "@/components/charts/CrimeBarChart";
import L from "leaflet";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const GRAVEDAD_COLORS: Record<string, string> = {
  crítica: "#dc2626",
  alta:    "#ea580c",
  media:   "#d97706",
  baja:    "#16a34a",
};

function createIncidentIcon(gravedad: string) {
  const color = GRAVEDAD_COLORS[gravedad] ?? "#64748b";
  return L.divIcon({
    html: `
      <div style="
        width:28px;height:28px;
        background:${color};
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
      "></div>
    `,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

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
  mapIncidents: Incidencia[];
}

export default function LeafletMap({ data, selectedCrime, mapIncidents }: Props) {
  const initial: [number, number] = [4.6510, -74.0560];

  const visiblePoints = data?.points.filter((p) =>
    selectedCrime ? p.type === selectedCrime : true
  ) ?? [];

  // Incidencias con coordenadas válidas
  const incidentMarkers = mapIncidents.filter(
    (i) => i.lat && i.lng && !isNaN(parseFloat(i.lat)) && !isNaN(parseFloat(i.lng))
  );

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

      {/* ── Puntos de delitos ── */}
      {visiblePoints.map((p, i) => {
        const cfg = getCrimeColor(p.type);
        const isFiltered = !!selectedCrime;
        return (
          <CircleMarker
            key={`crime-${selectedCrime ?? "all"}-${i}`}
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

      {/* ── Íconos de incidencias registradas ── */}
      {incidentMarkers.map((inc) => (
        <Marker
          key={inc.id}
          position={[parseFloat(inc.lat), parseFloat(inc.lng)]}
          icon={createIncidentIcon(inc.gravedad)}
        >
          <Tooltip direction="top" offset={[0, -28]} opacity={0.97} permanent={false}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: GRAVEDAD_COLORS[inc.gravedad] }}>
              {inc.tipo_novedad}
            </div>
            <div style={{ fontSize: "11px", color: "#334155" }}>{inc.cliente}</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>
              {inc.coordinador} · {inc.fecha} {inc.hora}
            </div>
            {inc.descripcion && (
              <div style={{ fontSize: "10px", color: "#94a3b8", fontStyle: "italic", marginTop: 2 }}>
                "{inc.descripcion}"
              </div>
            )}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
