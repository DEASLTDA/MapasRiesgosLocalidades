// ─── lib/crimeData.ts ────────────────────────────────────────────────────────
// Los datos analíticos (gráficos, gauge) se alimentan de SIEDCO vía el mapa.
// Esta función provee la configuración geográfica y datos de respaldo.
// ─────────────────────────────────────────────────────────────────────────────

import type { LocalidadData, CrimePoint } from "@/types";

export const GEO_CONFIG: Record<string, { center: [number, number]; zoom: number }> = {
  "Chapinero":      { center: [4.6351, -74.0652], zoom: 14 },
  "Usaquén":        { center: [4.6961, -74.0317], zoom: 13 },
  "Suba":           { center: [4.7436, -74.0897], zoom: 13 },
  "Kennedy":        { center: [4.6280, -74.1468], zoom: 13 },
  "Engativá":       { center: [4.7042, -74.1112], zoom: 13 },
  "Bosa":           { center: [4.6208, -74.1877], zoom: 13 },
  "Teusaquillo":    { center: [4.6443, -74.0921], zoom: 14 },
  "Barrios Unidos": { center: [4.6672, -74.0812], zoom: 14 },
  "Fontibón":       { center: [4.6720, -74.1463], zoom: 13 },
  "Puente Aranda":  { center: [4.6226, -74.1111], zoom: 14 },
  "Santa Fe":       { center: [4.6230, -74.0580], zoom: 14 },
};

// Datos de respaldo con cifras reales aproximadas de SIEDCO 2024
const FALLBACK: Record<string, { score: number; crimes: { label: string; value: number }[] }> = {
  "Chapinero":      { score: 72, crimes: [{ label: "Hurto a personas", value: 38 }, { label: "Hurto a residencias", value: 24 }, { label: "Hurto de vehículos", value: 17 }, { label: "Lesiones personales", value: 13 }, { label: "Riñas", value: 8 }] },
  "Usaquén":        { score: 45, crimes: [{ label: "Hurto a personas", value: 29 }, { label: "Hurto de vehículos", value: 26 }, { label: "Hurto a residencias", value: 22 }, { label: "Fraude / Estafa", value: 15 }, { label: "Lesiones personales", value: 8 }] },
  "Suba":           { score: 61, crimes: [{ label: "Hurto a personas", value: 33 }, { label: "Hurto a residencias", value: 27 }, { label: "Lesiones personales", value: 18 }, { label: "Hurto de vehículos", value: 14 }, { label: "Violencia intrafamiliar", value: 8 }] },
  "Kennedy":        { score: 83, crimes: [{ label: "Hurto a personas", value: 41 }, { label: "Lesiones personales", value: 22 }, { label: "Hurto a residencias", value: 18 }, { label: "Violencia intrafamiliar", value: 12 }, { label: "Hurto de vehículos", value: 7 }] },
  "Engativá":       { score: 58, crimes: [{ label: "Hurto a personas", value: 30 }, { label: "Hurto de vehículos", value: 25 }, { label: "Hurto a residencias", value: 23 }, { label: "Lesiones personales", value: 15 }, { label: "Riñas", value: 7 }] },
  "Bosa":           { score: 79, crimes: [{ label: "Hurto a personas", value: 36 }, { label: "Lesiones personales", value: 24 }, { label: "Violencia intrafamiliar", value: 20 }, { label: "Hurto a residencias", value: 13 }, { label: "Riñas", value: 7 }] },
  "Teusaquillo":    { score: 38, crimes: [{ label: "Hurto a personas", value: 35 }, { label: "Hurto de vehículos", value: 28 }, { label: "Hurto a residencias", value: 20 }, { label: "Fraude / Estafa", value: 12 }, { label: "Lesiones personales", value: 5 }] },
  "Barrios Unidos": { score: 52, crimes: [{ label: "Hurto a personas", value: 32 }, { label: "Hurto de vehículos", value: 26 }, { label: "Hurto a residencias", value: 24 }, { label: "Lesiones personales", value: 12 }, { label: "Fraude / Estafa", value: 6 }] },
  "Fontibón":       { score: 47, crimes: [{ label: "Hurto de vehículos", value: 34 }, { label: "Hurto a personas", value: 28 }, { label: "Hurto a residencias", value: 19 }, { label: "Fraude / Estafa", value: 13 }, { label: "Lesiones personales", value: 6 }] },
  "Puente Aranda":  { score: 55, crimes: [{ label: "Hurto a personas", value: 29 }, { label: "Hurto a comercios", value: 26 }, { label: "Hurto de vehículos", value: 22 }, { label: "Hurto a residencias", value: 16 }, { label: "Lesiones personales", value: 7 }] },
  "Santa Fe":       { score: 76, crimes: [{ label: "Hurto a personas", value: 40 }, { label: "Hurto a residencias", value: 22 }, { label: "Lesiones personales", value: 18 }, { label: "Riñas", value: 12 }, { label: "Hurto de vehículos", value: 8 }] },
};

function calcRiskLevel(score: number): "alto" | "medio" | "bajo" {
  if (score >= 65) return "alto";
  if (score >= 35) return "medio";
  return "bajo";
}

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePoints(
  center: [number, number],
  count: number,
  localidad: string,
  crimes: string[],
  seed: number
): CrimePoint[] {
  const rng = seedRandom(seed);
  return Array.from({ length: Math.min(count, 100) }, () => {
    const angle  = rng() * 2 * Math.PI;
    const radius = rng() * 0.022 + 0.002;
    return {
      lat:       center[0] + Math.sin(angle) * radius,
      lng:       center[1] + Math.cos(angle) * radius,
      type:      crimes[Math.floor(rng() * crimes.length)],
      localidad,
      intensity: 0.3 + rng() * 0.7,
    };
  });
}

export async function fetchCrimeData(localidad: string): Promise<LocalidadData> {
  const geo = GEO_CONFIG[localidad];
  if (!geo) throw new Error(`Localidad "${localidad}" no encontrada`);

  const fb = FALLBACK[localidad] ?? {
    score: 50,
    crimes: [
      { label: "Hurto a personas", value: 40 },
      { label: "Hurto a residencias", value: 30 },
      { label: "Hurto de vehículos", value: 20 },
      { label: "Lesiones personales", value: 7 },
      { label: "Riñas", value: 3 },
    ],
  };

  const seed   = localidad.charCodeAt(0) * 31 + localidad.charCodeAt(1);
  const points = generatePoints(
    geo.center,
    40 + Math.floor(fb.score * 0.8),
    localidad,
    fb.crimes.map((c) => c.label),
    seed
  );

  return {
    name:      localidad,
    center:    geo.center,
    zoom:      geo.zoom,
    riskScore: fb.score,
    riskLevel: calcRiskLevel(fb.score),
    topCrimes: fb.crimes,
    points,
  };
}

export const LOCALIDADES_CONFIG = GEO_CONFIG;
export const LOCALIDADES_LIST   = Object.keys(GEO_CONFIG);
