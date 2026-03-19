"use client";
import { useState, useEffect } from "react";
import { ClipboardList, Plus, AlertCircle, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { loadEntries, addEntry } from "@/lib/bitacora";
import type { BitacoraEntry } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const GRAVEDADES: BitacoraEntry["gravedad"][] = ["crítica", "alta", "media", "baja"];
const TIPOS = [
  "Intento de ingreso no autorizado",
  "Robo / Hurto",
  "Vandalismo",
  "Falla en sistema de acceso",
  "Falla en CCTV",
  "Incidente de convivencia",
  "Emergencia médica",
  "Incendio / Alarma",
  "Otro",
];

const GRAVEDAD_CONFIG: Record<BitacoraEntry["gravedad"], { color: string; bg: string; icon: React.ReactNode }> = {
  crítica: { color: "text-red-700",    bg: "bg-red-50 border-red-300",    icon: <AlertCircle size={13} className="text-red-600" /> },
  alta:    { color: "text-orange-700", bg: "bg-orange-50 border-orange-300", icon: <AlertTriangle size={13} className="text-orange-600" /> },
  media:   { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-300", icon: <Info size={13} className="text-yellow-600" /> },
  baja:    { color: "text-green-700",  bg: "bg-green-50 border-green-300",  icon: <CheckCircle2 size={13} className="text-green-600" /> },
};

const empty = (): Omit<BitacoraEntry, "id"> => ({
  fecha:        new Date().toISOString().split("T")[0],
  edificio:     "",
  tipoNovedad:  TIPOS[0],
  gravedad:     "media",
  comentarios:  "",
  coordinador:  "",
});

export default function BitacoraModule() {
  const [entries, setEntries]   = useState<BitacoraEntry[]>([]);
  const [form, setForm]         = useState(empty());
  const [open, setOpen]         = useState(false);
  const [saved, setSaved]       = useState(false);
  const [errors, setErrors]     = useState<string[]>([]);

  useEffect(() => { setEntries(loadEntries()); }, []);

  const validate = () => {
    const errs: string[] = [];
    if (!form.edificio.trim())    errs.push("Edificio / Conjunto es requerido.");
    if (!form.coordinador.trim()) errs.push("Nombre del coordinador es requerido.");
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);

    const entry: BitacoraEntry = { ...form, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    const updated = addEntry(entry);
    setEntries(updated);
    setForm(empty());
    setSaved(true);
    setOpen(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const field = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-blue-50 overflow-hidden">
      {/* Header */}
      <div className="bg-[#112288] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-blue-200" />
          <div>
            <p className="text-white font-heading font-bold text-sm tracking-wide uppercase">
              Bitácora de Novedades
            </p>
            <p className="text-blue-300 text-[10px]">{entries.length} registros guardados</p>
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/20"
        >
          {open ? <X size={13} /> : <Plus size={13} />}
          {open ? "Cancelar" : "Nueva Novedad"}
        </button>
      </div>

      {/* Notificación de guardado */}
      {saved && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center gap-2 text-green-700 text-xs font-medium">
          <CheckCircle2 size={13} /> Novedad registrada correctamente.
        </div>
      )}

      {/* Formulario */}
      {open && (
        <div className="p-4 border-b border-slate-100 bg-blue-50/40 animate-card">
          {errors.length > 0 && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 space-y-0.5">
              {errors.map((e) => <p key={e}>• {e}</p>)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Fecha</label>
              <input type="date" value={form.fecha} onChange={field("fecha")}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Gravedad</label>
              <select value={form.gravedad} onChange={field("gravedad")}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30">
                {GRAVEDADES.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Edificio / Conjunto *</label>
              <input type="text" placeholder="Ej. Torre Norte, Cj. El Prado…" value={form.edificio} onChange={field("edificio")}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Coordinador *</label>
              <input type="text" placeholder="Nombre completo" value={form.coordinador} onChange={field("coordinador")}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Tipo de Novedad</label>
            <select value={form.tipoNovedad} onChange={field("tipoNovedad")}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30">
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Comentarios</label>
            <textarea value={form.comentarios} onChange={field("comentarios")} rows={2} placeholder="Descripción detallada del evento…"
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#112288]/30 resize-none" />
          </div>

          <button onClick={handleSubmit}
            className="w-full bg-[#112288] hover:bg-[#1a3399] text-white text-xs font-bold uppercase tracking-widest py-2 rounded-lg transition-colors">
            Guardar Registro
          </button>
        </div>
      )}

      {/* Feed de registros */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {entries.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-xs">
            <ClipboardList size={28} className="mx-auto mb-2 opacity-30" />
            <p>Sin novedades registradas.</p>
            <p className="mt-1">Usa el botón "Nueva Novedad" para comenzar.</p>
          </div>
        ) : (
          entries.map((e) => {
            const cfg = GRAVEDAD_CONFIG[e.gravedad];
            return (
              <div key={e.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    {cfg.icon}
                    <span className="font-semibold text-slate-800 text-xs">{e.tipoNovedad}</span>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                    {e.gravedad}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700">{e.edificio}</span>
                  {" · "}{e.coordinador}
                  {" · "}{format(new Date(e.fecha), "d MMM yyyy", { locale: es })}
                </p>
                {e.comentarios && (
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 italic">"{e.comentarios}"</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
