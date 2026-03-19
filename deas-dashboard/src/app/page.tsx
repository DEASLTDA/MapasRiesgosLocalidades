"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/ui/Header";
import LocalidadSelector from "@/components/ui/LocalidadSelector";
import StatCards from "@/components/ui/StatCards";
import MapWrapper from "@/components/map/MapWrapper";
import RiskGauge from "@/components/charts/RiskGauge";
import CrimeBarChart from "@/components/charts/CrimeBarChart";
import IncidenciasModule, { Incidencia } from "@/components/bitacora/IncidenciasModule";
import { fetchCrimeData, LOCALIDADES_LIST } from "@/lib/crimeData";
import type { LocalidadData } from "@/types";

export default function DashboardPage() {
  const [localidad, setLocalidad]         = useState<string>(LOCALIDADES_LIST[0]);
  const [data, setData]                   = useState<LocalidadData | null>(null);
  const [loading, setLoading]             = useState(false);
  const [selectedCrime, setSelectedCrime] = useState<string | null>(null);
  const [mapIncidents, setMapIncidents]   = useState<Incidencia[]>([]);

  const load = useCallback(async (loc: string) => {
    setLoading(true);
    setSelectedCrime(null);
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
          <LocalidadSelector value={localidad} onChange={setLocalidad} loading={loading} />
          <StatCards data={data} />
        </div>

        {/* ── Fila 2: Mapa + Panel analítico ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 flex-1 min-h-0">

          <div className="h-[480px] lg:h-full min-h-[420px]">
            <div className="h-full flex flex-col relative">

              {/* Leyenda dinámica */}
              <div className="absolute top-3 left-3 z-10 bg-white/92 backdrop-blur-sm rounded-lg shadow-card border border-blue-100 px-3 py-2 max-w-[220px]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  {selectedCrime ? "Filtro activo" : mapIncidents.length > 0 ? "Incidencias en mapa" : "Concentración de Delitos"}
                </p>
                {selectedCrime ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full flex-shrink-0 bg-[#112288]" />
                    <span className="text-[10px] text-[#112288] font-bold truncate">{selectedCrime}</span>
                  </div>
                ) : mapIncidents.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full flex-shrink-0 bg-red-500" />
                    <span className="text-[10px] text-slate-600 font-medium">{mapIncidents.length} incidencia(s)</span>
                    <button onClick={() => setMapIncidents([])} className="text-[9px] text-slate-400 hover:text-red-500 ml-1">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {[
                      { color: "#e11d48", label: "Personas" },
                      { color: "#7c3aed", label: "Resid." },
                      { color: "#0284c7", label: "Vehíc." },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                        <span className="text-[9px] text-slate-600 font-medium">{l.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fuente de datos */}
              <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-slate-200 shadow-sm">
                <p className="text-[9px] text-slate-400 leading-tight">
                  <span className="font-semibold text-slate-600">Fuente:</span> Datos simulados · Secretaría de Seguridad Bogotá
                </p>
                <p className="text-[8px] text-slate-400">
                  Referencia: datos.gov.co · Actualización: tiempo real
                </p>
              </div>

              <MapWrapper
                data={data}
                loading={loading}
                selectedCrime={selectedCrime}
                mapIncidents={mapIncidents}
              />
            </div>
          </div>

          {/* Panel analítico derecho */}
          <div className="flex flex-col gap-4">
            {data ? (
              <>
                <RiskGauge score={data.riskScore} level={data.riskLevel} localidad={data.name} />
                <CrimeBarChart
                  crimes={data.topCrimes}
                  selectedCrime={selectedCrime}
                  onSelectCrime={setSelectedCrime}
                />
              </>
            ) : (
              <div className="flex-1 bg-white rounded-xl shadow-card border border-blue-50 flex items-center justify-center">
                <p className="text-slate-400 text-xs text-center px-4">Selecciona una localidad.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Fila 3: Módulo de Incidencias ── */}
        <IncidenciasModule onShowInMap={setMapIncidents} />

        <footer className="text-center py-3">
          <p className="text-[10px] text-slate-400 tracking-wide">
            DEAS Servicios de Seguridad · Panel Operativo · Datos simulados con fines de análisis interno
          </p>
        </footer>
      </main>
    </div>
  );
}
