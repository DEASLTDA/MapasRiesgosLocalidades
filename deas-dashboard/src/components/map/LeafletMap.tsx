"use client";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LocalidadData } from "@/types";
import type { Incidencia } from "@/components/bitacora/IncidenciasModule";
import L from "leaflet";
import type { Cliente } from "@/components/ui/ClientesPanel";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const GRAVEDAD_COLORS: Record<string, string> = {
  crítica: "#dc2626", alta: "#ea580c", media: "#d97706", baja: "#16a34a",
};

const CRIME_COLORS = {
  personas:    { hex: "#e11d48", rgb: "225,29,72" },
  residencias: { hex: "#7c3aed", rgb: "124,58,237" },
  autos:       { hex: "#0284c7", rgb: "2,132,199" },
  lesiones:    { hex: "#d97706", rgb: "217,119,6" },
  homicidios:  { hex: "#991b1b", rgb: "153,27,27" },
  extorsion:   { hex: "#ea580c", rgb: "234,88,12" },
};

const NOMBRE_MAP: Record<string, string> = {
  "USAQUÉN": "Usaquén", "USAQUEN": "Usaquén",
  "CHAPINERO": "Chapinero",
  "SANTA FE": "Santa Fe", "SANTAFE": "Santa Fe",
  "SUBA": "Suba",
  "BARRIOS UNIDOS": "Barrios Unidos",
  "TEUSAQUILLO": "Teusaquillo",
};

const CRIME_DIST: Record<string, Record<string, number>> = {
  "Usaquén":        { personas: 0.42, residencias: 0.22, autos: 0.18, lesiones: 0.12, homicidios: 0.03, extorsion: 0.03 },
  "Chapinero":      { personas: 0.45, residencias: 0.25, autos: 0.15, lesiones: 0.10, homicidios: 0.02, extorsion: 0.03 },
  "Santa Fe":       { personas: 0.40, residencias: 0.20, autos: 0.10, lesiones: 0.18, homicidios: 0.06, extorsion: 0.06 },
  "Suba":           { personas: 0.38, residencias: 0.28, autos: 0.14, lesiones: 0.12, homicidios: 0.04, extorsion: 0.04 },
  "Barrios Unidos": { personas: 0.35, residencias: 0.26, autos: 0.22, lesiones: 0.11, homicidios: 0.03, extorsion: 0.03 },
  "Teusaquillo":    { personas: 0.38, residencias: 0.25, autos: 0.20, lesiones: 0.10, homicidios: 0.03, extorsion: 0.04 },
};

