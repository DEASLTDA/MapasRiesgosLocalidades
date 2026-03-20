"use client";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LocalidadData } from "@/types";
import type { Incidencia } from "@/components/bitacora/IncidenciasModule";
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

// Localidades DEAS con centros y datos de distribución de delitos
const DEAS_ZONAS = [
  { name: "Usaquén",        lat: 4.7050, lng: -74.0317, radius: 4500,
    crimes: { personas: 0.42, residencias: 0.22, autos: 0.18, lesiones: 0.12, violencia: 0.06 } },
  { name: "Chapinero",      lat: 4.6490, lng: -74.0630, radius: 3200,
    crimes: { personas: 0.45, residencias: 0.25, autos: 0.15, lesiones: 0.10, violencia: 0.05 } },
  { name: "Santa Fe",       lat: 4.6100, lng: -74.0700, radius: 2800,
    crimes: { personas: 0.40, residencias: 0.20, autos: 0.10, lesiones: 0.18, violencia: 0.12 } },
  { name: "Suba",           lat: 4.7380, lng: -74.0850, radius: 5500,
    crimes: { personas: 0.38, residencias: 0.28, autos: 0.14, lesiones: 0.12, violencia: 0.08 } },
  { name: "Barrios Unidos", lat: 4.6680, lng: -74.0820, radius: 2500,
    crimes: { personas: 0.35, residencias: 0.26, autos: 0.22, lesiones: 0.11, violencia: 0.06 } },
  { name: "Teusaquillo",    lat: 4.6440, lng: -74.0920, radius: 2600,
    crimes: { personas: 0.38, residencias: 0.25, autos: 0.20, lesiones: 0.10, violencia: 0.07 } },
];

// Colores por tipo de delito (igual que el gráfico de barras)
const CRIME_COLORS = {
  personas:    "#e11d48",
  residencias: "#7c3aed",
  autos:       "#0284c7",
  lesiones:    "#d97706",
  violencia:   "#ea580c",
};

// Genera puntos de heatmap dispersos alrededor de un centro
function generateHeatPoints(
  lat: number, lng: number,
  radiusM: number,
  count: number,
  seed: number
): [number, number, number][] {
  let s = seed;
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const latDeg = radiusM / 111320;
  const lngDeg = radiusM / (111320 * Math.cos(lat * Math.PI / 180));
  return Array.from({ length: count }, () => {
    const angle = rng() * 2 * Math.PI;
    // Distribución gaussiana: más puntos en el centro
    const r = Math.sqrt(-2 * Math.log(rng() + 0.0001)) * 0.35;
    const dist = Math.min(r, 1.0);
    return [
      lat + Math.sin(angle) * dist * latDeg,
      lng + Math.cos(angle) * dist * lngDeg,
      0.3 + rng() * 0.7,
    ] as [number, number, number];
  });
}

