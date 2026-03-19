"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Crime { label: string; value: number }
interface Props {
  crimes: Crime[];
  selectedCrime: string | null;
  onSelectCrime: (label: string | null) => void;
}

// Colores totalmente distintos — máximo contraste entre sí
export const CRIME_COLORS: Record<string, { bar: string; dot: string; bg: string; text: string }> = {
  "Hurto a personas":        { bar: "#e11d48", dot: "#e11d48", bg: "bg-rose-50",    text: "text-rose-700" },
  "Hurto a residencias":     { bar: "#7c3aed", dot: "#7c3aed", bg: "bg-violet-50",  text: "text-violet-700" },
  "Hurto de vehículos":      { bar: "#0284c7", dot: "#0284c7", bg: "bg-sky-50",     text: "text-sky-700" },
  "Lesiones personales":     { bar: "#d97706", dot: "#d97706", bg: "bg-amber-50",   text: "text-amber-700" },
  "Riñas":                   { bar: "#059669", dot: "#059669", bg: "bg-emerald-50", text: "text-emerald-700" },
  "Fraude / Estafa":         { bar: "#db2777", dot: "#db2777", bg: "bg-pink-50",    text: "text-pink-700" },
  "Violencia intrafamiliar": { bar: "#ea580c", dot: "#ea580c", bg: "bg-orange-50",  text: "text-orange-700" },
  "Hurto a comercios":       { bar: "#0891b2", dot: "#0891b2", bg: "bg-cyan-50",    text: "text-cyan-700" },
};

export const DEFAULT_COLOR = { bar: "#64748b", dot: "#64748b", bg: "bg-slate-50", text: "text-slate-700" };

export function getCrimeColor(label: string) {
  return CRIME_COLORS[label] ?? DEFAULT_COLOR;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: Crime }[] }) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    const cfg = getCrimeColor(d.label);
    return (
      <div className={`border rounded-lg px-3 py-2 shadow-lg text-xs ${cfg.bg}`}>
        <p className={`font-bold ${cfg.text}`}>{d.label}</p>
        <p className="text-slate-600 mt-0.5">{d.value}% del total reportado</p>
      </div>
    );
  }
  return null;
};

export default function CrimeBarChart({ crimes, selectedCrime, onSelectCrime }: Props) {
  const sorted = [...crimes].sort((a, b) => b.value - a.value);

  const handleClick = (data: { label: string }) => {
    onSelectCrime(selectedCrime === data.label ? null : data.label);
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-blue-50 p-4 animate-card">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Distribución de Delitos
          </p>
          <p className="font-heading font-bold text-slate-800 text-sm">
            Top 5 · Tipos de Delito
          </p>
        </div>
        {selectedCrime && (
          <button
            onClick={() => onSelectCrime(null)}
            className="text-[9px] font-bold uppercase tracking-wider text-[#112288] bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Ver todos
          </button>
        )}
      </div>

      {/* Leyenda clicable */}
      <div className="flex flex-wrap gap-1.5 mb-3 mt-2">
        {sorted.map((c) => {
          const cfg = getCrimeColor(c.label);
          const active = selectedCrime === c.label;
          return (
            <button
              key={c.label}
              onClick={() => handleClick(c)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-semibold transition-all ${
                active
                  ? `${cfg.bg} border-current ${cfg.text} scale-105 shadow-sm`
                  : selectedCrime
                  ? "bg-slate-50 border-slate-200 text-slate-400 opacity-50"
                  : `${cfg.bg} border-transparent ${cfg.text}`
              }`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.bar }} />
              {c.label}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={175}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 36, left: 8, bottom: 0 }}
          onClick={(e) => e?.activePayload && handleClick(e.activePayload[0].payload)}
        >
          <XAxis
            type="number"
            domain={[0, 50]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="label"
            type="category"
            width={130}
            tick={{ fontSize: 10, fill: "#334155", fontFamily: "DM Sans, sans-serif" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16} style={{ cursor: "pointer" }}>
            {sorted.map((c, i) => (
              <Cell
                key={i}
                fill={getCrimeColor(c.label).bar}
                opacity={selectedCrime && selectedCrime !== c.label ? 0.25 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {selectedCrime && (
        <p className="text-center text-[10px] text-slate-400 mt-1 italic">
          Mostrando solo: <span className={`font-bold ${getCrimeColor(selectedCrime).text}`}>{selectedCrime}</span> en el mapa
        </p>
      )}
    </div>
  );
}
