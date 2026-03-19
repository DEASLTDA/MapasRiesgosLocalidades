"use client";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function Header() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setDate(
        now.toLocaleDateString("es-CO", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="bg-[#112288] shadow-panel sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-5 py-3 flex items-center justify-between gap-4">

        {/* Logo + nombre */}
        <div className="flex items-center gap-3">
          {/*
           * ─── LOGO DE EMPRESA ───────────────────────────────────────────
           * Reemplaza el bloque <div> de abajo por tu etiqueta <img>:
           *
           * <img
           *   src="/logo-deas.png"        ← coloca el archivo en /public/
           *   alt="DEAS Seguridad"
           *   className="h-10 w-auto object-contain"
           * />
           *
           * ───────────────────────────────────────────────────────────────
           */}
          {/* LOGO DEAS - archivo en /public/logo-deas.png */}
          <img
            src="/logo-deas.png"
            alt="DEAS Seguridad"
            className="h-12 w-auto object-contain"
          />

          <div>
            <p className="font-heading text-white text-xl font-bold tracking-widest uppercase leading-none">
              DEAS
            </p>
            <p className="text-blue-200 text-[10px] tracking-wider uppercase leading-tight">
              Servicios de Seguridad Privada
            </p>
          </div>
        </div>

        {/* Título central */}
        <div className="hidden md:block text-center">
          <h1 className="font-heading text-white font-bold text-lg tracking-wider uppercase leading-tight">
            Dashboard de Inteligencia y Riesgos
          </h1>
          <p className="text-blue-200 text-xs tracking-wide">
            Panel de Análisis Operativo · Bogotá D.C.
          </p>
        </div>

        {/* Reloj en tiempo real */}
        <div className="flex items-center gap-2 text-right">
          <Clock size={16} className="text-blue-300 flex-shrink-0" />
          <div>
            <p className="font-mono text-white font-medium text-base tabular-nums leading-none">
              {time}
            </p>
            <p className="text-blue-200 text-[10px] capitalize leading-tight mt-0.5">
              {date}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
