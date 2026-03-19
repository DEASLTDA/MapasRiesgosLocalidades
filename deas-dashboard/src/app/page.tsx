"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/ui/Header";
import LocalidadSelector from "@/components/ui/LocalidadSelector";
import StatCards from "@/components/ui/StatCards";
import MapWrapper from "@/components/map/MapWrapper";
import RiskGauge from "@/components/charts/RiskGauge";
import CrimeBarChart from "@/components/charts/CrimeBarChart";
import BitacoraModule from "@/components/bitacora/BitacoraModule";
import { fetchCrimeData, LOCALIDADES_LIST } from "@/lib/crimeData";
import type { LocalidadData } from "@/types";

export default function DashboardPage() {
  const [localidad, setLocalidad]   = useState<string>(LOCALIDADES_LIST[0]);
  const [data, setData]             = useState<LocalidadData | null>(null);
  const [loading, setLoading]       = useState(false);

  const load = useCallback(async (loc: string) => {
    setLoading(true);
    try {
      const d = await fetchCrimeData(loc);
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(localidad); }, [localidad, load]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5fb]">
      <Header />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 flex flex-col gap-4">

        {/* ── Fila 1: Filtro + KPIs ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3 items-start">
          <LocalidadSelector
            value={localidad}
            onChange={setLocalidad}
            loading={loading}
          />
          <StatCards data={data} />
        </div>

        {/* ── Fila 2: Mapa + Panel analítico ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 flex-1 min-h-0">

          {/* Mapa interactivo */}
          <div className="h-[480px] lg:h-full min-h-[420px]">
            <div className="h-full flex flex-col gap-0 relative">
              {/* Leyenda del heatmap */}
              <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-card border border-blue-100 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  Concentración de Delitos
                </p>
                <div className="flex items-center gap-2">
                  {[
                    { color: "#dc2626", label: "Alto" },
                    { color: "#ea580c", label: "Medio" },
                    { color: "#ca8a04", label: "Bajo" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                      <span className="text-[9px] text-slate-600 font-medium">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <MapWrapper data={data} loading={loading} />
            </div>
          </div>

          {/* Panel analítico derecho */}
          <div className="flex flex-col gap-4">
            {data ? (
              <>
                <RiskGauge
                  score={data.riskScore}
                  level={data.riskLevel}
                  localidad={data.name}
                />
                <CrimeBarChart crimes={data.topCrimes} />
              </>
            ) : (
              <div className="flex-1 bg-white rounded-xl shadow-card border border-blue-50 flex items-center justify-center">
                <p className="text-slate-400 text-xs text-center px-4">
                  Selecciona una localidad para ver el análisis.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Fila 3: Bitácora ── */}
        <BitacoraModule />

        {/* Footer */}
        <footer className="text-center py-3">
          <p className="text-[10px] text-slate-400 tracking-wide">
            DEAS Servicios de Seguridad · Panel Operativo · Datos simulados con fines de análisis interno
          </p>
        </footer>
      </main>
    </div>
  );
}
