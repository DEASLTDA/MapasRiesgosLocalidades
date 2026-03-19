import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta DEAS corporativa
        deas: {
          900: "#0a1550",
          800: "#112288",
          700: "#1a3399",
          600: "#1e40af",
          100: "#dbeafe",
          50:  "#eff6ff",
        },
        risk: {
          high:   "#dc2626", // Rojo
          medium: "#ea580c", // Naranja
          low:    "#ca8a04", // Amarillo
          safe:   "#16a34a", // Verde
        },
      },
      fontFamily: {
        heading: ["'Barlow Condensed'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card:  "0 2px 16px 0 rgba(17,34,136,0.10)",
        panel: "0 4px 32px 0 rgba(17,34,136,0.13)",
      },
    },
  },
  plugins: [],
};
export default config;
