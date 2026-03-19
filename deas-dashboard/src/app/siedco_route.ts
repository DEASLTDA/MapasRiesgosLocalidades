import { NextResponse } from "next/server";

const SIEDCO_URL =
  "https://oaiee.scj.gov.co/agc/rest/services/Tematicos_Pub/CifrasSCJ/MapServer/0/query";

export async function GET() {
  try {
    const params = new URLSearchParams({
      where: "1=1",
      outFields: "CMIULOCAL,CMHPTOTAL,CMHRTOTAL,CMHATOTAL,CMLPTOTAL,CMVITOTAL,CMHOMTOTAL,CMHTOTAL",
      f: "geojson",
      returnGeometry: "true",
      outSR: "4326",
    });

    const res = await fetch(`${SIEDCO_URL}?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) throw new Error(`SIEDCO ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("SIEDCO proxy error:", err);
    return NextResponse.json({ error: "SIEDCO no disponible" }, { status: 500 });
  }
}
