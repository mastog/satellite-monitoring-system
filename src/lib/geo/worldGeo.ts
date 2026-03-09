import * as topojson from "topojson-client";
import topology from "world-atlas/countries-110m.json";

/* eslint-disable @typescript-eslint/no-explicit-any */
const topo = topology as any;

/** Exposes the country polygons as individual GeoJSON features for maps that need per-country rendering. */
export const worldCountries = topojson.feature(
  topo,
  topo.objects.countries
) as any;

/** Exposes a merged landmass shape for maps that only need a single land layer without internal borders. */
export const worldLand = topojson.feature(topo, topo.objects.land) as any;

/** Exposes only the internal country-border mesh so maps can draw borders separately from coastlines. */
export const worldBorders = topojson.mesh(
  topo,
  topo.objects.countries,
  (a: any, b: any) => a !== b
);
