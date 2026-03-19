// ─── app/api/crimes/route.ts ─────────────────────────────────────────────────
// Ruta de API de Next.js que actúa como proxy hacia datos.gov.co
// Evita problemas de CORS al llamar la API desde el servidor, no desde el navegador
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

const SODA_TOKEN = "NSceyDgiHjCT7r9k7vZlDNC6z";
const SODA_BASE  = "https://www.datos.gov.co/resource/2bxu-b96f.json";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const localidad = searchParams.get("localidad");

  if (!localidad) {
    return NextResponse.json({ error: "localidad requerida" }, { status: 400 });
  }

  try {
    const url =
      `${SODA_BASE}` +
      `?$where=localidad_hecho='${encodeURIComponent(localidad)}'` +
      `&$limit=2000` +
      `&$order=a_o DESC, mes DESC` +
      `&$$app_token=${SODA_TOKEN}`;

    const res = await fetch(url, {
      headers: {
        "X-App-Token": SODA_TOKEN,
        "Accept": "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (err) {
    console.error("Error consultando API SODA:", err);
    return NextResponse.json({ error: "Error de conexión" }, { status: 500 });
  }
}
