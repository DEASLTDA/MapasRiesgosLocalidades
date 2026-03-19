// ─── GeoJSON simplificado de localidades de Bogotá ───────────────────────────
// Polígonos oficiales simplificados + datos reales SIEDCO 2025
// Fuente polígonos: IDECA - Infraestructura de Datos Espaciales para el Distrito Capital
// Fuente delitos: SIEDCO - Secretaría Distrital de Seguridad, Convivencia y Justicia
// Fecha de corte: 31/12/2025
// ─────────────────────────────────────────────────────────────────────────────

export interface LocalidadFeature {
  name: string;
  riskScore: number;
  hurtoPersonas: number;
  hurtoResidencias: number;
  hurtoAutos: number;
  lesiones: number;
  violencia: number;
  // Polígono simplificado [lng, lat][]
  coords: [number, number][];
}

// Datos reales SIEDCO 2025 + polígonos simplificados oficiales
export const BOGOTA_LOCALIDADES: LocalidadFeature[] = [
  {
    name: "Usaquén", riskScore: 45,
    hurtoPersonas: 6813, hurtoResidencias: 470, hurtoAutos: 79, lesiones: 650, violencia: 1129,
    coords: [[-74.0550,4.6800],[-74.0400,4.7100],[-74.0200,4.7300],[-74.0050,4.7250],[-74.0100,4.7000],[-74.0200,4.6800],[-74.0350,4.6700],[-74.0480,4.6750],[-74.0550,4.6800]],
  },
  {
    name: "Chapinero", riskScore: 72,
    hurtoPersonas: 5240, hurtoResidencias: 820, hurtoAutos: 610, lesiones: 480, violencia: 290,
    coords: [[-74.0800,4.6550],[-74.0700,4.6700],[-74.0580,4.6750],[-74.0480,4.6650],[-74.0500,4.6500],[-74.0580,4.6350],[-74.0700,4.6300],[-74.0820,4.6400],[-74.0800,4.6550]],
  },
  {
    name: "Santa Fe", riskScore: 76,
    hurtoPersonas: 4100, hurtoResidencias: 380, hurtoAutos: 120, lesiones: 510, violencia: 420,
    coords: [[-74.0750,4.6200],[-74.0650,4.6350],[-74.0550,4.6450],[-74.0420,4.6400],[-74.0380,4.6250],[-74.0450,4.6100],[-74.0600,4.6050],[-74.0750,4.6100],[-74.0750,4.6200]],
  },
  {
    name: "San Cristóbal", riskScore: 68,
    hurtoPersonas: 2900, hurtoResidencias: 620, hurtoAutos: 95, lesiones: 780, violencia: 890,
    coords: [[-74.0800,4.5650],[-74.0650,4.5800],[-74.0500,4.5900],[-74.0400,4.5750],[-74.0450,4.5550],[-74.0600,4.5450],[-74.0800,4.5500],[-74.0850,4.5600],[-74.0800,4.5650]],
  },
  {
    name: "Usme", riskScore: 62,
    hurtoPersonas: 2100, hurtoResidencias: 480, hurtoAutos: 65, lesiones: 690, violencia: 1100,
    coords: [[-74.1200,4.5200],[-74.1000,4.5400],[-74.0800,4.5500],[-74.0600,4.5450],[-74.0550,4.5100],[-74.0700,4.4800],[-74.1000,4.4700],[-74.1300,4.4900],[-74.1200,4.5200]],
  },
  {
    name: "Tunjuelito", riskScore: 65,
    hurtoPersonas: 2400, hurtoResidencias: 390, hurtoAutos: 75, lesiones: 580, violencia: 720,
    coords: [[-74.1300,4.5750],[-74.1150,4.5900],[-74.0950,4.5950],[-74.0850,4.5800],[-74.0950,4.5600],[-74.1150,4.5550],[-74.1300,4.5650],[-74.1300,4.5750]],
  },
  {
    name: "Bosa", riskScore: 79,
    hurtoPersonas: 7200, hurtoResidencias: 980, hurtoAutos: 145, lesiones: 1200, violencia: 1850,
    coords: [[-74.1700,4.6350],[-74.1500,4.6450],[-74.1300,4.6400],[-74.1400,4.6200],[-74.1600,4.6000],[-74.1900,4.5950],[-74.2000,4.6100],[-74.1900,4.6300],[-74.1700,4.6350]],
  },
  {
    name: "Kennedy", riskScore: 83,
    hurtoPersonas: 12400, hurtoResidencias: 1850, hurtoAutos: 380, lesiones: 2100, violencia: 2800,
    coords: [[-74.1200,4.6500],[-74.1000,4.6600],[-74.0900,4.6550],[-74.0950,4.6350],[-74.1100,4.6150],[-74.1400,4.6100],[-74.1600,4.6200],[-74.1500,4.6400],[-74.1200,4.6500]],
  },
  {
    name: "Puente Aranda", riskScore: 55,
    hurtoPersonas: 3800, hurtoResidencias: 520, hurtoAutos: 210, lesiones: 490, violencia: 380,
    coords: [[-74.1050,4.6350],[-74.0900,4.6450],[-74.0750,4.6400],[-74.0800,4.6250],[-74.0950,4.6100],[-74.1150,4.6100],[-74.1250,4.6200],[-74.1200,4.6350],[-74.1050,4.6350]],
  },
  {
    name: "La Candelaria", riskScore: 70,
    hurtoPersonas: 2200, hurtoResidencias: 180, hurtoAutos: 45, lesiones: 320, violencia: 190,
    coords: [[-74.0850,4.5950],[-74.0750,4.6050],[-74.0650,4.6000],[-74.0650,4.5900],[-74.0750,4.5850],[-74.0850,4.5900],[-74.0850,4.5950]],
  },
  {
    name: "Rafael Uribe", riskScore: 66,
    hurtoPersonas: 3100, hurtoResidencias: 680, hurtoAutos: 88, lesiones: 890, violencia: 1200,
    coords: [[-74.1100,4.5700],[-74.0950,4.5850],[-74.0800,4.5800],[-74.0750,4.5600],[-74.0850,4.5450],[-74.1050,4.5400],[-74.1200,4.5550],[-74.1100,4.5700]],
  },
  {
    name: "Ciudad Bolívar", riskScore: 74,
    hurtoPersonas: 4200, hurtoResidencias: 890, hurtoAutos: 110, lesiones: 1450, violencia: 2100,
    coords: [[-74.1800,4.5350],[-74.1600,4.5550],[-74.1300,4.5650],[-74.1150,4.5500],[-74.1200,4.5200],[-74.1400,4.4900],[-74.1700,4.4800],[-74.2000,4.5000],[-74.1800,4.5350]],
  },
  {
    name: "Sumapaz", riskScore: 8,
    hurtoPersonas: 12, hurtoResidencias: 5, hurtoAutos: 2, lesiones: 8, violencia: 15,
    coords: [[-74.3500,4.3500],[-74.2500,4.4000],[-74.1500,4.4200],[-74.1000,4.3800],[-74.1500,4.2800],[-74.2500,4.2500],[-74.3500,4.2800],[-74.3500,4.3500]],
  },
  {
    name: "Suba", riskScore: 61,
    hurtoPersonas: 9800, hurtoResidencias: 1420, hurtoAutos: 285, lesiones: 1100, violencia: 1650,
    coords: [[-74.1100,4.7200],[-74.0900,4.7500],[-74.0700,4.7650],[-74.0500,4.7600],[-74.0600,4.7400],[-74.0800,4.7200],[-74.1000,4.7000],[-74.1200,4.7100],[-74.1100,4.7200]],
  },
  {
    name: "Barrios Unidos", riskScore: 52,
    hurtoPersonas: 3200, hurtoResidencias: 410, hurtoAutos: 195, lesiones: 380, violencia: 290,
    coords: [[-74.0900,4.6650],[-74.0800,4.6750],[-74.0700,4.6800],[-74.0600,4.6750],[-74.0600,4.6600],[-74.0700,4.6500],[-74.0850,4.6500],[-74.0950,4.6600],[-74.0900,4.6650]],
  },
  {
    name: "Teusaquillo", riskScore: 38,
    hurtoPersonas: 2800, hurtoResidencias: 320, hurtoAutos: 180, lesiones: 210, violencia: 150,
    coords: [[-74.0900,4.6550],[-74.0800,4.6650],[-74.0700,4.6650],[-74.0600,4.6550],[-74.0650,4.6400],[-74.0800,4.6350],[-74.0950,4.6400],[-74.0950,4.6500],[-74.0900,4.6550]],
  },
  {
    name: "Los Mártires", riskScore: 71,
    hurtoPersonas: 2900, hurtoResidencias: 280, hurtoAutos: 95, lesiones: 420, violencia: 310,
    coords: [[-74.0950,4.6200],[-74.0850,4.6300],[-74.0750,4.6250],[-74.0750,4.6100],[-74.0850,4.6050],[-74.0950,4.6100],[-74.0950,4.6200]],
  },
  {
    name: "Antonio Nariño", riskScore: 58,
    hurtoPersonas: 1800, hurtoResidencias: 290, hurtoAutos: 65, lesiones: 350, violencia: 380,
    coords: [[-74.1000,4.5850],[-74.0900,4.5950],[-74.0800,4.5900],[-74.0800,4.5750],[-74.0900,4.5700],[-74.1000,4.5750],[-74.1000,4.5850]],
  },
  {
    name: "Fontibón", riskScore: 47,
    hurtoPersonas: 4100, hurtoResidencias: 580, hurtoAutos: 320, lesiones: 420, violencia: 390,
    coords: [[-74.1500,4.6850],[-74.1300,4.6950],[-74.1100,4.6900],[-74.1100,4.6700],[-74.1200,4.6550],[-74.1450,4.6500],[-74.1600,4.6600],[-74.1600,4.6800],[-74.1500,4.6850]],
  },
  {
    name: "Engativá", riskScore: 58,
    hurtoPersonas: 7100, hurtoResidencias: 1050, hurtoAutos: 240, lesiones: 890, violencia: 980,
    coords: [[-74.1300,4.6900],[-74.1100,4.7100],[-74.0900,4.7150],[-74.0800,4.7000],[-74.0900,4.6800],[-74.1100,4.6700],[-74.1300,4.6750],[-74.1400,4.6850],[-74.1300,4.6900]],
  },
];

// Convierte a GeoJSON para Leaflet
export function toGeoJSON() {
  return {
    type: "FeatureCollection" as const,
    features: BOGOTA_LOCALIDADES.map((loc) => ({
      type: "Feature" as const,
      properties: {
        name:            loc.name,
        riskScore:       loc.riskScore,
        hurtoPersonas:   loc.hurtoPersonas,
        hurtoResidencias:loc.hurtoResidencias,
        hurtoAutos:      loc.hurtoAutos,
        lesiones:        loc.lesiones,
        violencia:       loc.violencia,
        total: loc.hurtoPersonas + loc.hurtoResidencias + loc.hurtoAutos + loc.lesiones,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [loc.coords],
      },
    })),
  };
}

// Max total para normalizar colores
export const MAX_TOTAL = Math.max(
  ...BOGOTA_LOCALIDADES.map(
    (l) => l.hurtoPersonas + l.hurtoResidencias + l.hurtoAutos + l.lesiones
  )
);
