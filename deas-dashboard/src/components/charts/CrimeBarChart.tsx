"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Crime { label: string; value: number }
interface Props  { crimes: Crime[] }

const COLORS = ["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#15803d"];

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: Crime }[] }) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-slate-700">{d.label}</p>
        <p className="text-[#112288] font-bold">{d.value}% del total</p>
      </div>
    );
  }
  return null;
};

export default function CrimeBarChart({ crimes }: Props) {
  const sorted = [...crimes].sort((a, b) => b.value - a.value);

  return (
    <div className="bg-white rounded-xl shadow-card border border-blue-50 p-4 animate-card">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
        Distribución de Delitos
      </p>
      <p className="font-heading font-bold text-slate-800 text-sm mb-4">
        Top 5 · Tipos de Delito
      </p>

      <ResponsiveContainer width="100%" height={185}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 36, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5fb" }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={COLORS[i] ?? "#112288"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
