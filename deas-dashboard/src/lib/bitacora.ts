// ─── lib/bitacora.ts ─────────────────────────────────────────────────────────
// Persistencia de la bitácora en localStorage del navegador.
// Para migrar a Supabase en el futuro, reemplaza estas funciones por llamadas
// a la tabla "bitacora_entries" de tu proyecto Supabase.
// ─────────────────────────────────────────────────────────────────────────────

import type { BitacoraEntry } from "@/types";

const KEY = "deas_bitacora_v1";

export function loadEntries(): BitacoraEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BitacoraEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: BitacoraEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function addEntry(entry: BitacoraEntry): BitacoraEntry[] {
  const entries = [entry, ...loadEntries()].slice(0, 100); // máx 100 registros
  saveEntries(entries);
  return entries;
}

export function clearEntries(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