function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function generatePointsInPolygon(ring: number[][], count: number, seed: number): [number, number][] {
  let s = seed;
  const rng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const lngs = ring.map(p => p[0]);
  const lats  = ring.map(p => p[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const polygon: [number, number][] = ring.map(p => [p[0], p[1]]);
  const points: [number, number][] = [];
  let attempts = 0;
  while (points.length < count && attempts < count * 25) {
    attempts++;
    const lng = minLng + rng() * (maxLng - minLng);
    const lat  = minLat + rng() * (maxLat - minLat);
    if (pointInPolygon([lng, lat], polygon)) points.push([lat, lng]);
  }
  return points;
}

// ── Canvas Heatmap Layer ──────────────────────────────────────────────────────
// Dibuja manchas difuminadas usando Canvas superpuesto al mapa
// ── Canvas HeatBlobs — gradientes radiales que se mezclan orgánicamente ───────
const HeatBlobs = L.Layer.extend({
  initialize(options: { points: { lat: number; lng: number; rgb: string; intensity: number }[] }) {
    L.setOptions(this, options);
    this._points = options.points;
  },
  onAdd(map: L.Map) {
    this._map = map;
    this._canvas = L.DomUtil.create("canvas", "leaflet-heatblob");
    const pane = map.getPanes().overlayPane;
    pane.appendChild(this._canvas);
    Object.assign(this._canvas.style, {
      position: "absolute", pointerEvents: "none", zIndex: "400",
    });
    map.on("moveend zoomend move zoom resize", this._redraw, this);
    this._redraw();
    return this;
  },
  onRemove(map: L.Map) {
    map.off("moveend zoomend move zoom resize", this._redraw, this);
    L.DomUtil.remove(this._canvas);
  },
  _redraw() {
    const map    = this._map;
    const canvas = this._canvas as HTMLCanvasElement;
    const size   = map.getSize();
    canvas.width  = size.x;
    canvas.height = size.y;

    const pane     = map.getPanes().overlayPane;
    const mapDiv   = map.getContainer();
    const mapRect  = mapDiv.getBoundingClientRect();
    const paneRect = pane.getBoundingClientRect();
    canvas.style.left = (mapRect.left - paneRect.left) + "px";
    canvas.style.top  = (mapRect.top  - paneRect.top)  + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size.x, size.y);

    const zoom    = map.getZoom();
    const r       = zoom <= 10 ? 22 : zoom <= 11 ? 32 : zoom <= 12 ? 45 : zoom <= 13 ? 62 : zoom <= 14 ? 80 : 100;
    const opMod   = zoom <= 10 ? 0.22 : zoom <= 11 ? 0.32 : zoom <= 12 ? 0.48 : zoom <= 13 ? 0.65 : 1.0;

    (this._points as { lat: number; lng: number; rgb: string; intensity: number }[]).forEach(pt => {
      const px = map.latLngToContainerPoint([pt.lat, pt.lng]);
      if (px.x < -r || px.x > size.x + r || px.y < -r || px.y > size.y + r) return;
      const intensity = pt.intensity * opMod;
      const grad = ctx.createRadialGradient(px.x, px.y, 0, px.x, px.y, r);
      grad.addColorStop(0,    `rgba(${pt.rgb},${intensity})`);
      grad.addColorStop(0.45, `rgba(${pt.rgb},${intensity * 0.38})`);
      grad.addColorStop(1,    `rgba(${pt.rgb},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px.x, px.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  },
});

function drawBlobs(
  map: L.Map,
  points: { lat: number; lng: number; rgb: string; intensity: number }[],
  layersRef: React.MutableRefObject<L.Layer[]>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layer = new (HeatBlobs as any)({ points });
  layer.addTo(map);
  layersRef.current.push(layer);
}

interface ArcGISFeature {
  attributes: Record<string, string | number>;
  geometry: { rings: number[][][] };
}

function MapLayer({
  selectedLocalidad, hideRisks, selectedCrime, siedcoData,
}: {
  selectedLocalidad: string;
  hideRisks: boolean;
  selectedCrime: string | null;
  siedcoData: Record<string, number>;
}) {
  const map = useMap();
  const layersRef = useRef<L.Layer[]>([]);
  const [geoData, setGeoData] = useState<ArcGISFeature[]>([]);

  useEffect(() => {
    fetch("/localidades_ideca.json")
      .then(r => r.json())
      .then(data => { if (data.features) setGeoData(data.features); })
      .catch(e => console.error("Error:", e));
  }, []);

  useEffect(() => {
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];
    if (hideRisks || geoData.length === 0) return;

    const hasSelection = selectedLocalidad !== "";
    const maxTotal = Math.max(...Object.values(siedcoData), 1000);

    const crimeKey = selectedCrime
      ? selectedCrime.toLowerCase().includes("personas")    ? "personas"
      : selectedCrime.toLowerCase().includes("residencias") ? "residencias"
      : selectedCrime.toLowerCase().includes("auto")        ? "autos"
      : selectedCrime.toLowerCase().includes("lesiones")    ? "lesiones"
      : selectedCrime.toLowerCase().includes("violencia")   ? "violencia"
      : null : null;

    // Recopilar todos los puntos para el canvas heatmap
    const allBlobPoints: { lat: number; lng: number; rgb: string; intensity: number }[] = [];

    geoData.forEach((feature) => {
      const rawName = String(feature.attributes.LocNombre || "").toUpperCase().trim();
      const nombre  = NOMBRE_MAP[rawName] ?? null;
      if (!nombre) return;

      const isSelected = nombre === selectedLocalidad;
      const total      = siedcoData[nombre] || 0;
      const ratio      = total > 0 ? total / maxTotal : 0.30; // mínimo 30% para siempre mostrar manchas
      const dist       = CRIME_DIST[nombre] ?? CRIME_DIST["Usaquén"];
      const ring       = feature.geometry.rings[0];
      if (!ring || ring.length < 3) return;
      const polygon: [number, number][] = ring.map(p => [p[1], p[0]]);

      // Manto de fondo con polígono real
      if (hasSelection && !isSelected) {
        const ghost = L.polygon(polygon, {
          fillColor: "#94a3b8", fillOpacity: 0.06,
          color: "#cbd5e1", weight: 0.5, opacity: 0.3,
        }).addTo(map);
        layersRef.current.push(ghost);
        return;
      }

      // Color de fondo según riesgo
      let bgColor = "#16a34a";
      if (ratio > 0.70)      bgColor = "#dc2626";
      else if (ratio > 0.45) bgColor = "#ea580c";
      else if (ratio > 0.22) bgColor = "#d97706";

      const manto = L.polygon(polygon, {
        fillColor: bgColor,
        fillOpacity: isSelected ? 0.12 : 0.10,
        color: isSelected ? "#112288" : "#94a3b8",
        weight: isSelected ? 2 : 0.8,
        opacity: isSelected ? 0.9 : 0.4,
        dashArray: isSelected ? "8 4" : undefined,
      }).addTo(map);

      // Tooltip con datos reales del Sheets
      const totalStr = total > 0 ? total.toLocaleString("es-CO") : "Sin datos";
      manto.bindTooltip(
        `<div style="font-family:sans-serif;min-width:190px">
          <div style="font-weight:700;font-size:13px;color:#112288;margin-bottom:5px">${nombre}</div>
          <div style="font-size:11px;color:#334155;line-height:1.9">
            <span style="color:#e11d48">●</span> Hurto personas: <b>${Math.round(dist.personas * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:#7c3aed">●</span> Hurto residencias: <b>${Math.round(dist.residencias * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:#0284c7">●</span> Hurto automotores: <b>${Math.round(dist.autos * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:#d97706">●</span> Lesiones: <b>${Math.round(dist.lesiones * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:#991b1b">●</span> Homicidios: <b>${Math.round((dist.homicidios||0.03) * total).toLocaleString("es-CO")}</b><br/>
            <span style="color:#ea580c">●</span> Extorsión: <b>${Math.round((dist.extorsion||0.03) * total).toLocaleString("es-CO")}</b>
          </div>
          <div style="margin-top:5px;padding-top:4px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b">
            Total: <b>${totalStr}</b>
          </div>
          <div style="font-size:9px;color:#94a3b8;margin-top:2px">SIEDCO · 2026</div>
        </div>`,
        { direction: "top", sticky: true, opacity: 0.97 }
      );
      layersRef.current.push(manto);

      // Generar puntos blob dentro del polígono
      if (crimeKey) {
        const cInfo   = CRIME_COLORS[crimeKey as keyof typeof CRIME_COLORS];
        const ptCount = Math.round(15 + ratio * 50);
        const seed    = nombre.charCodeAt(0) * 31 + crimeKey.charCodeAt(0);
        const points  = generatePointsInPolygon(ring, ptCount, seed);
        points.forEach(([lat, lng]) => {
          allBlobPoints.push({ lat, lng, rgb: cInfo.rgb, intensity: 0.55 + Math.random() * 0.35 });
        });
      } else {
        Object.entries(dist).forEach(([cKey, cRatio]) => {
          const cInfo   = CRIME_COLORS[cKey as keyof typeof CRIME_COLORS];
          const ptCount = Math.round(cRatio * ratio * 70);
          if (ptCount < 2) return;
          const seed   = nombre.charCodeAt(0) * 31 + cKey.charCodeAt(0);
          const points = generatePointsInPolygon(ring, ptCount, seed);
          points.forEach(([lat, lng]) => {
            allBlobPoints.push({ lat, lng, rgb: cInfo.rgb, intensity: 0.45 + Math.random() * 0.40 });
          });
        });
      }
    });

    // Dibujar manchas difuminadas con círculos Leaflet (sin canvas, sin artefactos)
    if (allBlobPoints.length > 0) {
      drawBlobs(map, allBlobPoints, layersRef);
    }

    return () => {
      layersRef.current.forEach(l => map.removeLayer(l));
      layersRef.current = [];
    };
  }, [map, geoData, selectedLocalidad, hideRisks, selectedCrime, siedcoData]);

  return null;
}

function MapController({ data }: { data: LocalidadData | null }) {
  const map = useMap();
  useEffect(() => {
    if (!data) map.flyTo([4.7000, -74.0750], 12, { duration: 1.2 });
    else map.flyTo(data.center, data.zoom, { duration: 1.2, easeLinearity: 0.4 });
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

function IncidentLayer({ incidents, zoom }: { incidents: Incidencia[]; zoom: number }) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!groupRef.current) groupRef.current = L.layerGroup().addTo(map);
    else groupRef.current.clearLayers();

    const size = zoom <= 11 ? 22 : zoom <= 12 ? 28 : zoom <= 13 ? 34 : zoom <= 14 ? 40 : zoom <= 15 ? 46 : 54;
    const h    = Math.round(size * 1.35);

    incidents.forEach((inc) => {
      const lat = parseFloat(String(inc.lat).replace(",", "."));
      const lng = parseFloat(String(inc.lng).replace(",", "."));
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) < 0.001) return;

      const color = GRAVEDAD_COLORS[inc.gravedad] ?? "#64748b";
      const icon  = L.divIcon({
        className: "",
        iconSize: [size, h], iconAnchor: [size / 2, h],
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

interface Props {
  data: LocalidadData | null;
  selectedCrime: string | null;
  mapIncidents: Incidencia[];
  hideRisks: boolean;
  siedcoData?: Record<string, number>;
  clientes?: Cliente[];
  filtroCoord?: string;
  clienteSel?: string;
  onClienteClick?: (c: Cliente) => void;
}


// ── Clientes Layer (inline para evitar SSR issues) ───────────────────────────
function ClientesLayerInline({
  clientes, filtroCoordinador, clienteSeleccionado, onClienteClick,
}: {
  clientes: Cliente[];
  filtroCoordinador: string;
  clienteSeleccionado: string;
  onClienteClick: (c: Cliente) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!groupRef.current) groupRef.current = L.layerGroup().addTo(map);
    else groupRef.current.clearLayers();

    const COORD_COLORS_INLINE: Record<string, string> = {
      "JAVIER MILLAN":    "#2563eb",
      "LUIS CEBALLOS":    "#16a34a",
      "WILLIAM BOCANEGRA":"#dc2626",
      "LUIS MARTINEZ":    "#9333ea",
      "DEIVY VARGAS":     "#ea580c",
    };

    const filtrados = clientes.filter(c => {
      const coord = String(c.coordinador || "").toUpperCase().trim();
      if (filtroCoordinador && coord !== filtroCoordinador.toUpperCase()) return false;
      const lat = parseFloat(String(c.lat).replace(",", "."));
      const lng = parseFloat(String(c.long).replace(",", "."));
      return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) > 0.1;
    });

    filtrados.forEach(cliente => {
      const lat  = parseFloat(String(cliente.lat).replace(",", "."));
      const lng  = parseFloat(String(cliente.long).replace(",", "."));
      const coord = String(cliente.coordinador || "").toUpperCase().trim();
      const color = COORD_COLORS_INLINE[coord] ?? "#64748b";
      const isSelected = cliente.nombre === clienteSeleccionado;
      const size = isSelected ? 36 : 22;
      const h    = Math.round(size * 1.4);

      const icon = L.divIcon({
        className: "",
        iconSize: [size, h], iconAnchor: [size / 2, h],
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}"
          viewBox="0 0 40 56" style="filter:drop-shadow(0 2px 5px rgba(0,0,0,0.45))">
          <path d="M20 1C10.6 1 3 8.6 3 18C3 31 20 55 20 55C20 55 37 31 37 18C37 8.6 29.4 1 20 1Z"
            fill="${color}" stroke="white" stroke-width="${isSelected ? 3 : 2}"/>
          <circle cx="20" cy="18" r="${isSelected ? 10 : 8}" fill="white" opacity="0.95"/>
          <circle cx="20" cy="18" r="${isSelected ? 5 : 4}" fill="${color}"/>
        </svg>`,
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: isSelected ? 2000 : 500 });
      marker.bindTooltip(
        `<div style="font-family:sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:12px;color:${color}">${cliente.nombre}</div>
          <div style="font-size:10px;color:#475569;margin-top:2px">📍 ${cliente.direccion}</div>
          <div style="font-size:10px;color:#64748b">👤 ${cliente.coordinador || "—"}</div>
        </div>`,
        { direction: "top", offset: [0, -(h + 4)], opacity: 0.97 }
      );
      marker.on("click", () => onClienteClick(cliente));
      groupRef.current?.addLayer(marker);
    });

    if (clienteSeleccionado) {
      const c = clientes.find(cl => cl.nombre === clienteSeleccionado);
      if (c) {
        const lat = parseFloat(String(c.lat).replace(",", "."));
        const lng = parseFloat(String(c.long).replace(",", "."));
        if (!isNaN(lat) && !isNaN(lng)) map.flyTo([lat, lng], 16, { duration: 1.2 });
      }
    }
  }, [clientes, filtroCoordinador, clienteSeleccionado, onClienteClick, map]);

  useEffect(() => () => { groupRef.current?.clearLayers(); }, []);
  return null;
}

export default function LeafletMap({ data, selectedCrime, mapIncidents, hideRisks, siedcoData = {}, clientes = [], filtroCoord = "", clienteSel = "", onClienteClick }: Props) {
  const [zoom, setZoom] = useState(12);

  const validIncidents = mapIncidents.filter((i) => {
    const lat = parseFloat(String(i.lat).replace(",", "."));
    const lng = parseFloat(String(i.lng).replace(",", "."));
    return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) > 0.001;
  });

  return (
    <MapContainer
      center={[4.7000, -74.0750]} zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; CARTO'
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
      {clientes.length > 0 && (
        <ClientesLayerInline
          clientes={clientes}
          filtroCoordinador={filtroCoord}
          clienteSeleccionado={clienteSel}
          onClienteClick={onClienteClick ?? (() => {})}
        />
      )}
    </MapContainer>
  );
}
