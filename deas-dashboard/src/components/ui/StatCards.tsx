"use client";
import { TrendingUp, MapPin, Shield, AlertCircle } from "lucide-react";
import type { LocalidadData } from "@/types";

interface Props { data: LocalidadData | null }

export default function StatCards({ data }: Props) {
  const totalPoints   = data?.points.length ?? 0;
  const highRisk      = data?.points.filter((p) => p.intensity > 0.7).length ?? 0;
  const topCrime      = data?.topCrimes[0]?.label ?? "—";
  const riskScore     = data?.riskScore ?? 0;

  const cards = [
    {
      label: "Incidentes Simulados",
      value: totalPoints.toString(),
      sub:   "En el sector",
      icon:  <MapPin size={16} className="text-[#112288]" />,
      accent: "border-blue-200",
    },
    {
      label: "Zonas de Alta Intensidad",
      value: highRisk.toString(),
      sub:   "Puntos críticos",
      icon:  <AlertCircle size={16} className="text-red-600" />,
      accent: "border-red-200",
    },
    {
      label: "Puntaje de Riesgo",
      value: `${riskScore}/100`,
      sub:   data?.riskLevel ? `Nivel ${data.riskLevel}` : "—",
      icon:  <Shield size={16} className="text-orange-600" />,
      accent: "border-orange-200",
    },
    {
      label: "Delito Predominante",
      value: topCrime,
      sub:   `${data?.topCrimes[0]?.value ?? 0}% de casos`,
      icon:  <TrendingUp size={16} className="text-yellow-600" />,
      accent: "border-yellow-200",
      small: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-white rounded-xl shadow-card border ${c.accent} px-3 py-3 animate-card`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">{c.label}</p>
            {c.icon}
          </div>
          <p className={`font-heading font-bold text-slate-800 leading-tight ${c.small ? "text-sm" : "text-2xl"}`}>
            {c.value}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
