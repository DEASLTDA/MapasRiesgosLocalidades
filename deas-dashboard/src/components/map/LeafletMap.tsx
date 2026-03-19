"use client";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, CircleMarker } from "react-leaflet";
import type { LocalidadData } from "@/types";
import L from "leaflet";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function getColor(intensity: number): string {
  if (intensity > 0.7) return "#dc2626";
  if (intensity > 0.45) return "#ea580c";
  return "#ca8a04";
}

function MapController({ data }: { data: LocalidadData | null }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    map.flyTo(data.center, data.zoom, { duration: 1.4, easeLinearity: 0.4 });
  }, [data, map]);
  return null;
}

interface Props { data: LocalidadData | null }

export default function LeafletMap({ data }: Props) {
  const initial: [number, number] = [4.6510, -74.0560];
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
      {data?.points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={p.intensity * 14}
          pathOptions={{
            color: "transparent",
            fillColor: getColor(p.intensity),
            fillOpacity: 0.45 + p.intensity * 0.3,
          }}
        />
      ))}
    </MapContainer>
  );
}
