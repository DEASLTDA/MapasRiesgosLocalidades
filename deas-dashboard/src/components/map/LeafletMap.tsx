"use client";
import { useEffect, useState } from "react";
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

const GRAVEDAD_EMOJI: Record<string, string> = {
  crítica: "🔴",
  alta:    "🟠",
  media:   "🟡",
  baja:    "🟢",
};

// ── Crea el divIcon PIN después de que Leaflet está disponible en el cliente ──
function makePinIcon(color: string, size: number) {
  const s = size;
  return L.divIcon({
    className: "",
    iconSize:   [s, s * 1.4],
    iconAnchor: [s / 2, s * 1.4],
    popupAnchor:[0, -(s * 1.4)],
    html: `
      <svg xmlns="http://www.w3.org/2000/svg"
        width="${s}" height="${s * 1.4}" viewBox="0 0 40 56">
        <!-- Sombra -->
        <ellipse cx="20" cy="54" rx="8" ry="3"
          fill="rgba(0,0,0,0.25)"/>
        <!-- Cuerpo del pin -->
        <path d="M20 2 C10 2 3 9 3 18 C3 30 20 54 20 54 C20 54 37 30 37 18 C37 9 30 2 20 2Z"
          fill="${color}" stroke="white" stroke-width="2.5"/>
        <!-- Círculo interior blanco -->
        <circle cx="20" cy="18" r="8" fill="white" opacity="0.9"/>
        <!-- Punto central del color -->
        <circle cx="20" cy="18" r="4" fill="${color}"/>
      </svg>
    `,
  });
}

// ── Zoom → tamaño del pin ────────────────────────────────────────────────────
function pinSize(zoom: number): number {
  if (zoom <= 11) return 18;
  if (zoom <= 12) return 22;
  if (zoom <= 13) return 26;
  if (zoom <= 14) return 32;
  if (zoom <= 15) return 38;
  return 44;
}

// ── Escucha cambios de zoom ──────────────────────────────────────────────────
function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    onZoom(map.getZoom());
    const handler = () => onZoom(map.getZoom());
    map.on("zoomend", handler);
    return () => { map.off("zoomend", handler); };
  }, [map, onZoom]);
  return null;
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
  const [zoom, setZoom] = useState(12);

  const visiblePoints = data?.points.filter((p) =>
    selectedCrime ? p.type === selectedCrime : true
  ) ?? [];

  const incidentMarkers = mapIncidents.filter(
    (i) =>
      i.lat && i.lng &&
      !isNaN(parseFloat(i.lat)) &&
      !isNaN(parseFloat(i.lng)) &&
      parseFloat(i.lat) !== 0 &&
      parseFloat(i.lng) !== 0
  );

  const size = pinSize(zoom);

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
      <ZoomWatcher onZoom={setZoom} />

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
              color:       isFiltered ? cfg.dot : "transparent",
              weight:      isFiltered ? 1.5 : 0,
              fillColor:   cfg.dot,
              fillOpacity: isFiltered
                ? 0.75 + p.intensity * 0.2
                : 0.45 + p.intensity * 0.3,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>{p.type}</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>{p.localidad}</div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* ── Pines de incidencias registradas ── */}
      {incidentMarkers.map((inc) => {
        const color = GRAVEDAD_COLORS[inc.gravedad] ?? "#64748b";
        const emoji = GRAVEDAD_EMOJI[inc.gravedad] ?? "📍";
        const icon  = makePinIcon(color, size);
        return (
          <Marker
            key={`pin-${inc.id}-${size}`}
            position={[parseFloat(inc.lat), parseFloat(inc.lng)]}
            icon={icon}
          >
            <Tooltip direction="top" offset={[0, -(size * 1.4 + 4)]} opacity={0.97}>
              <div style={{ fontSize: "12px", fontWeight: 700, color }}>
                {emoji} {inc.tipo_novedad}
              </div>
              <div style={{ fontSize: "11px", color: "#1e293b", marginTop: 2 }}>
                <strong>{inc.cliente}</strong>
              </div>
              <div style={{ fontSize: "10px", color: "#475569" }}>
                {inc.coordinador} · {inc.localidad}
              </div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>
                {inc.fecha} {inc.hora}
              </div>
              {inc.descripcion && (
                <div style={{
                  fontSize: "10px", color: "#94a3b8",
                  fontStyle: "italic", marginTop: 2
                }}>
                  &ldquo;{inc.descripcion}&rdquo;
                </div>
              )}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
