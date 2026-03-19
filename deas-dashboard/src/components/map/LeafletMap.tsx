"use client";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, Tooltip } from "react-leaflet";
import type { LocalidadData } from "@/types";
import type { Incidencia } from "@/components/bitacora/IncidenciasModule";
import L from "leaflet";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Colores por nivel de riesgo ───────────────────────────────────────────────
const GRAVEDAD_COLORS: Record<string, string> = {
  crítica: "#dc2626",
  alta:    "#ea580c",
  media:   "#d97706",
  baja:    "#16a34a",
};

// ── Normaliza nombre de localidad de la API SIEDCO ────────────────────────────
const LOCALIDAD_NORM: Record<string, string> = {
  "CHAPINERO":      "Chapinero",
  "USAQUÉN":        "Usaquén",
  "USAQUEN":        "Usaquén",
  "SUBA":           "Suba",
  "KENNEDY":        "Kennedy",
  "ENGATIVÁ":       "Engativá",
  "ENGATIVA":       "Engativá",
  "BOSA":           "Bosa",
  "TEUSAQUILLO":    "Teusaquillo",
  "BARRIOS UNIDOS": "Barrios Unidos",
  "FONTIBÓN":       "Fontibón",
  "FONTIBON":       "Fontibón",
  "PUENTE ARANDA":  "Puente Aranda",
  "SANTA FE":       "Santa Fe",
  "SANTAFE":        "Santa Fe",
  "LOS MÁRTIRES":   "Los Mártires",
  "ANTONIO NARIÑO": "Antonio Nariño",
  "RAFAEL URIBE URIBE": "Rafael Uribe",
  "CIUDAD BOLÍVAR": "Ciudad Bolívar",
  "TUNJUELITO":     "Tunjuelito",
  "SAN CRISTÓBAL":  "San Cristóbal",
};

// ── Choropleth layer usando Leaflet nativo ────────────────────────────────────
interface SiedcoFeature {
  type: string;
  properties: Record<string, string | number>;
  geometry: object;
}

