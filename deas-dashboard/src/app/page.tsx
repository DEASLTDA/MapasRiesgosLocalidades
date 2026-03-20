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
import { fetchCrimeData } from "@/lib/crimeData";
import type { LocalidadData } from "@/types";

// ── Constantes fuera del componente ──────────────────────────────────────────
const SIEDCO_URL = "https://script.google.com/macros/s/AKfycbx6FUDYg80JhC1DwTtrCfUsFTVbeW3I_beqTA3hDYjMpEkZlODO-FeF8N-FXeTw3hg-/exec";

const GEO_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  "Usaquén":        { center: [4.7050, -74.0317], zoom: 13 },
  "Chapinero":      { center: [4.6490, -74.0630], zoom: 14 },
  "Santa Fe":       { center: [4.6100, -74.0700], zoom: 14 },
  "Suba":           { center: [4.7380, -74.0850], zoom: 13 },
  "Barrios Unidos": { center: [4.6680, -74.0820], zoom: 14 },
  "Teusaquillo":    { center: [4.6440, -74.0920], zoom: 14 },
};

// Parser robusto — maneja "5444", "5.444", 5444
function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Math.round(val);
  const cleaned = String(val).trim().replace(/\./g, "").replace(/,/g, "");
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

function calcRiskLevel(score: number): "alto" | "medio" | "bajo" {
  if (score >= 65) return "alto";
  if (score >= 35) return "medio";
  return "bajo";
}

interface SiedcoRow {
  localidad: string;
  hurto_personas: unknown;
  hurto_residencias: unknown;
  hurto_autos: unknown;
  lesiones: unknown;
  homicidios: unknown;
  extorsion: unknown;
  año: unknown;
}

function buildFromSiedco(loc: string, rows: SiedcoRow[]): LocalidadData | null {
  const row = rows.find((r) => String(r.localidad).trim() === loc);
  if (!row) return null;
  const geo = GEO_CENTERS[loc];
  if (!geo) return null;

  const hp  = parseNum(row.hurto_personas);
  const hr  = parseNum(row.hurto_residencias);
  const ha  = parseNum(row.hurto_autos);
  const lp  = parseNum(row.lesiones);
  const hom = parseNum(row.homicidios);
  const ext = parseNum(row.extorsion);
  const total = hp + hr + ha + lp + hom + ext;
  if (total === 0) return null;

  const topCrimes = [
    { label: "Hurto a personas",    value: Math.round((hp  / total) * 100) },
    { label: "Hurto a residencias", value: Math.round((hr  / total) * 100) },
    { label: "Lesiones personales", value: Math.round((lp  / total) * 100) },
    { label: "Homicidios",          value: Math.round((hom / total) * 100) },
    { label: "Extorsión",           value: Math.round((ext / total) * 100) },
  ].sort((a, b) => b.value - a.value);

  const riskScore = Math.min(100, Math.round((total / 15000) * 100));

  return {
    name:      loc,
    center:    geo.center,
    zoom:      geo.zoom,
    riskScore,
    riskLevel: calcRiskLevel(riskScore),
    topCrimes,
    points:    [],
  };
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [localidad, setLocalidad]         = useState<string>("");
  const [data, setData]                   = useState<LocalidadData | null>(null);
  const [loading, setLoading]             = useState(false);
  const [selectedCrime, setSelectedCrime] = useState<string | null>(null);
  const [mapIncidents, setMapIncidents]   = useState<Incidencia[]>([]);
  const [hideRisks, setHideRisks]         = useState(false);
  const [showAdmin, setShowAdmin]         = useState(false);
  const [siedcoRows, setSiedcoRows]       = useState<SiedcoRow[]>([]);
  const [siedcoTotals, setSiedcoTotals]   = useState<Record<string, number>>({});

  // Actualiza totales para el mapa y recalcula data si hay localidad activa
  const applySiedcoRows = useCallback((rows: SiedcoRow[]) => {
    setSiedcoRows(rows);
    const totals: Record<string, number> = {};
    rows.forEach((r) => {
      const loc = String(r.localidad).trim();
      totals[loc] = parseNum(r.hurto_personas) + parseNum(r.hurto_residencias) +
        parseNum(r.hurto_autos) + parseNum(r.lesiones) +
        parseNum(r.homicidios) + parseNum(r.extorsion);
    });
    setSiedcoTotals(totals);
  }, []);

  // Total real de delitos para la localidad activa (para StatCards)
  const totalDelitosLocalidad = siedcoRows.length > 0 && localidad
    ? (() => {
        const row = siedcoRows.find(r => String(r.localidad).trim() === localidad);
        if (!row) return null;
        return parseNum(row.hurto_personas) + parseNum(row.hurto_residencias) +
          parseNum(row.hurto_autos) + parseNum(row.lesiones) +
          parseNum(row.homicidios) + parseNum(row.extorsion);
      })()
    : null;

  // Auto-carga Sheets al iniciar
  useEffect(() => {
    fetch(SIEDCO_URL + "?t=" + Date.now())
      .then(r => r.json())
      .then(rows => { if (Array.isArray(rows) && rows.length > 0) applySiedcoRows(rows); })
      .catch(() => {});
  }, [applySiedcoRows]);

  // Cuando Sheets llega Y hay localidad activa → actualizar KPIs
  useEffect(() => {
    if (siedcoRows.length === 0 || !localidad) return;
    const d = buildFromSiedco(localidad, siedcoRows);
    if (d) setData(d);
  }, [siedcoRows, localidad]);

  // Cambio de localidad
  useEffect(() => {
    if (!localidad) { setData(null); return; }
    setLoading(true);
    setSelectedCrime(null);
    const fromSheets = buildFromSiedco(localidad, siedcoRows);
    if (fromSheets) {
      setData(fromSheets);
      setLoading(false);
    } else {
      fetchCrimeData(localidad)
        .then(d => setData(d))
        .finally(() => setLoading(false));
    }
  }, [localidad]); // eslint-disable-line react-hooks/exhaustive-deps

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
          onDataUpdated={applySiedcoRows}
        />
      )}

      {/* Barra sticky: Selector + KPIs */}
      <div className="sticky top-[68px] z-40 bg-[#f1f5fb] border-b border-blue-100 shadow-sm">
        <div className="max-w-[1600px] w-full mx-auto px-4 py-3">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 items-center">
            <LocalidadSelector value={localidad} onChange={setLocalidad} loading={loading} />
            <StatCards data={data} totalDelitos={totalDelitosLocalidad} localidad={localidad} />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 flex flex-col gap-4">

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
                  {siedcoRows.length > 0
                    ? `✓ Datos actualizados · ${siedcoRows.length} localidades`
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
              </div>
            )}
          </div>
        </div>

        {/* Incidencias */}
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
