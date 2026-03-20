import type { LocalidadData, CrimePoint } from "@/types";
import { BOGOTA_LOCALIDADES } from "@/lib/bogotaGeoJson";

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

  // Datos reales del GeoJSON local (SIEDCO 2025)
  const real = BOGOTA_LOCALIDADES.find((l) => l.name === localidad);

  const total = real
    ? real.hurtoPersonas + real.hurtoResidencias + real.hurtoAutos + real.lesiones + real.violencia
    : 1000;

  const topCrimes = real ? [
    { label: "Hurto a personas",       value: Math.round((real.hurtoPersonas   / total) * 100) },
    { label: "Hurto a residencias",    value: Math.round((real.hurtoResidencias / total) * 100) },
    { label: "Lesiones personales",    value: Math.round((real.lesiones         / total) * 100) },
    { label: "Homicidios",value: Math.round((real.violencia        / total) * 100) },
    { label: "Hurto automotores",      value: Math.round((real.hurtoAutos       / total) * 100) },
  ].sort((a, b) => b.value - a.value) : [
    { label: "Hurto a personas",      value: 40 },
    { label: "Hurto a residencias",   value: 25 },
    { label: "Lesiones personales",   value: 18 },
    { label: "Homicidios", value: 12 },
    { label: "Hurto automotores",     value: 5 },
  ];

  const riskScore = real?.riskScore ?? 50;
  const crimeLabels = topCrimes.map((c) => c.label);
  const seed = localidad.charCodeAt(0) * 31 + localidad.charCodeAt(1);
  const points = generatePoints(geo.center, 40 + Math.floor(riskScore * 0.8), localidad, crimeLabels, seed);

  return {
    name:      localidad,
    center:    geo.center,
    zoom:      geo.zoom,
    riskScore,
    riskLevel: calcRiskLevel(riskScore),
    topCrimes,
    points,
  };
}

export const LOCALIDADES_CONFIG = GEO_CONFIG;
export const LOCALIDADES_LIST   = Object.keys(GEO_CONFIG);
