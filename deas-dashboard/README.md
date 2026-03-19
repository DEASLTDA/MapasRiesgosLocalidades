# 🛡️ DEAS – Dashboard de Inteligencia y Riesgos de Seguridad

Panel de análisis de riesgos, mapa de calor delictivo y bitácora operativa para coordinadores de seguridad privada. Bogotá D.C.

---

## 🚀 Instalación y uso local (paso a paso)

### Requisitos previos
- Node.js 18 o superior: https://nodejs.org/
- Git: https://git-scm.com/

### 1 · Crear el proyecto Next.js e instalar dependencias

```bash
# Crea la carpeta e instala todo
cd deas-dashboard
npm install
```

### 2 · Configurar variables de entorno (opcional para MVP)

```bash
# Copia el archivo de ejemplo
cp .env.local.example .env.local
# Edita .env.local con tu editor (para MVP puedes dejarlo vacío)
```

### 3 · Ejecutar en modo desarrollo

```bash
npm run dev
```
Abre http://localhost:3000 en tu navegador.

### 4 · Construir para producción

```bash
npm run build
npm run start
```

---

## ☁️ Deploy en Vercel (gratuito)

### Opción A – Desde GitHub (recomendada)

1. Sube el proyecto a un repositorio en https://github.com
2. Ve a https://vercel.com → "Add New Project"
3. Importa tu repositorio de GitHub
4. Vercel detecta Next.js automáticamente
5. Haz clic en **Deploy** → listo en ~2 minutos

### Opción B – Desde CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 🖼️ Cómo agregar el logo de DEAS

1. Coloca tu imagen en `/public/logo-deas.png` (PNG con fondo transparente recomendado)
2. Abre el archivo `src/components/ui/Header.tsx`
3. Busca el comentario `── LOGO DE EMPRESA ──` y reemplaza el bloque `<div>` por:

```tsx
<img
  src="/logo-deas.png"
  alt="DEAS Seguridad"
  className="h-10 w-auto object-contain"
/>
```

---

## 🔌 Cómo conectar la API real de Datos Abiertos Bogotá

1. Regístrate en https://www.datos.gov.co y obtén un App Token
2. Agrega `NEXT_PUBLIC_SODA_TOKEN=tu_token` en `.env.local`
3. En `src/lib/crimeData.ts`, reemplaza la función `fetchCrimeData()` con:

```typescript
export async function fetchCrimeData(localidad: string): Promise<LocalidadData> {
  const config = LOCALIDADES_CONFIG[localidad];
  const res = await fetch(
    `https://www.datos.gov.co/resource/qe2b-7i5g.json` +
    `?$where=localidad='${localidad.toUpperCase()}'&$limit=500`,
    { headers: { "X-App-Token": process.env.NEXT_PUBLIC_SODA_TOKEN! } }
  );
  const raw = await res.json();
  // Mapear campos de la API al tipo CrimePoint...
  const points: CrimePoint[] = raw.map((r: Record<string, string>) => ({
    lat: parseFloat(r.latitud),
    lng: parseFloat(r.longitud),
    type: r.descripcion_conducta,
    localidad: r.localidad,
    intensity: 0.5,
  }));
  return { ...config, points };
}
```

---

## 🗂️ Estructura del proyecto

```
deas-dashboard/
├── src/
│   ├── app/
│   │   ├── globals.css       # Estilos globales + fuentes
│   │   ├── layout.tsx        # Layout raíz (metadatos, fuentes)
│   │   └── page.tsx          # Página principal del dashboard
│   ├── components/
│   │   ├── bitacora/
│   │   │   └── BitacoraModule.tsx   # Formulario + feed de novedades
│   │   ├── charts/
│   │   │   ├── CrimeBarChart.tsx    # Barras horizontales Top 5 delitos
│   │   │   └── RiskGauge.tsx        # Gauge de riesgo global
│   │   ├── map/
│   │   │   ├── LeafletMap.tsx       # Mapa + heatmap (client only)
│   │   │   └── MapWrapper.tsx       # Wrapper dynamic import (SSR fix)
│   │   └── ui/
│   │       ├── Header.tsx           # Cabecera + reloj en tiempo real
│   │       ├── LocalidadSelector.tsx # Dropdown de localidades
│   │       └── StatCards.tsx        # Tarjetas de KPIs
│   ├── lib/
│   │   ├── bitacora.ts       # CRUD localStorage para novedades
│   │   └── crimeData.ts      # Simulación API SODA + datos localidades
│   └── types/
│       └── index.ts          # Tipos TypeScript compartidos
├── public/
│   └── (coloca logo-deas.png aquí)
├── .env.local.example        # Plantilla de variables de entorno
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🔒 Notas de seguridad

- La bitácora usa `localStorage` del navegador: los datos son locales a cada dispositivo/navegador. Para compartir novedades entre coordinadores, migra a Supabase (ver `.env.local.example`).
- Los datos del mapa son **simulados** y solo tienen fines demostrativos. No representan datos reales de criminalidad.

---

*DEAS Servicios de Seguridad Privada · Grupo Altum · Bogotá, Colombia*
