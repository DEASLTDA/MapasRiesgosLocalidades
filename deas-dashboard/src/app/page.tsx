"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/ui/Header";
import LocalidadSelector from "@/components/ui/LocalidadSelector";
import StatCards from "@/components/ui/StatCards";
import MapWrapper from "@/components/map/MapWrapper";
import RiskGauge from "@/components/charts/RiskGauge";
import CrimeBarChart from "@/components/charts/CrimeBarChart";
import IncidenciasModule, { Incidencia } from "@/components/bitacora/IncidenciasModule";
import SiedcoAdmin from "@/components/ui/SiedcoAdmin";
import { fetchCrimeData, LOCALIDADES_LIST } from "@/lib/crimeData";
import { BOGOTA_LOCALIDADES } from "@/lib/bogotaGeoJson";
import type { LocalidadData } from "@/types";

interface SiedcoRow {
  localidad: string;
  hurto_personas: number;
  hurto_residencias: number;
  hurto_autos: number;
  lesiones: number;
  violencia: number;
  año: number;
}

function calcRiskLevel(score: number): "alto" | "medio" | "bajo" {
  if (score >= 65) return "alto";
  if (score >= 35) return "medio";
  return "bajo";
}

export default function DashboardPage() {
  const [localidad, setLocalidad]         = useState<string>("");
  const [data, setData]                   = useState<LocalidadData | null>(null);
  const [loading, setLoading]             = useState(false);
  const [selectedCrime, setSelectedCrime] = useState<string | null>(null);
  const [mapIncidents, setMapIncidents]   = useState<Incidencia[]>([]);
  const [hideRisks, setHideRisks]         = useState(false);
  const [showAdmin, setShowAdmin]         = useState(false);
  const [siedcoData, setSiedcoData]       = useState<SiedcoRow[]>([]);
  const [siedcoTotals, setSiedcoTotals]   = useState<Record<string, number>>({});

  // Cuando llegan datos de Sheets, actualiza la vista de la localidad seleccionada
  const handleSiedcoUpdate = useCallback((rows: SiedcoRow[]) => {
    setSiedcoData(rows);
    // Calcular totales por localidad para el mapa de calor
    const totals: Record<string, number> = {};
    rows.forEach((r) => {
      totals[r.localidad] = (r.hurto_personas || 0) + (r.hurto_residencias || 0) +
        (r.hurto_autos || 0) + (r.lesiones || 0) + (r.violencia || 0);
    });
    setSiedcoTotals(totals);
  }, []);

  const buildDataFromSiedco = useCallback((loc: string, rows: SiedcoRow[]): LocalidadData | null => {
    const row = rows.find((r) => r.localidad === loc);
    const geo = BOGOTA_LOCALIDADES.find((l) => l.name === loc);
    if (!row || !geo) return null;

    const total = row.hurto_personas + row.hurto_residencias + row.hurto_autos + row.lesiones + row.violencia;
    const topCrimes = [
      { label: "Hurto a personas",        value: Math.round((row.hurto_personas    / total) * 100) },
      { label: "Hurto a residencias",     value: Math.round((row.hurto_residencias / total) * 100) },
      { label: "Lesiones personales",     value: Math.round((row.lesiones          / total) * 100) },
      { label: "Violencia intrafamiliar", value: Math.round((row.violencia         / total) * 100) },
      { label: "Hurto automotores",       value: Math.round((row.hurto_autos       / total) * 100) },
    ].sort((a, b) => b.value - a.value);

    // Score basado en total relativo al promedio Bogotá
    const avgBogota = 8000;
    const riskScore = Math.min(100, Math.round((total / avgBogota) * 100));

    return {
      name:      loc,
      center:    geo.coords[0] ? [geo.coords[Math.floor(geo.coords.length / 2)][1], geo.coords[Math.floor(geo.coords.length / 2)][0]] : [4.651, -74.098],
      zoom:      14,
      riskScore,
      riskLevel: calcRiskLevel(riskScore),
      topCrimes,
      points:    [],
    };
  }, []);

  const load = useCallback(async (loc: string) => {
    if (!loc) { setData(null); return; }
    setLoading(true);
    setSelectedCrime(null);
    try {
      // Primero intentar con datos de Sheets (más recientes)
      const fromSheets = buildDataFromSiedco(loc, siedcoData);
      if (fromSheets) {
        setData(fromSheets);
      } else {
        // Fallback a datos locales
        const d = await fetchCrimeData(loc);
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, [siedcoData, buildDataFromSiedco]);

  useEffect(() => { load(localidad); }, [localidad, load]);

  // Cuando llegan datos de Sheets y hay localidad seleccionada, actualizar
  useEffect(() => {
    if (localidad && siedcoData.length > 0) {
      const fromSheets = buildDataFromSiedco(localidad, siedcoData);
      if (fromSheets) setData(fromSheets);
    }
  }, [siedcoData, localidad, buildDataFromSiedco]);

  const handleShowInMap = (incidents: Incidencia[]) => {
    setMapIncidents(mapIncidents.length > 0 ? [] : incidents);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f1f5fb]">
      <Header onAdminClick={() => setShowAdmin(true)} />

      {/* Panel Admin */}
      {showAdmin && (
        <SiedcoAdmin
          onClose={() => setShowAdmin(false)}
          onDataUpdated={handleSiedcoUpdate}
        />
      )}

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 flex flex-col gap-4">

        {/* Fila 1: Filtro + KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3 items-start">
          <LocalidadSelector value={localidad} onChange={setLocalidad} loading={loading} />
          <StatCards data={data} />
        </div>

        {/* Fila 2: Mapa + Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 flex-1 min-h-0">
          <div className="h-[480px] lg:h-full min-h-[420px]">
            <div className="h-full flex flex-col relative">

              {/* Leyenda */}
              <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-card border border-blue-100 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                  {localidad ? `${localidad} · Datos SIEDCO` : "Nivel de Delitos · Bogotá D.C."}
                </p>
                <div className="flex items-center gap-2">
                  {[
                    { color: "#dc2626", label: "Alto" },
                    { color: "#ea580c", label: "Medio-alto" },
                    { color: "#d97706", label: "Medio" },
                    { color: "#16a34a", label: "Bajo" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
                      <span className="text-[9px] text-slate-600 font-medium">{l.label}</span>
                    </div>
                  ))}
                </div>
                {mapIncidents.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-100">
                    <span className="w-3 h-3 rounded-full bg-[#dc2626]" />
                    <span className="text-[9px] text-slate-600">{mapIncidents.length} incidencia(s)</span>
                    <button onClick={() => setMapIncidents([])} className="text-[9px] text-slate-400 hover:text-red-500 ml-1">✕</button>
                  </div>
                )}
              </div>

              {/* Fuente */}
              <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-slate-200 shadow-sm">
                <p className="text-[9px] text-slate-400 leading-tight">
                  <span className="font-semibold text-slate-600">Fuente:</span> SIEDCO · Sec. Distrital de Seguridad
                </p>
                <p className="text-[8px] text-slate-400">
                  {siedcoData.length > 0
                    ? `✓ Datos actualizados · ${siedcoData.length} localidades`
                    : "Datos base dic/2025"}
                </p>
              </div>

              <MapWrapper
                data={data}
                loading={loading}
                selectedCrime={selectedCrime}
                mapIncidents={mapIncidents}
                hideRisks={hideRisks}
                siedcoData={siedcoTotals}
              />
            </div>
          </div>

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
              <div className="flex-1 bg-white rounded-xl shadow-card border border-blue-50 flex flex-col items-center justify-center gap-3 p-4">
                <p className="text-slate-400 text-xs text-center">
                  Selecciona una localidad para ver el análisis detallado.
                </p>
                <p className="text-slate-300 text-[10px] text-center">
                  O explora el mapa para ver el nivel de riesgo de cada zona.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fila 3: Incidencias */}
        <IncidenciasModule
          onShowInMap={handleShowInMap}
          onHideRisks={setHideRisks}
          pinsActive={mapIncidents.length > 0}
        />

        <footer className="text-center py-3">
          <p className="text-[10px] text-slate-400 tracking-wide">
            DEAS Servicios de Seguridad · Panel Operativo · Bogotá D.C. · Fuente: SIEDCO
          </p>
        </footer>
      </main>
    </div>
  );
}
