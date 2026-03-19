// ─── Tipos principales del Dashboard DEAS ───────────────────────────────────

export type RiskLevel = "alto" | "medio" | "bajo";

export interface CrimePoint {
  lat: number;
  lng: number;
  type: string;
  localidad: string;
  intensity: number; // 0.2 – 1.0 para el heatmap
}

export interface LocalidadData {
  name: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  riskScore: number;       // 0–100
  riskLevel: RiskLevel;
  topCrimes: { label: string; value: number }[];
  points: CrimePoint[];
}

export interface BitacoraEntry {
  id: string;
  fecha: string;
  edificio: string;
  tipoNovedad: string;
  gravedad: "crítica" | "alta" | "media" | "baja";
  comentarios: string;
  coordinador: string;
}
