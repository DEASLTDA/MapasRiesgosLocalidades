"use client";
import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  ClipboardList, Plus, X, MapPin, Filter,
  AlertCircle, AlertTriangle, Info, CheckCircle2,
  RefreshCw, Map, Eye, EyeOff
} from "lucide-react";

// ─── NUEVA URL del Apps Script ────────────────────────────────────────────────
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxyRKlwRtYG9YHLu30K4IVOxv6PSUHfot5vio8vkT-qa3PZ614Z1rcsouHa_ZAECvIg/exec";

export interface Incidencia {
  id: string;
  fecha: string;
  hora: string;
  coordinador: string;
  cliente: string;
  localidad: string;
  tipo_novedad: string;
  gravedad: "crítica" | "alta" | "media" | "baja";
  descripcion: string;
  direccion: string;
  lat: string;
  lng: string;
}

const COORDINADORES = ["Javier Millan", "Luis Ceballos", "William Bocanegra", "Deivy Vargas", "Luis Martinez"];

const TIPOS_NOVEDAD = [
  "Hurto a personas",
  "Atraco",
  "Fleteo",
  "Hurto a residencia",
  "Hurto de vehículo",
  "Hurto de motocicleta",
  "Hurto a comercio",
  "Hurto a establecimiento",
  "Intento de hurto",
  "Lesiones personales",
  "Riña",
  "Homicidio",
  "Tentativa de homicidio",
  "Violencia intrafamiliar",
  "Amenazas",
  "Extorsión",
  "Secuestro",
  "Accidente de tránsito",
  "Daño a bien ajeno",
  "Intrusión / Acceso no autorizado",
  "Persona sospechosa",
  "Alteración del orden",
  "Emergencia médica",
  "Incendio / Emergencia",
  "Falla en sistema de acceso",
  "Falla en CCTV",
  "Daño en instalaciones",
  "Otro",
];

const LOCALIDADES = [
  "Chapinero","Usaquén","Suba","Kennedy","Engativá",
  "Bosa","Teusaquillo","Barrios Unidos","Fontibón","Puente Aranda","Santa Fe",
];

