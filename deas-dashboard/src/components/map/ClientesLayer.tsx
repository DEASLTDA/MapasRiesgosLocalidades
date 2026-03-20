"use client";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const CLIENTES_URL = "https://script.google.com/macros/s/AKfycbwKLD6lBytIor_rl86zPhYRfPib2VaE1jnK4c5I2tbBV9HVKW0GI1dS-hAtcDq9ooPu/exec";

// Color por coordinador
const COORD_COLORS: Record<string, { color: string; rgb: string }> = {
  "JAVIER MILLAN":    { color: "#2563eb", rgb: "37,99,235" },
  "LUIS CEBALLOS":    { color: "#16a34a", rgb: "22,163,74" },
  "WILLIAM BOCANEGRA":{ color: "#dc2626", rgb: "220,38,38" },
  "LUIS MARTINEZ":    { color: "#9333ea", rgb: "147,51,234" },
  "DEIVY VARGAS":     { color: "#ea580c", rgb: "234,88,12" },
};

const DEFAULT_COLOR = { color: "#64748b", rgb: "100,116,139" };

export interface Cliente {
  nombre: string;
  direccion: string;
  coordinador: string;
  localidad?: string;
  lat: number | string;
  long: number | string;
}

interface Props {
  clientes: Cliente[];
  filtroCoordinador: string;
  clienteSeleccionado: string;
  onClienteClick: (cliente: Cliente) => void;
}

export { COORD_COLORS, CLIENTES_URL };

export default function ClientesLayer({
  clientes, filtroCoordinador, clienteSeleccionado, onClienteClick,
}: Props) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!groupRef.current) {
      groupRef.current = L.layerGroup().addTo(map);
    } else {
      groupRef.current.clearLayers();
    }

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
      const cc   = COORD_COLORS[coord] ?? DEFAULT_COLOR;
      const isSelected = cliente.nombre === clienteSeleccionado;
      const size = isSelected ? 36 : 24;
      const h    = Math.round(size * 1.4);

      const icon = L.divIcon({
        className: "",
        iconSize:   [size, h],
        iconAnchor: [size / 2, h],
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}"
          viewBox="0 0 40 56" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">
          <path d="M20 1C10.6 1 3 8.6 3 18C3 31 20 55 20 55C20 55 37 31 37 18C37 8.6 29.4 1 20 1Z"
            fill="${cc.color}" stroke="white" stroke-width="${isSelected ? 3 : 2}"/>
          <circle cx="20" cy="18" r="${isSelected ? 10 : 8}" fill="white" opacity="0.95"/>
          <text x="20" y="${isSelected ? 23 : 22}" text-anchor="middle"
            font-size="${isSelected ? 11 : 9}" font-weight="bold" fill="${cc.color}">🏢</text>
        </svg>`,
      });

      const marker = L.marker([lat, lng], { icon, zIndexOffset: isSelected ? 2000 : 500 });

      marker.bindTooltip(
        `<div style="font-family:sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:12px;color:${cc.color}">${cliente.nombre}</div>
          <div style="font-size:10px;color:#475569;margin-top:2px">📍 ${cliente.direccion}</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px">
            👤 ${cliente.coordinador || "—"}
          </div>
          ${cliente.localidad ? `<div style="font-size:10px;color:#94a3b8">${cliente.localidad}</div>` : ""}
        </div>`,
        { direction: "top", offset: [0, -(h + 4)], opacity: 0.97 }
      );

      marker.on("click", () => onClienteClick(cliente));

      // Si está seleccionado, abrir tooltip automáticamente
      if (isSelected) {
        marker.bindPopup(
          `<div style="font-family:sans-serif;min-width:200px">
            <div style="font-weight:700;font-size:13px;color:${cc.color};margin-bottom:4px">${cliente.nombre}</div>
            <div style="font-size:11px;color:#334155">📍 ${cliente.direccion}</div>
            <div style="font-size:11px;color:#334155;margin-top:3px">👤 ${cliente.coordinador || "—"}</div>
          </div>`,
          { closeButton: true }
        ).openPopup();
      }

      groupRef.current?.addLayer(marker);
    });

    // FlyTo si hay cliente seleccionado
    if (clienteSeleccionado) {
      const cliente = clientes.find(c => c.nombre === clienteSeleccionado);
      if (cliente) {
        const lat = parseFloat(String(cliente.lat).replace(",", "."));
        const lng = parseFloat(String(cliente.long).replace(",", "."));
        if (!isNaN(lat) && !isNaN(lng)) {
          map.flyTo([lat, lng], 16, { duration: 1.2 });
        }
      }
    }

  }, [clientes, filtroCoordinador, clienteSeleccionado, onClienteClick, map]);

  useEffect(() => () => { groupRef.current?.clearLayers(); }, []);
  return null;
}
