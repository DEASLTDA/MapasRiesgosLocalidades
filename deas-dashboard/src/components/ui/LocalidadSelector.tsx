"use client";
import { MapPin, ChevronDown } from "lucide-react";
const LOCALIDADES_DEAS = ["Usaquén","Chapinero","Santa Fe","Suba","Barrios Unidos","Teusaquillo"];

interface Props {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
}

export default function LocalidadSelector({ value, onChange, loading }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-blue-100 px-4 py-3 flex items-center gap-3">
      <MapPin size={18} className="text-[#112288] flex-shrink-0" />
      <div className="flex-1">
        <label htmlFor="localidad-select" className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
          Localidad de Bogotá
        </label>
        <div className="relative">
          <select
            id="localidad-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
            className="
              w-full appearance-none bg-transparent
              font-heading text-[#112288] font-bold text-base tracking-wide
              pr-6 focus:outline-none cursor-pointer
              disabled:opacity-50 disabled:cursor-wait
            "
          >
            {LOCALIDADES_DEAS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>
      {loading && (
        <div className="w-4 h-4 border-2 border-[#112288] border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
    </div>
  );
}
