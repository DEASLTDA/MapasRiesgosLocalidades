"use client";
import { useState, useEffect, useCallback } from "react";
import {
  X, Database, ExternalLink, CheckCircle2,
  ChevronRight, RefreshCw, BarChart2, Save
} from "lucide-react";

const SIEDCO_URL =
  "https://script.google.com/macros/s/AKfycbzn1_4OIY__8s1kqKLWzJ29e_lwHXSq6Up2e30FMdS6EYsZGHP-AMW-OwyvD80xqrbc/exec";

const LOCALIDADES_DEAS = [
  "Usaquén",
  "Chapinero",
  "Santa Fe",
  "Suba",
  "Barrios Unidos",
  "Teusaquillo",
];

interface SiedcoRow {
  localidad: string;
  hurto_personas: number;
  hurto_residencias: number;
  hurto_autos: number;
  lesiones: number;
  violencia: number;
  año: number;
}

const EMPTY_FORM = {
  hurto_personas:    "",
  hurto_residencias: "",
  hurto_autos:       "",
  lesiones:          "",
  violencia:         "",
  año:               new Date().getFullYear().toString(),
};

const FIELDS: { key: keyof typeof EMPTY_FORM; label: string; emoji: string; hint: string }[] = [
  { key: "hurto_personas",    label: "Hurto a personas",       emoji: "👤", hint: "Ej. 6.813" },
  { key: "hurto_residencias", label: "Hurto a residencias",    emoji: "🏠", hint: "Ej. 470" },
  { key: "hurto_autos",       label: "Hurto automotores",      emoji: "🚗", hint: "Ej. 79" },
  { key: "lesiones",          label: "Lesiones personales",    emoji: "🤕", hint: "Ej. 650" },
  { key: "violencia",         label: "Violencia intrafamiliar",emoji: "👊", hint: "Ej. 1.129" },
];

function parseNum(val: string): number {
  return parseInt(val.replace(/[.,\s]/g, ""), 10) || 0;
}

interface Props {
  onClose: () => void;
  onDataUpdated: (data: SiedcoRow[]) => void;
}

