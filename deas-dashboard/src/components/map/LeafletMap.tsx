"use client";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LocalidadData } from "@/types";
import type { Incidencia } from "@/components/bitacora/IncidenciasModule";
import { BOGOTA_LOCALIDADES } from "@/lib/bogotaGeoJson";
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

// Localidades DEAS con centros exactos y radios de influencia
const DEAS_LOCALIDADES = [
  { name: "Usaquén",        lat: 4.7050, lng: -74.0317, radius: 4500 },
  { name: "Chapinero",      lat: 4.6490, lng: -74.0630, radius: 3200 },
  { name: "Santa Fe",       lat: 4.6100, lng: -74.0700, radius: 2800 },
  { name: "Suba",           lat: 4.7380, lng: -74.0850, radius: 5500 },
  { name: "Barrios Unidos", lat: 4.6680, lng: -74.0820, radius: 2500 },
  { name: "Teusaquillo",    lat: 4.6440, lng: -74.0920, radius: 2600 },
];

// ── Capa de círculos difuminados usando Canvas ────────────────────────────────
function HeatZoneLayer({
  selectedLocalidad,
  hideRisks,
  siedcoData,
}: {
  selectedLocalidad: string;
  hideRisks: boolean;
  siedcoData: Record<string, number>;
}) {
  const map = useMap();
  const canvasRef = useRef<L.Canvas | null>(null);
  const layersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    // Limpiar capas anteriores
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
    if (hideRisks) return;

    const hasSelection = selectedLocalidad !== "";

    // Calcular max para normalizar
    const maxTotal = Math.max(
      ...DEAS_LOCALIDADES.map((loc) => siedcoData[loc.name] || loc.radius * 2)
    );

    DEAS_LOCALIDADES.forEach((loc) => {
      const isSelected = loc.name === selectedLocalidad;
      const total      = siedcoData[loc.name] || 0;
      const ratio      = total > 0 ? total / maxTotal : 0.3;

      // Color según intensidad
      let color = "#16a34a";
      if (ratio > 0.70)      color = "#dc2626";
      else if (ratio > 0.45) color = "#ea580c";
      else if (ratio > 0.22) color = "#d97706";

      if (hasSelection && !isSelected) {
        // Otras localidades: muy tenues
        // Círculo exterior muy difuminado
        const ghost = L.circleMarker([loc.lat, loc.lng], {
          radius: 60,
          fillColor: "#94a3b8",
          fillOpacity: 0.06,
          color: "transparent",
          weight: 0,
        }).addTo(map);
        layersRef.current.push(ghost);
        return;
      }

      const opacity = isSelected ? 0.90 : 0.55;
      const radiusPx = isSelected ? 75 : 55;

      // 4 círculos concéntricos que crean efecto degradado
      const layers = [
        { r: radiusPx,        o: opacity * 0.12 },
        { r: radiusPx * 0.75, o: opacity * 0.22 },
        { r: radiusPx * 0.50, o: opacity * 0.40 },
        { r: radiusPx * 0.28, o: opacity * 0.75 },
      ];

      layers.forEach(({ r, o }) => {
        const circle = L.circleMarker([loc.lat, loc.lng], {
          radius: r,
          fillColor: color,
          fillOpacity: o,
          color: "transparent",
          weight: 0,
        }).addTo(map);

        // Tooltip solo en el círculo central
        if (r === radiusPx * 0.28) {
          const totalStr = total > 0 ? total.toLocaleString("es-CO") : "Sin datos";
          circle.bindTooltip(
            `<div style="font-family:sans-serif;min-width:170px">
              <div style="font-weight:700;font-size:13px;color:#112288;margin-bottom:4px">${loc.name}</div>
              <div style="font-size:11px;color:#334155;line-height:1.8">
                Total delitos registrados: <b>${totalStr}</b>
              </div>
              <div style="font-size:9px;color:#94a3b8;margin-top:3px">
                SIEDCO · Sec. Distrital de Seguridad · dic/2025
              </div>
            </div>`,
            { direction: "top", sticky: false, opacity: 0.97 }
          );
        }

        layersRef.current.push(circle);
      });

      // Borde sutil en localidad seleccionada
      if (isSelected) {
        const border = L.circleMarker([loc.lat, loc.lng], {
          radius: radiusPx,
          fillColor: "transparent",
          fillOpacity: 0,
          color,
          weight: 2,
          opacity: 0.4,
        }).addTo(map);
        layersRef.current.push(border);
      }
    });

    return () => {
      layersRef.current.forEach((l) => map.removeLayer(l));
      layersRef.current = [];
    };
  }, [map, selectedLocalidad, hideRisks, siedcoData]);

  return null;
}

