"use client";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LocalidadData } from "@/types";
import type { Incidencia } from "@/components/bitacora/IncidenciasModule";
import { toGeoJSON, MAX_TOTAL } from "@/lib/bogotaGeoJson";
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

// ── Choropleth con GeoJSON local (sin API externa) ────────────────────────────
function ChoroplethLayer({ selectedLocalidad, hideRisks }: { selectedLocalidad: string; hideRisks: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (hideRisks) return;

    const geojson = toGeoJSON();

    layerRef.current = L.geoJSON(geojson as Parameters<typeof L.geoJSON>[0], {
      style: (feature) => {
        if (!feature) return {};
        const name      = feature.properties.name as string;
        const isSelected = name === selectedLocalidad;
        const total     = feature.properties.total as number;
        const ratio     = total / MAX_TOTAL;

        let fillColor = "#16a34a";
        if (ratio > 0.70)      fillColor = "#dc2626";
        else if (ratio > 0.45) fillColor = "#ea580c";
        else if (ratio > 0.22) fillColor = "#d97706";

        return {
          fillColor,
          fillOpacity: isSelected ? 0.80 : 0.50,
          color:       isSelected ? "#112288" : "#ffffff",
          weight:      isSelected ? 2.5 : 0.8,
          opacity:     1,
        };
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindTooltip(
          `<div style="font-family:sans-serif;min-width:180px;padding:2px">
            <div style="font-weight:700;font-size:13px;color:#112288;margin-bottom:5px">${p.name}</div>
            <div style="font-size:11px;color:#334155;line-height:1.8">
              👤 Hurto a personas: <b>${(p.hurtoPersonas as number).toLocaleString("es-CO")}</b><br/>
              🏠 Hurto a residencias: <b>${(p.hurtoResidencias as number).toLocaleString("es-CO")}</b><br/>
              🚗 Hurto automotores: <b>${(p.hurtoAutos as number).toLocaleString("es-CO")}</b><br/>
              🤕 Lesiones personales: <b>${(p.lesiones as number).toLocaleString("es-CO")}</b><br/>
              👊 Violencia intrafamiliar: <b>${(p.violencia as number).toLocaleString("es-CO")}</b>
            </div>
            <div style="margin-top:5px;padding-top:4px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b">
              Total delitos: <b>${(p.total as number).toLocaleString("es-CO")}</b>
            </div>
            <div style="font-size:9px;color:#94a3b8;margin-top:2px">SIEDCO · Sec. Distrital Seguridad · Corte dic/2025</div>
          </div>`,
          { direction: "top", sticky: true, opacity: 0.98 }
        );

        // Resaltar al hover
        layer.on("mouseover", () => {
          (layer as L.Path).setStyle({ fillOpacity: 0.85, weight: 2 });
        });
        layer.on("mouseout", () => {
          layerRef.current?.resetStyle(layer);
        });
      },
    }).addTo(map);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, selectedLocalidad, hideRisks]);

  return null;
}

// ── FlyTo cuando cambia localidad ─────────────────────────────────────────────
function MapController({ data }: { data: LocalidadData | null }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    map.flyTo(data.center, data.zoom, { duration: 1.2, easeLinearity: 0.4 });
  }, [data, map]);
  return null;
}

// ── Zoom watcher ──────────────────────────────────────────────────────────────
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
    const h = Math.round(size * 1.35);

    incidents.forEach((inc) => {
      const lat = parseFloat(String(inc.lat).replace(",", "."));
      const lng = parseFloat(String(inc.lng).replace(",", "."));
      if (isNaN(lat) || isNaN(lng) || Math.abs(lat) < 0.001) return;

      const color = GRAVEDAD_COLORS[inc.gravedad] ?? "#64748b";
      const icon = L.divIcon({
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

// ── Componente principal ──────────────────────────────────────────────────────
interface Props {
  data: LocalidadData | null;
  selectedCrime: string | null;
  mapIncidents: Incidencia[];
  hideRisks: boolean;
}

export default function LeafletMap({ data, mapIncidents, hideRisks }: Props) {
  const initial: [number, number] = [4.6510, -74.0983];
  const [zoom, setZoom] = useState(11);

  const validIncidents = mapIncidents.filter((i) => {
    const lat = parseFloat(String(i.lat).replace(",", "."));
    const lng = parseFloat(String(i.lng).replace(",", "."));
    return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) > 0.001;
  });

  return (
    <MapContainer
      center={initial}
      zoom={11}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
      />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
        zIndex={10}
      />
      <MapController data={data} />
      <ZoomWatcher onZoom={setZoom} />
      <ChoroplethLayer selectedLocalidad={data?.name ?? ""} hideRisks={hideRisks} />
      <IncidentLayer incidents={validIncidents} zoom={zoom} />
    </MapContainer>
  );
}
