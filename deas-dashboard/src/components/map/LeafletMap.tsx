"use client";
// ─── LeafletMap.tsx ──────────────────────────────────────────────────────────
// Mapa interactivo con capa de calor (heatmap) usando React-Leaflet.
// leaflet.heat se carga dinámicamente para evitar errores SSR.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LocalidadData } from "@/types";
import L from "leaflet";

// Fix íconos de Leaflet en producción Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Componente interno: actualiza el mapa cuando cambia la localidad ────────
function MapController({ data }: { data: LocalidadData | null }) {
  const map = useMap();
  const heatLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!data) return;

    // FlyTo hacia la localidad seleccionada
    map.flyTo(data.center, data.zoom, { duration: 1.4, easeLinearity: 0.4 });

    // Remover capa de calor anterior
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Crear nueva capa de calor (leaflet.heat)
    // Los colores van de Amarillo (bajo) → Naranja (medio) → Rojo (alto)
    const heatData = data.points.map((p) => [p.lat, p.lng, p.intensity] as [number, number, number]);

    // leaflet.heat extiende L dinámicamente, se importa aquí para evitar SSR
    import("leaflet.heat").then(() => {
      const heat = (L as unknown as {
        heatLayer: (
          pts: [number, number, number][],
          opts: object
        ) => L.Layer;
      }).heatLayer(heatData, {
        radius:    28,
        blur:      20,
        maxZoom:   17,
        max:       1.0,
        gradient:  { 0.35: "#ca8a04", 0.65: "#ea580c", 1.0: "#dc2626" },
        minOpacity: 0.55,
      });
      heat.addTo(map);
      heatLayerRef.current = heat;
    });

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [data, map]);

  return null;
}

// ─── Componente principal ────────────────────────────────────────────────────
interface Props { data: LocalidadData | null }

export default function LeafletMap({ data }: Props) {
  const initial: [number, number] = [4.6510, -74.0560]; // Bogotá centro

  return (
    <MapContainer
      center={initial}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      {/* Tiles de mapa base (OpenStreetMap - sin API key) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <MapController data={data} />
    </MapContainer>
  );
}