// ── FlyTo ─────────────────────────────────────────────────────────────────────
function MapController({ data }: { data: LocalidadData | null }) {
  const map = useMap();
  useEffect(() => {
    if (!data) {
      map.flyTo([4.6800, -74.0750], 12, { duration: 1.2 });
    } else {
      map.flyTo(data.center, data.zoom, { duration: 1.2, easeLinearity: 0.4 });
    }
  }, [data, map]);
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

// ── Pines de incidencias ──────────────────────────────────────────────────────
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
    const h    = Math.round(size * 1.35);

    incidents.forEach((inc) => {
      const lat = parseFloat(String(inc.lat).replace(",", "."));
      const lng = parseFloat(String(inc.lng).replace(",", "."));
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) < 0.001) return;

      const color = GRAVEDAD_COLORS[inc.gravedad] ?? "#64748b";
      const icon  = L.divIcon({
        className: "",
        iconSize:   [size, h],
        iconAnchor: [size / 2, h],
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}"
          viewBox="0 0 40 54" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
          <path d="M20 1C10.6 1 3 8.6 3 18C3 30 20 53 20 53C20 53 37 30 37 18C37 8.6 29.4 1 20 1Z"
            fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="20" cy="18" r="9" fill="white" opacity="0.95"/>
          <circle cx="20" cy="18" r="5" fill="${color}"/>
        </svg>`,
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 });
      marker.bindTooltip(
        `<div style="font-family:sans-serif;min-width:170px;max-width:220px">
          <div style="font-weight:700;font-size:12px;color:${color}">⚠ ${inc.tipo_novedad || "—"}</div>
          <div style="font-weight:600;font-size:11px;color:#1e293b;margin-top:2px">${inc.cliente || "—"}</div>
          ${inc.direccion ? `<div style="font-size:10px;color:#475569">📍 ${inc.direccion}</div>` : ""}
          <div style="font-size:10px;color:#64748b">${inc.coordinador || ""} · ${inc.localidad || ""}</div>
          <div style="font-size:10px;color:#94a3b8">${inc.fecha || ""} ${inc.hora || ""}</div>
          ${inc.descripcion ? `<div style="font-size:10px;font-style:italic;color:#64748b;margin-top:3px;border-top:1px solid #e2e8f0;padding-top:3px">"${inc.descripcion}"</div>` : ""}
        </div>`,
        { direction: "top", offset: [0, -(h + 4)], opacity: 1 }
      );
      groupRef.current?.addLayer(marker);
    });
  }, [incidents, zoom, map]);

  useEffect(() => () => { groupRef.current?.clearLayers(); }, []);
  return null;
}

// ── Principal ─────────────────────────────────────────────────────────────────
interface Props {
  data: LocalidadData | null;
  selectedCrime: string | null;
  mapIncidents: Incidencia[];
  hideRisks: boolean;
  siedcoData?: Record<string, number>;
}

export default function LeafletMap({ data, mapIncidents, hideRisks, siedcoData = {} }: Props) {
  const [zoom, setZoom] = useState(12);

  const validIncidents = mapIncidents.filter((i) => {
    const lat = parseFloat(String(i.lat).replace(",", "."));
    const lng = parseFloat(String(i.lng).replace(",", "."));
    return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) > 0.001;
  });

  return (
    <MapContainer
      center={[4.6800, -74.0750]}
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
      <HeatZoneLayer
        selectedLocalidad={data?.name ?? ""}
        hideRisks={hideRisks}
        siedcoData={siedcoData}
      />
      <IncidentLayer incidents={validIncidents} zoom={zoom} />
    </MapContainer>
  );
}
