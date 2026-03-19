declare module 'leaflet.heat' {
  import * as L from 'leaflet';
  function heatLayer(
    latlngs: [number, number, number][],
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      minOpacity?: number;
      gradient?: Record<string, string>;
    }
  ): L.Layer;
  export { heatLayer };
}
