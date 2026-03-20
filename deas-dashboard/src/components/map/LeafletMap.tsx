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

// Colores por tipo de delito
const CRIME_COLORS = {
  personas:    "#e11d48",
  residencias: "#7c3aed",
  autos:       "#0284c7",
  lesiones:    "#d97706",
  violencia:   "#ea580c",
};

// Mapeo nombre IDECA (mayúsculas) → nombre dashboard
const NOMBRE_MAP: Record<string, string> = {
  "USAQUÉN":        "Usaquén",
  "USAQUEN":        "Usaquén",
  "CHAPINERO":      "Chapinero",
  "SANTA FE":       "Santa Fe",
  "SANTAFE":        "Santa Fe",
  "SUBA":           "Suba",
  "BARRIOS UNIDOS": "Barrios Unidos",
  "TEUSAQUILLO":    "Teusaquillo",
};

// Distribución por tipo de delito por localidad (proporciones)
const CRIME_DIST: Record<string, Record<string, number>> = {
  "Usaquén":        { personas: 0.42, residencias: 0.22, autos: 0.18, lesiones: 0.12, violencia: 0.06 },
  "Chapinero":      { personas: 0.45, residencias: 0.25, autos: 0.15, lesiones: 0.10, violencia: 0.05 },
  "Santa Fe":       { personas: 0.40, residencias: 0.20, autos: 0.10, lesiones: 0.18, violencia: 0.12 },
  "Suba":           { personas: 0.38, residencias: 0.28, autos: 0.14, lesiones: 0.12, violencia: 0.08 },
  "Barrios Unidos": { personas: 0.35, residencias: 0.26, autos: 0.22, lesiones: 0.11, violencia: 0.06 },
  "Teusaquillo":    { personas: 0.38, residencias: 0.25, autos: 0.20, lesiones: 0.10, violencia: 0.07 },
};

