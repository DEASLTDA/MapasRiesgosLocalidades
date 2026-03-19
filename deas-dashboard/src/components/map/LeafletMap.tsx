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

// ── Capa de pines usando Leaflet nativo ──────────────────────────────────────
function IncidentLayer({ incidents, zoom }: { incidents: Incidencia[]; zoom: number }) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!groupRef.current) {
      groupRef.current = L.layerGroup().addTo(map);
    } else {
      groupRef.current.clearLayers();
    }

    const size = zoom <= 11 ? 22 : zoom <= 12 ? 28 : zoom <= 13 ? 34 : zoom <= 14 ? 40 : zoom <= 15 ? 46 : 54;
    const h = Math.round(size * 1.35);

    incidents.forEach((inc) => {
      const lat = parseFloat(String(inc.lat).replace(",", "."));
      const lng = parseFloat(String(inc.lng).replace(",", "."));
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) < 0.001) return;

      const color = GRAVEDAD_COLORS[inc.gravedad] ?? "#64748b";

      const svgPin = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 40 54">
        <defs>
          <filter id="shadow${inc.id.slice(-4)}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
          </filter>
        </defs>
        <path d="M20 1C10.6 1 3 8.6 3 18C3 30 20 53 20 53C20 53 37 30 37 18C37 8.6 29.4 1 20 1Z"
          fill="${color}" stroke="white" stroke-width="2"
          filter="url(#shadow${inc.id.slice(-4)})"/>
        <circle cx="20" cy="18" r="8" fill="white" opacity="0.95"/>
        <circle cx="20" cy="18" r="4.5" fill="${color}"/>
      </svg>`;

      const icon = L.divIcon({
        className: "",
        iconSize:   [size, h],
        iconAnchor: [size / 2, h],
        html: svgPin,
      });

      const tooltipHtml = `
        <div style="font-family:sans-serif;min-width:170px;max-width:220px">
          <div style="font-weight:700;font-size:12px;color:${color};margin-bottom:3px">⚠ ${inc.tipo_novedad || "—"}</div>
          <div style="font-weight:600;font-size:11px;color:#1e293b">${inc.cliente || "—"}</div>
          ${inc.direccion ? `<div style="font-size:10px;color:#475569;margin-top:1px">📍 ${inc.direccion}</div>` : ""}
          <div style="font-size:10px;color:#64748b;margin-top:2px">${inc.coordinador || ""} · ${inc.localidad || ""}</div>
          <div style="font-size:10px;color:#94a3b8">${inc.fecha || ""} ${inc.hora || ""}</div>
          ${inc.descripcion ? `<div style="font-size:10px;color:#64748b;margin-top:4px;padding-top:4px;border-top:1px solid #e2e8f0;font-style:italic">"${inc.descripcion}"</div>` : ""}
        </div>`;

      const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 });
      marker.bindTooltip(tooltipHtml, {
        direction: "top",
        offset: [0, -(h + 4)],
        opacity: 1,
        className: "leaflet-incident-tooltip",
      });
      groupRef.current?.addLayer(marker);
    });
  }, [incidents, zoom, map]);

  useEffect(() => {
    return () => { groupRef.current?.clearLayers(); };
  }, []);

  return null;
}

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    onZoom(map.getZoom());
    const h = () => onZoom(map.getZoom());
    map.on("zoomend", h);
    return () => { map.off("zoomend", h); };
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
  hideRisks: boolean;
}

export default function LeafletMap({ data, selectedCrime, mapIncidents, hideRisks }: Props) {
  const initial: [number, number] = [4.6510, -74.0560];
  const [zoom, setZoom] = useState(12);

  const visiblePoints = (!hideRisks && data?.points.filter((p) =>
    selectedCrime ? p.type === selectedCrime : true
  )) || [];

  const validIncidents = mapIncidents.filter((i) => {
    const lat = parseFloat(String(i.lat).replace(",", "."));
    const lng = parseFloat(String(i.lng).replace(",", "."));
    return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) > 0.001 && Math.abs(lng) > 0.001;
  });

  return (
    <MapContainer center={initial} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
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

      {/* Pines de incidencias */}
      <IncidentLayer incidents={validIncidents} zoom={zoom} />
    </MapContainer>
  );
}
