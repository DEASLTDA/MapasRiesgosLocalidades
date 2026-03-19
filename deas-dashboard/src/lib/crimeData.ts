// ─── lib/crimeData.ts ────────────────────────────────────────────────────────
// Simulación de la API SODA - Datos Abiertos Bogotá (Secretaría de Seguridad)
//
// PARA PRODUCCIÓN: Reemplaza esta función con una llamada real:
//   const res = await fetch(
//     "https://www.datos.gov.co/resource/qe2b-7i5g.json" +
//     "?$where=localidad='CHAPINERO'&$limit=500",
//     { headers: { "X-App-Token": process.env.NEXT_PUBLIC_SODA_TOKEN! } }
//   );
//   return await res.json();
// ─────────────────────────────────────────────────────────────────────────────

import type { LocalidadData, CrimePoint } from "@/types";

// Parámetros de cada localidad: centro geográfico, nivel de riesgo y distribución de delitos
export const LOCALIDADES_CONFIG: Record<string, Omit<LocalidadData, "points">> = {
  "Chapinero": {
    name: "Chapinero",
    center: [4.6351, -74.0652],
    zoom: 14,
    riskScore: 72,
    riskLevel: "alto",
    topCrimes: [
      { label: "Hurto a personas",     value: 38 },
      { label: "Hurto a residencias",  value: 24 },
      { label: "Hurto de vehículos",   value: 17 },
      { label: "Lesiones personales",  value: 13 },
      { label: "Riñas",                value: 8 },
    ],
  },
  "Usaquén": {
    name: "Usaquén",
    center: [4.6961, -74.0317],
    zoom: 13,
    riskScore: 45,
    riskLevel: "medio",
    topCrimes: [
      { label: "Hurto a personas",     value: 29 },
      { label: "Hurto de vehículos",   value: 26 },
      { label: "Hurto a residencias",  value: 22 },
      { label: "Fraude / Estafa",      value: 15 },
      { label: "Lesiones personales",  value: 8 },
    ],
  },
  "Suba": {
    name: "Suba",
    center: [4.7436, -74.0897],
    zoom: 13,
    riskScore: 61,
    riskLevel: "medio",
    topCrimes: [
      { label: "Hurto a personas",     value: 33 },
      { label: "Hurto a residencias",  value: 27 },
      { label: "Lesiones personales",  value: 18 },
      { label: "Hurto de vehículos",   value: 14 },
      { label: "Violencia intrafamiliar", value: 8 },
    ],
  },
  "Kennedy": {
    name: "Kennedy",
    center: [4.6280, -74.1468],
    zoom: 13,
    riskScore: 83,
    riskLevel: "alto",
    topCrimes: [
      { label: "Hurto a personas",     value: 41 },
      { label: "Lesiones personales",  value: 22 },
      { label: "Hurto a residencias",  value: 18 },
      { label: "Violencia intrafamiliar", value: 12 },
      { label: "Hurto de vehículos",   value: 7 },
    ],
  },
  "Engativá": {
    name: "Engativá",
    center: [4.7042, -74.1112],
    zoom: 13,
    riskScore: 58,
    riskLevel: "medio",
    topCrimes: [
      { label: "Hurto a personas",     value: 30 },
      { label: "Hurto de vehículos",   value: 25 },
      { label: "Hurto a residencias",  value: 23 },
      { label: "Lesiones personales",  value: 15 },
      { label: "Riñas",                value: 7 },
    ],
  },
  "Bosa": {
    name: "Bosa",
    center: [4.6208, -74.1877],
    zoom: 13,
    riskScore: 79,
    riskLevel: "alto",
    topCrimes: [
      { label: "Hurto a personas",     value: 36 },
      { label: "Lesiones personales",  value: 24 },
      { label: "Violencia intrafamiliar", value: 20 },
      { label: "Hurto a residencias",  value: 13 },
      { label: "Riñas",                value: 7 },
    ],
  },
  "Teusaquillo": {
    name: "Teusaquillo",
    center: [4.6443, -74.0921],
    zoom: 14,
    riskScore: 38,
    riskLevel: "bajo",
    topCrimes: [
      { label: "Hurto a personas",     value: 35 },
      { label: "Hurto de vehículos",   value: 28 },
      { label: "Hurto a residencias",  value: 20 },
      { label: "Fraude / Estafa",      value: 12 },
      { label: "Lesiones personales",  value: 5 },
    ],
  },
  "Barrios Unidos": {
    name: "Barrios Unidos",
    center: [4.6672, -74.0812],
    zoom: 14,
    riskScore: 52,
    riskLevel: "medio",
    topCrimes: [
      { label: "Hurto a personas",     value: 32 },
      { label: "Hurto de vehículos",   value: 26 },
      { label: "Hurto a residencias",  value: 24 },
      { label: "Lesiones personales",  value: 12 },
      { label: "Fraude / Estafa",      value: 6 },
    ],
  },
  "Fontibón": {
    name: "Fontibón",
    center: [4.6720, -74.1463],
    zoom: 13,
    riskScore: 47,
    riskLevel: "medio",
    topCrimes: [
      { label: "Hurto de vehículos",   value: 34 },
      { label: "Hurto a personas",     value: 28 },
      { label: "Hurto a residencias",  value: 19 },
      { label: "Fraude / Estafa",      value: 13 },
      { label: "Lesiones personales",  value: 6 },
    ],
  },
  "Puente Aranda": {
    name: "Puente Aranda",
    center: [4.6226, -74.1111],
    zoom: 14,
    riskScore: 55,
    riskLevel: "medio",
    topCrimes: [
      { label: "Hurto a personas",     value: 29 },
      { label: "Hurto a comercios",    value: 26 },
      { label: "Hurto de vehículos",   value: 22 },
      { label: "Hurto a residencias",  value: 16 },
      { label: "Lesiones personales",  value: 7 },
    ],
  },
};

// ─── Generador de puntos simulados ──────────────────────────────────────────
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
  return Array.from({ length: count }, () => {
    const angle = rng() * 2 * Math.PI;
    const radius = rng() * 0.025 + 0.002;
    return {
      lat: center[0] + Math.sin(angle) * radius,
      lng: center[1] + Math.cos(angle) * radius,
      type: crimes[Math.floor(rng() * crimes.length)],
      localidad,
      intensity: 0.3 + rng() * 0.7,
    };
  });
}

// ─── Función principal (simula fetch a API SODA) ─────────────────────────────
export async function fetchCrimeData(localidad: string): Promise<LocalidadData> {
  // Simula latencia de red
  await new Promise((r) => setTimeout(r, 320));

  const config = LOCALIDADES_CONFIG[localidad];
  if (!config) throw new Error(`Localidad "${localidad}" no encontrada`);

  const crimeLabels = config.topCrimes.map((c) => c.label);
  const seed = localidad.charCodeAt(0) * 31 + localidad.charCodeAt(1);
  const pointCount = 40 + Math.floor(config.riskScore * 0.8);

  const points = generatePoints(
    config.center,
    pointCount,
    localidad,
    crimeLabels,
    seed
  );

  return { ...config, points };
}

export const LOCALIDADES_LIST = Object.keys(LOCALIDADES_CONFIG);
