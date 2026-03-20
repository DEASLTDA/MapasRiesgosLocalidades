"use client";
import { useState, useEffect, useCallback } from "react";
import { Building2, Search, X, RefreshCw, ChevronDown, Plus, Save } from "lucide-react";

const CLIENTES_URL = "https://script.google.com/macros/s/AKfycbwKLD6lBytIor_rl86zPhYRfPib2VaE1jnK4c5I2tbBV9HVKW0GI1dS-hAtcDq9ooPu/exec";

export const COORD_COLORS: Record<string, { color: string }> = {
  "JAVIER MILLAN":    { color: "#2563eb" },
  "LUIS CEBALLOS":    { color: "#16a34a" },
  "WILLIAM BOCANEGRA":{ color: "#dc2626" },
  "LUIS MARTINEZ":    { color: "#9333ea" },
  "DEIVY VARGAS":     { color: "#ea580c" },
};

const COORDINADORES_LIST = Object.keys(COORD_COLORS);

export interface Cliente {
  nombre: string;
  direccion: string;
  coordinador: string;
  localidad?: string;
  lat: number | string;
  long: number | string;
}

const EMPTY_FORM = { nombre: "", direccion: "", coordinador: "", localidad: "" };

interface Props {
  onShowClientes: (clientes: Cliente[]) => void;
  onFiltroChange: (filtro: string) => void;
  onClienteSelect: (nombre: string) => void;
  clientesVisible: boolean;
  filtroActual: string;
  clienteSeleccionado: string;
}

export default function ClientesPanel({
  onShowClientes, onFiltroChange, onClienteSelect,
  clientesVisible, filtroActual, clienteSeleccionado,
}: Props) {
  const [clientes, setClientes]     = useState<Cliente[]>([]);
  const [loading, setLoading]       = useState(false);
  const [busqueda, setBusqueda]     = useState("");
  const [expanded, setExpanded]     = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  const cargarClientes = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(CLIENTES_URL + "?t=" + Date.now());
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setClientes(data);
        if (clientesVisible) onShowClientes(data);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [clientesVisible, onShowClientes]);

  useEffect(() => { cargarClientes(); }, [cargarClientes]);

  const clientesFiltrados = clientes.filter(c => {
    const matchCoord = !filtroActual ||
      String(c.coordinador).toUpperCase().trim() === filtroActual.toUpperCase();
    const matchBusq  = !busqueda ||
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.direccion || "").toLowerCase().includes(busqueda.toLowerCase());
    return matchCoord && matchBusq;
  });

  const handleToggle = () => {
    if (clientesVisible) onShowClientes([]);
    else onShowClientes(clientes);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.direccion || !form.coordinador) return;
    setSaving(true);
    try {
      await fetch(CLIENTES_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setForm(EMPTY_FORM);
      setTimeout(() => {
        setSaved(false);
        setShowForm(false);
        cargarClientes();
      }, 1500);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-[#112288] rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-300" />
            <div>
              <p className="text-white font-bold text-sm uppercase tracking-wide">Clientes DEAS</p>
              <p className="text-blue-300 text-[10px]">{clientes.length} clientes · {COORDINADORES_LIST.length} coordinadores</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cargarClientes} disabled={loading}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <RefreshCw size={13} className={`text-blue-200 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => { setShowForm(!showForm); setExpanded(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                showForm ? "bg-white text-[#112288]" : "bg-white/15 text-white hover:bg-white/25"
              }`}>
              <Plus size={13} /> Nuevo cliente
            </button>
            <button onClick={handleToggle}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                clientesVisible ? "bg-green-400 text-green-900" : "bg-white/15 text-white hover:bg-white/25"
              }`}>
              {clientesVisible ? "Ocultar pines" : "Ver en mapa"}
            </button>
            <button onClick={() => { setExpanded(!expanded); setShowForm(false); }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <ChevronDown size={14} className={`text-blue-200 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Chips coordinadores */}
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => onFiltroChange("")}
            className={`text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all ${
              !filtroActual ? "bg-white text-[#112288] border-white" : "bg-white/15 border-white/30 text-white/70 hover:bg-white/25"
            }`}>
            Todos ({clientes.length})
          </button>
          {COORDINADORES_LIST.map(coord => {
            const count  = clientes.filter(c => String(c.coordinador).toUpperCase().trim() === coord).length;
            const cc     = COORD_COLORS[coord];
            const active = filtroActual.toUpperCase() === coord;
            return (
              <button key={coord} onClick={() => onFiltroChange(active ? "" : coord)}
                className={`text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                  active ? "bg-white border-white" : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
                }`}
                style={active ? { color: cc.color } : {}}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                  style={{ backgroundColor: active ? cc.color : "white", opacity: active ? 1 : 0.6 }} />
                {coord.split(" ")[0]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulario nuevo cliente */}
      {showForm && (
        <div className="bg-white px-5 py-4 border-t border-blue-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            Registrar nuevo cliente
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Nombre del cliente *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="E.D. EJEMPLO P.H."
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Dirección *</label>
              <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                placeholder="CALLE 90 N° 7A - 57"
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Coordinador *</label>
              <select value={form.coordinador} onChange={e => setForm(f => ({ ...f, coordinador: e.target.value }))}
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#112288]/30 bg-white">
                <option value="">Seleccionar...</option>
                {COORDINADORES_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Localidad</label>
              <input value={form.localidad} onChange={e => setForm(f => ({ ...f, localidad: e.target.value }))}
                placeholder="Chapinero"
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !form.nombre || !form.direccion || !form.coordinador}
              className="flex-1 flex items-center justify-center gap-2 bg-[#112288] text-white font-bold text-sm py-2 rounded-xl hover:bg-[#1a3399] disabled:opacity-50 transition-colors">
              {saved ? "✓ Guardado" : saving ? <><RefreshCw size={14} className="animate-spin" /> Guardando…</> : <><Save size={14} /> Guardar cliente</>}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            💡 Las coordenadas se geocodificarán automáticamente desde Apps Script
          </p>
        </div>
      )}

      {/* Lista */}
      {expanded && (
        <div className="bg-white">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar cliente o dirección..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#112288]/30" />
              {busqueda && (
                <button onClick={() => setBusqueda("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={12} className="text-slate-400" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">{clientesFiltrados.length} resultado(s)</p>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {clientesFiltrados.slice(0, 100).map((cliente, i) => {
              const coord = String(cliente.coordinador || "").toUpperCase().trim();
              const cc    = COORD_COLORS[coord] ?? { color: "#64748b" };
              const isSel = cliente.nombre === clienteSeleccionado;
              return (
                <button key={i} onClick={() => {
                    onClienteSelect(isSel ? "" : cliente.nombre);
                    if (!clientesVisible) onShowClientes(clientes);
                  }}
                  className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors ${isSel ? "bg-blue-50" : ""}`}>
                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: cc.color }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{cliente.nombre}</p>
                      <p className="text-[10px] text-slate-400 truncate">{cliente.direccion}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
