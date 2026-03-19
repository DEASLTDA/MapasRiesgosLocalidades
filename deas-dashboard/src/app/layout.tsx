import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DEAS – Dashboard de Inteligencia y Riesgos de Seguridad",
  description: "Panel de análisis de riesgos y bitácora operativa para coordinadores de seguridad privada.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#f1f5fb]">{children}</body>
    </html>
  );
}