// ── Heatmap Layer ─────────────────────────────────────────────────────────────
function HeatLayer({
  selectedLocalidad,
  hideRisks,
  selectedCrime,
  siedcoData,
}: {
  selectedLocalidad: string;
  hideRisks: boolean;
  selectedCrime: string | null;
  siedcoData: Record<string, number>;
}) {
  const map = useMap();
  const layersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
    if (hideRisks) return;

    const hasSelection   = selectedLocalidad !== "";
    const hasCrimeFilter = selectedCrime !== null;

    // Calcular totales para normalizar
    const maxTotal = Math.max(
      ...DEAS_ZONAS.map((z) => siedcoData[z.name] || 5000),
      1
    );

    DEAS_ZONAS.forEach((zona) => {
      const isSelected = zona.name === selectedLocalidad;
      const total      = siedcoData[zona.name] || 5000;
      const ratio      = total / maxTotal;
      const pointCount = Math.round(60 + ratio * 140);
      const seed       = zona.name.charCodeAt(0) * 31 + zona.name.charCodeAt(1);

      if (hasCrimeFilter) {
        // Modo filtro por delito: color del delito seleccionado
        const crimeKey = selectedCrime?.toLowerCase().includes("personas")    ? "personas"
          : selectedCrime?.toLowerCase().includes("residencias") ? "residencias"
          : selectedCrime?.toLowerCase().includes("auto")        ? "autos"
          : selectedCrime?.toLowerCase().includes("lesiones")    ? "lesiones"
          : selectedCrime?.toLowerCase().includes("violencia")   ? "violencia"
          : "personas";

        const crimeRatio = zona.crimes[crimeKey as keyof typeof zona.crimes] || 0.2;
        const color      = CRIME_COLORS[crimeKey as keyof typeof CRIME_COLORS];
        const opacity    = (hasSelection && !isSelected) ? 0.08 : crimeRatio * 0.9;

        drawGradientCircle(map, zona.lat, zona.lng, zona.radius, color, opacity, layersRef);

      } else {
        // Modo normal: colores mezclados por tipo de delito
        if (hasSelection && !isSelected) {
          // Localidades no seleccionadas: muy tenues
          drawGradientCircle(map, zona.lat, zona.lng, zona.radius, "#94a3b8", 0.08, layersRef);
          return;
        }

        const baseOpacity = isSelected ? 0.85 : 0.60;

        // Dibujar capas por tipo de delito (de menor a mayor)
        // Cada tipo tiene su color y su área proporcional
        const crimeEntries = Object.entries(zona.crimes)
          .sort(([, a], [, b]) => a - b); // menor primero → mayor encima

        crimeEntries.forEach(([crimeKey, crimeRatio]) => {
          const color   = CRIME_COLORS[crimeKey as keyof typeof CRIME_COLORS];
          const r       = zona.radius * (0.4 + crimeRatio * 1.8);
          const opacity = baseOpacity * crimeRatio * 2.2;
          drawGradientCircle(map, zona.lat, zona.lng, r, color, Math.min(opacity, 0.75), layersRef);
        });
      }

      // Tooltip en el centro
      const marker = L.circleMarker([zona.lat, zona.lng], {
        radius: 6,
        fillColor: "#112288",
        fillOpacity: 0.85,
        color: "white",
        weight: 2,
      }).addTo(map);

      const totalStr = total > 0 ? total.toLocaleString("es-CO") : "Sin datos";
      marker.bindTooltip(
        `<div style="font-family:sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:13px;color:#112288;margin-bottom:5px">${zona.name}</div>
          <div style="font-size:11px;color:#334155;line-height:1.9">
            <span style="color:#e11d48">●</span> Hurto personas: <b>${Math.round(zona.crimes.personas * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:#7c3aed">●</span> Hurto residencias: <b>${Math.round(zona.crimes.residencias * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:#0284c7">●</span> Hurto automotores: <b>${Math.round(zona.crimes.autos * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:#d97706">●</span> Lesiones: <b>${Math.round(zona.crimes.lesiones * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:#ea580c">●</span> Violencia intrafamiliar: <b>${Math.round(zona.crimes.violencia * total).toLocaleString("es-CO")}</b>
          </div>
          <div style="margin-top:5px;padding-top:4px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b">
            Total: <b>${totalStr}</b>
          </div>
          <div style="font-size:9px;color:#94a3b8;margin-top:2px">SIEDCO · dic/2025</div>
        </div>`,
        { direction: "top", opacity: 0.97 }
      );
      layersRef.current.push(marker);
    });

    return () => {
      layersRef.current.forEach((l) => map.removeLayer(l));
      layersRef.current = [];
    };
  }, [map, selectedLocalidad, hideRisks, selectedCrime, siedcoData]);

  return null;
}

// Dibuja un círculo degradado con 4 anillos
function drawGradientCircle(
  map: L.Map,
  lat: number, lng: number,
  radius: number,
  color: string,
  maxOpacity: number,
  layersRef: React.MutableRefObject<L.Layer[]>
) {
  const rings = [
    { r: radius,        o: maxOpacity * 0.08 },
    { r: radius * 0.70, o: maxOpacity * 0.20 },
    { r: radius * 0.45, o: maxOpacity * 0.42 },
    { r: radius * 0.22, o: maxOpacity * 0.80 },
  ];
  rings.forEach(({ r, o }) => {
    const c = L.circle([lat, lng], {
      radius: r,
      fillColor: color,
      fillOpacity: o,
      color: "transparent",
      weight: 0,
    }).addTo(map);
    layersRef.current.push(c);
  });
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

export default function LeafletMap({ data, selectedCrime, mapIncidents, hideRisks, siedcoData = {} }: Props) {
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
      <HeatLayer
        selectedLocalidad={data?.name ?? ""}
        hideRisks={hideRisks}
        selectedCrime={selectedCrime}
        siedcoData={siedcoData}
      />
      <IncidentLayer incidents={validIncidents} zoom={zoom} />
    </MapContainer>
  );
}
