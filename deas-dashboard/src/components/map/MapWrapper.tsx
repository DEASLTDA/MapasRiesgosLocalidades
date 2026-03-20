"use client";
import dynamic from "next/dynamic";
import type { LocalidadData } from "@/types";
import type { Incidencia } from "@/components/bitacora/IncidenciasModule";
import type { Cliente } from "@/components/map/ClientesLayer";

const DynamicMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-blue-50 rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#112288] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Cargando mapa…</p>
      </div>
    </div>
  ),
});

interface Props {
  data: LocalidadData | null;
  loading: boolean;
  selectedCrime: string | null;
  mapIncidents: Incidencia[];
  hideRisks: boolean;
  siedcoData?: Record<string, number>;
  clientes?: Cliente[];
  filtroCoord?: string;
  clienteSel?: string;
  onClienteClick?: (c: Cliente) => void;
}

export default function MapWrapper({ data, loading, selectedCrime, mapIncidents, hideRisks, siedcoData, clientes = [], filtroCoord = "", clienteSel = "", onClienteClick }: Props) {
  return (
    <div className="relative h-full rounded-xl overflow-hidden shadow-card border border-blue-100">
      {loading && (
        <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-[3px] border-[#112288] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#112288] font-semibold">Analizando sector…</p>
          </div>
        </div>
      )}
      <DynamicMap
        data={data}
        selectedCrime={selectedCrime}
        mapIncidents={mapIncidents}
        hideRisks={hideRisks}
        siedcoData={siedcoData}
        clientes={clientes}
        filtroCoord={filtroCoord}
        clienteSel={clienteSel}
        onClienteClick={onClienteClick}
      />
    </div>
  );
}