function ChoroplethLayer({
  selectedLocalidad,
  onDataLoaded,
}: {
  selectedLocalidad: string;
  onDataLoaded: (data: Record<string, number>) => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAndRender() {
      try {
        const res = await fetch("/api/siedco");
        if (!res.ok) throw new Error("SIEDCO no disponible");
        const geojson = await res.json();

        if (cancelled) return;

        // Calcular max para normalizar colores
        let maxTotal = 1;
        geojson.features?.forEach((f: SiedcoFeature) => {
          const total =
            (Number(f.properties.CMHPTOTAL) || 0) +
            (Number(f.properties.CMHRTOTAL) || 0) +
            (Number(f.properties.CMHATOTAL) || 0) +
            (Number(f.properties.CMLPTOTAL) || 0);
          if (total > maxTotal) maxTotal = total;
        });

        // Enviar datos al padre para actualizar gráficos
        const dataMap: Record<string, number> = {};
        geojson.features?.forEach((f: SiedcoFeature) => {
          const raw = String(f.properties.CMIULOCAL || "").toUpperCase().trim();
          const nombre = LOCALIDAD_NORM[raw] ?? raw;
          const total =
            (Number(f.properties.CMHPTOTAL) || 0) +
            (Number(f.properties.CMHRTOTAL) || 0) +
            (Number(f.properties.CMHATOTAL) || 0) +
            (Number(f.properties.CMLPTOTAL) || 0);
          dataMap[nombre] = total;
        });
        onDataLoaded(dataMap);

        // Remover capa anterior
        if (layerRef.current) {
          map.removeLayer(layerRef.current);
        }

        // Crear capa choropleth
        layerRef.current = L.geoJSON(geojson, {
          style: (feature) => {
            if (!feature) return {};
            const raw = String(feature.properties.CMIULOCAL || "").toUpperCase().trim();
            const nombre = LOCALIDAD_NORM[raw] ?? raw;
            const isSelected = nombre === selectedLocalidad;

            const total =
              (Number(feature.properties.CMHPTOTAL) || 0) +
              (Number(feature.properties.CMHRTOTAL) || 0) +
              (Number(feature.properties.CMHATOTAL) || 0) +
              (Number(feature.properties.CMLPTOTAL) || 0);

            const ratio = total / maxTotal;

            // Color según intensidad: verde → amarillo → naranja → rojo
            let fillColor = "#16a34a"; // verde bajo
            if (ratio > 0.75)      fillColor = "#dc2626"; // rojo alto
            else if (ratio > 0.5)  fillColor = "#ea580c"; // naranja medio-alto
            else if (ratio > 0.25) fillColor = "#d97706"; // amarillo medio

            return {
              fillColor,
              fillOpacity: isSelected ? 0.75 : 0.45,
              color:       isSelected ? "#112288" : "#ffffff",
              weight:      isSelected ? 3 : 1,
              opacity:     1,
            };
          },
          onEachFeature: (feature, layer) => {
            const raw = String(feature.properties.CMIULOCAL || "").toUpperCase().trim();
            const nombre = LOCALIDAD_NORM[raw] ?? raw;
            const hurtoPersonas = Number(feature.properties.CMHPTOTAL) || 0;
            const hurtoResid    = Number(feature.properties.CMHRTOTAL) || 0;
            const hurtoAutos    = Number(feature.properties.CMHATOTAL) || 0;
            const lesiones      = Number(feature.properties.CMLPTOTAL) || 0;
            const violencia     = Number(feature.properties.CMVITOTAL) || 0;
            const total = hurtoPersonas + hurtoResid + hurtoAutos + lesiones;

            layer.bindTooltip(
              `<div style="font-family:sans-serif;min-width:160px">
                <div style="font-weight:700;font-size:13px;color:#112288;margin-bottom:4px">${nombre}</div>
                <div style="font-size:11px;color:#334155;line-height:1.6">
                  👤 Hurto personas: <b>${hurtoPersonas.toLocaleString("es-CO")}</b><br/>
                  🏠 Hurto residencias: <b>${hurtoResid.toLocaleString("es-CO")}</b><br/>
                  🚗 Hurto automotores: <b>${hurtoAutos.toLocaleString("es-CO")}</b><br/>
                  🤕 Lesiones personales: <b>${lesiones.toLocaleString("es-CO")}</b><br/>
                  👊 Violencia intrafamiliar: <b>${violencia.toLocaleString("es-CO")}</b>
                </div>
                <div style="margin-top:4px;padding-top:4px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b">
                  Total delitos año actual: <b>${total.toLocaleString("es-CO")}</b>
                </div>
                <div style="font-size:9px;color:#94a3b8;margin-top:2px">Fuente: SIEDCO · Secretaría de Seguridad</div>
              </div>`,
              { direction: "top", sticky: true, opacity: 0.97 }
            );
          },
        }).addTo(map);

      } catch (err) {
        console.error("Choropleth error:", err);
      }
    }

    loadAndRender();
    return () => { cancelled = true; };
  }, [map, selectedLocalidad, onDataLoaded]);

  useEffect(() => {
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [map]);

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
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 40 54"
          style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
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
  onSiedcoData?: (data: Record<string, number>) => void;
}

export default function LeafletMap({ data, mapIncidents, hideRisks, onSiedcoData }: Props) {
  const initial: [number, number] = [4.6510, -74.0560];
  const [zoom, setZoom] = useState(12);

  const validIncidents = mapIncidents.filter((i) => {
    const lat = parseFloat(String(i.lat).replace(",", "."));
    const lng = parseFloat(String(i.lng).replace(",", "."));
    return !isNaN(lat) && !isNaN(lng) && Math.abs(lat) > 0.001;
  });

  return (
    <MapContainer
      center={initial}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
      />
      {/* Labels encima del choropleth */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
        zIndex={10}
      />
      <MapController data={data} />
      <ZoomWatcher onZoom={setZoom} />

      {/* Choropleth real de SIEDCO */}
      {!hideRisks && (
        <ChoroplethLayer
          selectedLocalidad={data?.name ?? ""}
          onDataLoaded={onSiedcoData ?? (() => {})}
        />
      )}

      {/* Pines de incidencias */}
      <IncidentLayer incidents={validIncidents} zoom={zoom} />
    </MapContainer>
  );
}
