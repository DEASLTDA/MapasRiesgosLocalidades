"use client";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import type { RiskLevel } from "@/types";

interface Props {
  score: number;
  level: RiskLevel;
  localidad: string;
}

const LEVEL_CONFIG: Record<RiskLevel, { color: string; label: string; bg: string }> = {
  alto:  { color: "#dc2626", label: "RIESGO ALTO",  bg: "bg-red-50 border-red-200" },
  medio: { color: "#ea580c", label: "RIESGO MEDIO", bg: "bg-orange-50 border-orange-200" },
  bajo:  { color: "#ca8a04", label: "RIESGO BAJO",  bg: "bg-yellow-50 border-yellow-200" },
};

export default function RiskGauge({ score, level, localidad }: Props) {
  const cfg = LEVEL_CONFIG[level];
  const data = [{ value: score, fill: cfg.color }];

  return (
    <div className={`rounded-xl border p-4 animate-card ${cfg.bg}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">
        Nivel de Riesgo Global
      </p>
      <p className="font-heading font-bold text-slate-800 text-base leading-tight mb-3">
        {localidad}
      </p>

      <div className="relative h-40">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="70%"
            innerRadius="65%"
            outerRadius="90%"
            startAngle={180}
            endAngle={0}
            data={data}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: "#e2e8f0" }}
              dataKey="value"
              angleAxisId={0}
              cornerRadius={6}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Score central */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 pointer-events-none">
          <span className="font-heading font-bold text-4xl leading-none" style={{ color: cfg.color }}>
            {score}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
            / 100
          </span>
        </div>
      </div>

      <div
        className="mt-3 rounded-lg px-3 py-1.5 text-center text-xs font-bold uppercase tracking-widest text-white"
        style={{ backgroundColor: cfg.color }}
      >
        {level === "alto" && <span className="risk-pulse inline-block mr-1.5">●</span>}
        {cfg.label}
      </div>
    </div>
  );
}