export default function SiedcoAdmin({ onClose, onDataUpdated }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saved, setSaved]           = useState<string[]>([]);
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [existing, setExisting]     = useState<SiedcoRow[]>([]);
  const [errors, setErrors]         = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const currentLocalidad = LOCALIDADES_DEAS[currentIdx];

  // Cargar datos existentes del Sheet
  const loadExisting = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(SIEDCO_URL + "?t=" + Date.now());
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setExisting(data);
        onDataUpdated(data);
        // Fecha última actualización
        const años = data.map((d: SiedcoRow) => d.año).filter(Boolean);
        if (años.length) setLastUpdate(`Año ${Math.max(...años.map(Number))}`);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [onDataUpdated]);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  // Pre-llenar si ya hay datos para esta localidad
  useEffect(() => {
    const row = existing.find((r) => r.localidad === currentLocalidad);
    if (row) {
      setForm({
        hurto_personas:    String(row.hurto_personas    || ""),
        hurto_residencias: String(row.hurto_residencias || ""),
        hurto_autos:       String(row.hurto_autos       || ""),
        lesiones:          String(row.lesiones          || ""),
        violencia:         String(row.violencia         || ""),
        año:               String(row.año               || new Date().getFullYear()),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [currentLocalidad, existing]);

  const validate = () => {
    const errs: string[] = [];
    if (!parseNum(form.hurto_personas))    errs.push("Hurto a personas es requerido.");
    if (!parseNum(form.hurto_residencias)) errs.push("Hurto a residencias es requerido.");
    return errs;
  };

  const handleSave = async (goNext: boolean) => {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setSaving(true);

    const payload: SiedcoRow = {
      localidad:         currentLocalidad,
      hurto_personas:    parseNum(form.hurto_personas),
      hurto_residencias: parseNum(form.hurto_residencias),
      hurto_autos:       parseNum(form.hurto_autos),
      lesiones:          parseNum(form.lesiones),
      violencia:         parseNum(form.violencia),
      año:               parseInt(form.año) || new Date().getFullYear(),
    };

    try {
      await fetch(SIEDCO_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Actualizar estado local
      const updated = [
        ...existing.filter((r) => r.localidad !== currentLocalidad),
        payload,
      ];
      setExisting(updated);
      onDataUpdated(updated);
      setSaved((s) => Array.from(new Set([...s, currentLocalidad])));

      if (goNext && currentIdx < LOCALIDADES_DEAS.length - 1) {
        setCurrentIdx((i) => i + 1);
        setForm(EMPTY_FORM);
      }
    } catch {
      setErrors(["Error al guardar. Verifica tu conexión."]);
    } finally {
      setSaving(false);
    }
  };

  const isComplete = saved.length === LOCALIDADES_DEAS.length;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pt-16 pb-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-card">

        {/* Header */}
        <div className="bg-[#112288] px-5 py-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-blue-300" />
              <p className="text-white font-heading font-bold text-base tracking-wide uppercase">
                Actualizar Datos SIEDCO
              </p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          <p className="text-blue-300 text-xs">
            Secretaría Distrital de Seguridad · {lastUpdate || "Sin datos previos"}
          </p>

          {/* Progreso */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-blue-200 text-[10px] font-semibold uppercase tracking-wider">
                Progreso
              </span>
              <span className="text-white text-[10px] font-bold">
                {saved.length}/{LOCALIDADES_DEAS.length} localidades
              </span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${(saved.length / LOCALIDADES_DEAS.length) * 100}%` }}
              />
            </div>
            {/* Chips de localidades */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {LOCALIDADES_DEAS.map((loc, i) => {
                const isDone    = saved.includes(loc);
                const isCurrent = i === currentIdx;
                return (
                  <button
                    key={loc}
                    onClick={() => setCurrentIdx(i)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                      isDone
                        ? "bg-green-400 border-green-300 text-green-900"
                        : isCurrent
                        ? "bg-white text-[#112288] border-white"
                        : "bg-white/15 border-white/30 text-white/70"
                    }`}
                  >
                    {isDone ? "✓ " : ""}{loc}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-5">
          {isComplete ? (
            <div className="text-center py-6">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
              <p className="font-heading font-bold text-xl text-slate-800">¡Actualización completa!</p>
              <p className="text-slate-500 text-sm mt-1">
                Los datos de las 5 localidades DEAS están actualizados.
              </p>
              <p className="text-slate-400 text-xs mt-2">
                El mapa y los KPIs ya reflejan los nuevos datos.
              </p>
              <button
                onClick={onClose}
                className="mt-5 w-full bg-[#112288] text-white font-bold text-sm py-2.5 rounded-xl"
              >
                Cerrar y ver dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Localidad actual */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Localidad {currentIdx + 1} de {LOCALIDADES_DEAS.length}
                  </p>
                  <p className="font-heading font-bold text-2xl text-[#112288]">
                    {currentLocalidad}
                  </p>
                </div>
                <a
                  href="https://analitica.scj.gov.co/analytics/saw.dll?Portal"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-[#112288] bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink size={11} />
                  Abrir SIEDCO
                </a>
              </div>

              {/* Año */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Año del reporte
                </label>
                <input
                  type="number"
                  value={form.año}
                  onChange={(e) => setForm((f) => ({ ...f, año: e.target.value }))}
                  className="w-24 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30"
                />
              </div>

              {/* Errores */}
              {errors.length > 0 && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">
                  {errors.map((e) => <p key={e}>• {e}</p>)}
                </div>
              )}

              {/* Campos */}
              <div className="space-y-2 mb-5">
                {FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                    <span className="text-xl w-7 flex-shrink-0">{f.emoji}</span>
                    <label className="flex-1 text-sm font-semibold text-slate-700">
                      {f.label}
                    </label>
                    <input
                      type="text"
                      placeholder={f.hint}
                      value={form[f.key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-28 text-right border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30 placeholder:text-slate-300"
                    />
                  </div>
                ))}
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-[#112288] text-[#112288] font-bold text-sm py-2.5 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <Save size={15} />
                  Guardar
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving || currentIdx === LOCALIDADES_DEAS.length - 1}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#112288] text-white font-bold text-sm py-2.5 rounded-xl hover:bg-[#1a3399] transition-colors disabled:opacity-50"
                >
                  {saving
                    ? <><RefreshCw size={14} className="animate-spin" /> Guardando…</>
                    : <><ChevronRight size={15} /> Guardar y siguiente</>
                  }
                </button>
              </div>

              {/* Instrucción */}
              <p className="text-center text-[10px] text-slate-400 mt-3">
                💡 Abre SIEDCO → selecciona <b>{currentLocalidad}</b> → copia los números ENE-DIC del año actual
              </p>
            </>
          )}
        </div>

        {/* Footer con recarga */}
        {!isComplete && (
          <div className="px-5 pb-4 border-t border-slate-100 pt-3 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              Los cambios se guardan en Google Sheets y se aplican al instante.
            </p>
            <button
              onClick={loadExisting}
              disabled={loading}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-[#112288] transition-colors"
            >
              <RefreshCw size={10} className={loading ? "animate-spin" : ""} />
              Sincronizar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