// Genera puntos aleatorios DENTRO de un polígono usando bounding box + point-in-polygon
function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function generatePointsInPolygon(
  polygon: [number, number][],
  count: number,
  seed: number
): [number, number][] {
  let s = seed;
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

  // Bounding box
  const lngs = polygon.map(p => p[0]);
  const lats = polygon.map(p => p[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);

  const points: [number, number][] = [];
  let attempts = 0;
  while (points.length < count && attempts < count * 20) {
    attempts++;
    const lng = minLng + rng() * (maxLng - minLng);
    const lat = minLat + rng() * (maxLat - minLat);
    if (pointInPolygon([lng, lat], polygon)) {
      points.push([lat, lng]);
    }
  }
  return points;
}

// ── Capa principal del mapa ───────────────────────────────────────────────────
interface ArcGISFeature {
  attributes: Record<string, string | number>;
  geometry: { rings: number[][][] };
}

function MapLayer({
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
  const [geoData, setGeoData] = useState<ArcGISFeature[]>([]);

  // Cargar GeoJSON IDECA una sola vez
  useEffect(() => {
    fetch("/localidades_ideca.json")
      .then(r => r.json())
      .then(data => {
        if (data.features) setGeoData(data.features);
      })
      .catch(e => console.error("Error cargando localidades:", e));
  }, []);

  useEffect(() => {
    // Limpiar capas anteriores
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];
    if (hideRisks || geoData.length === 0) return;

    const hasSelection = selectedLocalidad !== "";
    const maxTotal = Math.max(...Object.values(siedcoData), 5000);

    // Calcular qué tipo de delito está filtrando
    const crimeKey = selectedCrime
      ? selectedCrime.toLowerCase().includes("personas")    ? "personas"
      : selectedCrime.toLowerCase().includes("residencias") ? "residencias"
      : selectedCrime.toLowerCase().includes("auto")        ? "autos"
      : selectedCrime.toLowerCase().includes("lesiones")    ? "lesiones"
      : selectedCrime.toLowerCase().includes("violencia")   ? "violencia"
      : null
      : null;

    geoData.forEach((feature) => {
      const rawName = String(feature.attributes.LocNombre || "").toUpperCase().trim();
      const nombre  = NOMBRE_MAP[rawName] ?? null;
      if (!nombre) return; // Solo las 6 localidades DEAS

      const isSelected  = nombre === selectedLocalidad;
      const total       = siedcoData[nombre] || 0;
      const ratio       = total > 0 ? total / maxTotal : 0.25;
      const dist        = CRIME_DIST[nombre] ?? CRIME_DIST["Usaquén"];

      // Convertir rings de ArcGIS a [lat, lng][]
      const ring = feature.geometry.rings[0];
      if (!ring || ring.length < 3) return;
      const polygon: [number, number][] = ring.map(p => [p[1], p[0]]);

      if (hasSelection && !isSelected) {
        // Localidades no seleccionadas: manto muy tenue gris
        const ghost = L.polygon(polygon, {
          fillColor: "#94a3b8",
          fillOpacity: 0.08,
          color: "#cbd5e1",
          weight: 0.5,
          opacity: 0.3,
        }).addTo(map);
        layersRef.current.push(ghost);
        return;
      }

      // ── Manto de fondo por nivel de riesgo total ──
      let bgColor = "#16a34a";
      if (ratio > 0.70)      bgColor = "#dc2626";
      else if (ratio > 0.45) bgColor = "#ea580c";
      else if (ratio > 0.22) bgColor = "#d97706";

      const bgOpacity = isSelected ? 0.22 : 0.15;
      const mantoBg = L.polygon(polygon, {
        fillColor: bgColor,
        fillOpacity: bgOpacity,
        color: isSelected ? "#112288" : "#ffffff",
        weight: isSelected ? 2 : 0.8,
        opacity: isSelected ? 0.9 : 0.5,
        dashArray: isSelected ? "8 4" : undefined,
      }).addTo(map);

      // Tooltip en el manto
      const totalStr = total > 0 ? total.toLocaleString("es-CO") : "Sin datos SIEDCO";
      mantoBg.bindTooltip(
        `<div style="font-family:sans-serif;min-width:190px">
          <div style="font-weight:700;font-size:13px;color:#112288;margin-bottom:5px">${nombre}</div>
          <div style="font-size:11px;color:#334155;line-height:1.9">
            <span style="color:${CRIME_COLORS.personas}">●</span> Hurto personas: <b>${Math.round(dist.personas * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:${CRIME_COLORS.residencias}">●</span> Hurto residencias: <b>${Math.round(dist.residencias * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:${CRIME_COLORS.autos}">●</span> Hurto automotores: <b>${Math.round(dist.autos * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:${CRIME_COLORS.lesiones}">●</span> Lesiones: <b>${Math.round(dist.lesiones * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:${CRIME_COLORS.violencia}">●</span> Violencia intrafamiliar: <b>${Math.round(dist.violencia * total).toLocaleString("es-CO")}</b>
          </div>
          <div style="margin-top:5px;padding-top:4px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b">
            Total: <b>${totalStr}</b>
          </div>
          <div style="font-size:9px;color:#94a3b8;margin-top:2px">SIEDCO · dic/2025</div>
        </div>`,
        { direction: "top", sticky: true, opacity: 0.97 }
      );
      layersRef.current.push(mantoBg);

      // ── Puntos de colores por tipo de delito dentro del polígono ──
      if (crimeKey) {
        // Modo filtro: solo un color, más puntos
        const color  = CRIME_COLORS[crimeKey as keyof typeof CRIME_COLORS];
        const ptCount = Math.round(20 + ratio * 60);
        const seed   = nombre.charCodeAt(0) * 31 + (crimeKey.charCodeAt(0) || 1);
        const points = generatePointsInPolygon(ring.map(p => [p[0], p[1]] as [number, number]), ptCount, seed);

        points.forEach(([lat, lng]) => {
          const pt = L.circleMarker([lat, lng], {
            radius: 3 + Math.random() * 3,
            fillColor: color,
            fillOpacity: 0.65 + Math.random() * 0.25,
            color: "transparent",
            weight: 0,
          }).addTo(map);
          layersRef.current.push(pt);
        });
      } else {
        // Modo general: puntos por cada tipo de delito proporcionales
        Object.entries(dist).forEach(([cKey, cRatio]) => {
          const color    = CRIME_COLORS[cKey as keyof typeof CRIME_COLORS];
          const ptCount  = Math.round(cRatio * ratio * 80);
          if (ptCount < 2) return;
          const seed     = nombre.charCodeAt(0) * 31 + cKey.charCodeAt(0);
          const points   = generatePointsInPolygon(ring.map(p => [p[0], p[1]] as [number, number]), ptCount, seed);

          points.forEach(([lat, lng]) => {
            const r  = 2.5 + Math.random() * 2.5;
            const pt = L.circleMarker([lat, lng], {
              radius: r,
              fillColor: color,
              fillOpacity: 0.55 + Math.random() * 0.35,
              color: "transparent",
              weight: 0,
            }).addTo(map);
            layersRef.current.push(pt);
          });
        });
      }
    });

    return () => {
      layersRef.current.forEach(l => map.removeLayer(l));
      layersRef.current = [];
    };
  }, [map, geoData, selectedLocalidad, hideRisks, selectedCrime, siedcoData]);

  return null;
}

// ── FlyTo ─────────────────────────────────────────────────────────────────────
function MapController({ data }: { data: LocalidadData | null }) {
  const map = useMap();
  useEffect(() => {
    if (!data) {
      map.flyTo([4.7000, -74.0750], 12, { duration: 1.2 });
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
      center={[4.7000, -74.0750]}
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
      <MapLayer
        selectedLocalidad={data?.name ?? ""}
        hideRisks={hideRisks}
        selectedCrime={selectedCrime}
        siedcoData={siedcoData}
      />
      <IncidentLayer incidents={validIncidents} zoom={zoom} />
    </MapContainer>
  );
}
