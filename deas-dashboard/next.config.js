/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para que los íconos SVG de Leaflet carguen correctamente en producción
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
};

module.exports = nextConfig;
