"use client";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, CircleMarker, Tooltip } from "react-leaflet";
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

// ── Capa de pines usando Leaflet puro (no React-Leaflet) ─────────────────────
// Esto evita problemas de SSR con divIcon
function IncidentLayer({
  incidents, zoom,
}: {
  incidents: Incidencia[];
  zoom: number;
}) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Limpiar capa anterior
    if (layerRef.current) {
      layerRef.current.clearLayers();
    } else {
      layerRef.current = L.layerGroup().addTo(map);
    }

    const size = zoom <= 11 ? 20 : zoom <= 12 ? 26 : zoom <= 13 ? 32 : zoom <= 14 ? 38 : zoom <= 15 ? 44 : 52;

    incidents.forEach((inc) => {
      const lat = parseFloat(inc.lat);
      const lng = parseFloat(inc.lng);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      const color = GRAVEDAD_COLORS[inc.gravedad] ?? "#64748b";

      const icon = L.divIcon({
        className: "",
        iconSize:   [size, Math.round(size * 1.4)],
        iconAnchor: [size / 2, Math.round(size * 1.4)],
        html: `<svg xmlns="http://www.w3.org/2000/svg"
          width="${size}" height="${Math.round(size * 1.4)}"
          viewBox="0 0 40 56" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
          <path d="M20 2C10.6 2 3 9.6 3 19C3 31.5 20 54 20 54C20 54 37 31.5 37 19C37 9.6 29.4 2 20 2Z"
            fill="${color}" stroke="white" stroke-width="2.5"/>
          <circle cx="20" cy="19" r="9" fill="white" opacity="0.95"/>
          <circle cx="20" cy="19" r="5" fill="${color}"/>
        </svg>`,
      });

      const marker = L.marker([lat, lng], { icon });

      const tooltipContent = `
        <div style="font-family:'DM Sans',sans-serif;min-width:160px">
          <div style="font-weight:700;font-size:12px;color:${color};margin-bottom:4px">⚠ ${inc.tipo_novedad}</div>
          <div style="font-weight:600;font-size:11px;color:#1e293b">${inc.cliente}</div>
          <div style="font-size:10px;color:#475569;margin-top:2px">${inc.coordinador} · ${inc.localidad}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px">${inc.fecha} ${inc.hora}</div>
          ${inc.descripcion ? `<div style="font-size:10px;color:#94a3b8;font-style:italic;margin-top:4px;border-top:1px solid #e2e8f0;padding-top:4px">"${inc.descripcion}"</div>` : ""}
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -Math.round(size * 1.4) - 4],
        opacity: 0.97,
      });

      layerRef.current?.addLayer(marker);
    });

    return () => {
      layerRef.current?.clearLayers();
    };
  }, [incidents, zoom, map]);

  return null;
}

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

  const validIncidents = mapIncidents.filter(
    (i) => i.lat && i.lng && !isNaN(parseFloat(i.lat)) && !isNaN(parseFloat(i.lng))
      && parseFloat(i.lat) !== 0 && parseFloat(i.lng) !== 0
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
      <ZoomWatcher onZoom={setZoom} />

      {/* Puntos de delitos */}
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

      {/* Pines de incidencias usando Leaflet puro */}
      <IncidentLayer incidents={validIncidents} zoom={zoom} />
    </MapContainer>
  );
}