const GRAVEDAD_CONFIG = {
  crítica: { color: "#dc2626", bg: "bg-red-50",    border: "border-red-300",    text: "text-red-700",    icon: <AlertCircle size={12} className="text-red-600" /> },
  alta:    { color: "#ea580c", bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", icon: <AlertTriangle size={12} className="text-orange-600" /> },
  media:   { color: "#d97706", bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-700",  icon: <Info size={12} className="text-amber-600" /> },
  baja:    { color: "#16a34a", bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700",  icon: <CheckCircle2 size={12} className="text-green-600" /> },
};

const LOCALIDAD_COLORS = ["#e11d48","#7c3aed","#0284c7","#d97706","#059669","#db2777","#ea580c","#0891b2","#65a30d","#9333ea","#f59e0b"];

function cleanDate(val: string): string {
  if (!val) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-");
    return `${d}/${m}/${y}`;
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1990)
      return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { /**/ }
  return val;
}

function cleanTime(val: string): string {
  if (!val) return "—";
  if (/^\d{1,2}:\d{2}$/.test(val)) return val;
  const num = parseFloat(val);
  if (!isNaN(num) && num > 0 && num < 1) {
    const totalMin = Math.round(num * 24 * 60);
    const h = Math.floor(totalMin / 60).toString().padStart(2, "0");
    const m = (totalMin % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime()))
      return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  } catch { /**/ }
  return val;
}

const emptyForm = (): Omit<Incidencia, "id"> => ({
  fecha: new Date().toISOString().split("T")[0],
  hora:  new Date().toTimeString().slice(0, 5),
  coordinador: "", cliente: "", localidad: "",
  tipo_novedad: TIPOS_NOVEDAD[0],
  gravedad: "media",
  descripcion: "", direccion: "", lat: "", lng: "",
});

interface Props {
  onShowInMap?: (incidents: Incidencia[]) => void;
  onHideRisks?: (hide: boolean) => void;
  pinsActive?: boolean;
}

export default function IncidenciasModule({ onShowInMap, onHideRisks, pinsActive }: Props) {
  const [incidents, setIncidents] = useState<Incidencia[]>([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyForm());
  const [saved, setSaved]         = useState(false);
  const [errors, setErrors]       = useState<string[]>([]);
  const [filterCoord, setFilterCoord]     = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterGrav, setFilterGrav]       = useState("");
  const [detail, setDetail]       = useState<Incidencia | null>(null);
  const [risksHidden, setRisksHidden] = useState(false);


  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL + "?t=" + Date.now());
      const data = await res.json();
      if (Array.isArray(data)) setIncidents(data as Incidencia[]);
    } catch { setIncidents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    const errs: string[] = [];
    if (!form.coordinador) errs.push("Selecciona un coordinador.");
    if (!form.cliente.trim()) errs.push("Ingresa el cliente / edificio.");
    if (!form.localidad) errs.push("Selecciona la localidad.");
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setSaving(true);
    const entry: Incidencia = { ...form, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      setTimeout(async () => {
        await loadData();
        setForm(emptyForm());
        setShowForm(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
        setSaving(false);
      }, 1500);
    } catch {
      setErrors(["Error al guardar. Verifica tu conexión."]);
      setSaving(false);
    }
  };

  const handleToggleRisks = () => {
    const next = !risksHidden;
    setRisksHidden(next);
    onHideRisks?.(next);
  };

  const handleShowInMap = () => {
    onShowInMap?.(filtered);
  };

  const filtered = incidents.filter((i) => {
    if (filterCoord   && i.coordinador !== filterCoord) return false;
    if (filterCliente && !i.cliente.toLowerCase().includes(filterCliente.toLowerCase())) return false;
    if (filterGrav    && i.gravedad !== filterGrav) return false;
    return true;
  });

  const byLocalidad = LOCALIDADES.map((loc, i) => ({
    localidad: loc,
    count: incidents.filter((inc) => inc.localidad === loc).length,
    color: LOCALIDAD_COLORS[i],
  })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count);

  const uniqueCoords = Array.from(new Set(incidents.map((i) => i.coordinador).filter(Boolean)));

  const field = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      {/* ── Modal de detalle COMPLETO ── */}
      {detail && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#112288] px-5 py-4 flex items-start justify-between">
              <div>
                <p className="text-white font-heading font-bold text-base tracking-wide uppercase leading-tight">
                  {detail.tipo_novedad || "Sin tipo"}
                </p>
                <p className="text-blue-300 text-xs mt-0.5">
                  {detail.cliente} · {detail.localidad}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-white/70 hover:text-white mt-0.5 ml-4 flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Gravedad */}
            <div className="px-5 pt-4">
              {(() => {
                const cfg = GRAVEDAD_CONFIG[detail.gravedad] ?? GRAVEDAD_CONFIG.media;
                return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                    {cfg.icon} {detail.gravedad}
                  </span>
                );
              })()}
            </div>

            {/* Campos principales */}
            <div className="px-5 pt-3 pb-2 grid grid-cols-2 gap-2">
              {[
                { label: "Fecha",              value: cleanDate(detail.fecha) },
                { label: "Hora",               value: cleanTime(detail.hora) },
                { label: "Coordinador",        value: detail.coordinador || "—" },
                { label: "Localidad",          value: detail.localidad   || "—" },
                { label: "Cliente / Edificio", value: detail.cliente     || "—" },
                { label: "Tipo de Novedad",    value: detail.tipo_novedad|| "—" },
              ].map((r) => (
                <div key={r.label} className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{r.label}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-snug">{r.value}</p>
                </div>
              ))}
            </div>

            {/* Dirección */}
            {detail.direccion && (
              <div className="px-5 pb-2">
                <div className="bg-blue-50 rounded-lg px-3 py-2 flex items-start gap-2">
                  <MapPin size={13} className="text-[#112288] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Dirección</p>
                    <p className="text-xs text-[#112288] font-medium">{detail.direccion}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Descripción */}
            <div className="px-5 pb-2">
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Descripción</p>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {detail.descripcion
                    ? detail.descripcion
                    : <span className="italic text-slate-400">Sin descripción registrada.</span>}
                </p>
              </div>
            </div>

            {/* Coordenadas si son válidas */}
            {detail.lat && detail.lng && detail.lat.includes(".") && (
              <div className="px-5 pb-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <MapPin size={12} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-mono">{detail.lat}, {detail.lng}</span>
                </div>
              </div>
            )}

            <div className="px-5 pb-5 pt-2">
              <button
                onClick={() => setDetail(null)}
                className="w-full bg-[#112288] hover:bg-[#1a3399] text-white text-xs font-bold uppercase tracking-widest py-2.5 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card border border-blue-50 overflow-hidden">
        {/* Header */}
        <div className="bg-[#112288] px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-200" />
            <div>
              <p className="text-white font-heading font-bold text-sm tracking-wide uppercase">
                Registro de Incidencias
              </p>
              <p className="text-blue-300 text-[10px]">
                {incidents.length} eventos · Google Sheets sincronizado
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={loadData} disabled={loading}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-white/20 transition-colors">
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>

            {/* Botón ocultar/mostrar riesgos */}
            <button
              onClick={handleToggleRisks}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                risksHidden
                  ? "bg-yellow-400 text-yellow-900 border-yellow-300"
                  : "bg-white/15 hover:bg-white/25 text-white border-white/20"
              }`}
            >
              {risksHidden ? <Eye size={11} /> : <EyeOff size={11} />}
              {risksHidden ? "Mostrar riesgos" : "Ocultar riesgos"}
            </button>

            {/* Botón mostrar en mapa */}
            {onShowInMap && (
              <button
                onClick={handleShowInMap}
                className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                  pinsActive
                    ? "bg-green-400 text-green-900 border-green-300"
                    : "bg-white/15 hover:bg-white/25 text-white border-white/20"
                }`}
              >
                <Map size={11} />
                {pinsActive ? "Ocultar pines ✓" : "Mostrar en mapa"}
              </button>
            )}

            <button onClick={() => setShowForm((o) => !o)}
              className="flex items-center gap-1.5 bg-white text-[#112288] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              {showForm ? <><X size={13} /> Cancelar</> : <><Plus size={13} /> Nueva Incidencia</>}
            </button>
          </div>
        </div>

        {saved && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center gap-2 text-green-700 text-xs font-medium">
            <CheckCircle2 size={13} /> Incidencia registrada y sincronizada con Google Sheets.
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="p-4 border-b border-slate-100 bg-blue-50/30 animate-card">
            {errors.length > 0 && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 space-y-0.5">
                {errors.map((e) => <p key={e}>• {e}</p>)}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Fecha</label>
                <input type="date" value={form.fecha} onChange={field("fecha")}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Hora</label>
                <input type="time" value={form.hora} onChange={field("hora")}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Gravedad</label>
                <select value={form.gravedad} onChange={field("gravedad")}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30">
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="crítica">Crítica</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Coordinador *</label>
                <select value={form.coordinador} onChange={field("coordinador")}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30">
                  <option value="">Seleccionar…</option>
                  {COORDINADORES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Localidad *</label>
                <select value={form.localidad} onChange={field("localidad")}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30">
                  <option value="">Seleccionar…</option>
                  {LOCALIDADES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Tipo de Novedad</label>
                <select value={form.tipo_novedad} onChange={field("tipo_novedad")}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30">
                  {TIPOS_NOVEDAD.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Cliente / Edificio *</label>
                <input type="text" placeholder="Ej. Torre Norte, Conjunto El Prado…" value={form.cliente} onChange={field("cliente")}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Dirección</label>
                <input type="text" placeholder="Ej. Cra 7 #90-12, Chapinero" value={form.direccion} onChange={field("direccion")}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Descripción</label>
              <textarea value={form.descripcion} onChange={field("descripcion")} rows={2}
                placeholder="Descripción detallada del evento…"
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30 resize-none" />
            </div>

            {/* Coordenadas opcionales */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Latitud <span className="text-slate-300 normal-case font-normal">(para pin en mapa)</span>
                </label>
                <input type="text" placeholder="Ej. 4.6351" value={form.lat} onChange={field("lat")}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Longitud <span className="text-slate-300 normal-case font-normal">(para pin en mapa)</span>
                </label>
                <input type="text" placeholder="Ej. -74.0652" value={form.lng} onChange={field("lng")}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
              </div>
            </div>
            <p className="text-[9px] text-slate-400 -mt-2 mb-3">
              💡 Para obtener coordenadas: abre Google Maps, busca la dirección, clic derecho → copia las coordenadas
            </p>

            <button onClick={handleSubmit} disabled={saving}
              className="w-full bg-[#112288] hover:bg-[#1a3399] disabled:opacity-60 text-white text-xs font-bold uppercase tracking-widest py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              {saving ? <><RefreshCw size={12} className="animate-spin" /> Guardando en Sheets…</> : "Guardar Incidencia"}
            </button>
          </div>
        )}

        {/* Contenido */}
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gráfico */}
            <div className="lg:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Incidencias por Localidad</p>
              <p className="font-heading font-bold text-slate-700 text-sm mb-3">Distribución geográfica</p>
              {byLocalidad.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-xs text-center">
                  <div><MapPin size={24} className="mx-auto mb-2 opacity-30" /><p>Sin datos aún</p></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byLocalidad} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="localidad" type="category" width={90} tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [`${v} evento(s)`, "Incidencias"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={14}>
                      {byLocalidad.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Tabla */}
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Filter size={12} className="text-slate-400" />
                <select value={filterCoord} onChange={(e) => setFilterCoord(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] bg-white focus:outline-none">
                  <option value="">Todos los coordinadores</option>
                  {uniqueCoords.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="text" placeholder="Buscar cliente…" value={filterCliente}
                  onChange={(e) => setFilterCliente(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] bg-white focus:outline-none w-36" />
                <select value={filterGrav} onChange={(e) => setFilterGrav(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] bg-white focus:outline-none">
                  <option value="">Toda gravedad</option>
                  <option value="crítica">Crítica</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
                <span className="text-[10px] text-slate-400 ml-auto">{filtered.length} resultado(s)</span>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                {loading ? (
                  <div className="py-10 flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <RefreshCw size={14} className="animate-spin" /> Cargando desde Google Sheets…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    <ClipboardList size={24} className="mx-auto mb-2 opacity-30" />
                    <p>Sin incidencias registradas.</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          {["Fecha/Hora","Coordinador","Cliente","Localidad","Gravedad",""].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filtered.map((inc) => {
                          const cfg = GRAVEDAD_CONFIG[inc.gravedad] ?? GRAVEDAD_CONFIG.media;
                          return (
                            <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2 text-slate-500 whitespace-nowrap font-mono text-[10px]">
                                {cleanDate(inc.fecha)}<br />{cleanTime(inc.hora)}
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-700">{inc.coordinador}</td>
                              <td className="px-3 py-2 text-slate-600 max-w-[100px] truncate">{inc.cliente}</td>
                              <td className="px-3 py-2 text-slate-500">{inc.localidad}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                                  {cfg.icon}{inc.gravedad}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <button onClick={() => setDetail(inc)}
                                  className="flex items-center gap-1 text-[#112288] hover:bg-blue-50 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors border border-blue-100">
                                  <Eye size={11} /> Ver
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
