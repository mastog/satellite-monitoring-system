import { NextResponse } from "next/server";
import {
  MOCK_CLIMATE_EVENTS,
  type ClimateEvent,
  type ClimateEventType,
} from "@/lib/climate/data";
const USGS_API =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson";
const GDACS_API =
  "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";
const RELIEFWEB_API = "https://api.reliefweb.int/v1/disasters";
const GDACS_TYPE_MAP: Record<string, ClimateEventType> = {
  EQ: "earthquake",
  FL: "flood",
  TC: "cyclone",
  DR: "drought",
  VO: "volcano",
  WF: "wildfire",
};

const GDACS_ALERT_SEVERITY: Record<string, number> = {
  Green: 2,
  Orange: 3,
  Red: 5,
};
const EONET_API = "https://eonet.gsfc.nasa.gov/api/v3/events";

const EONET_CATEGORY_MAP: Record<string, ClimateEventType> = {
  wildfires: "wildfire",
  severeStorms: "cyclone",
  floods: "flood",
  drought: "drought",
  seaLakeIce: "ice_loss",
  volcanoes: "volcano",
  tempExtremes: "heatwave",
  landslides: "flood",
};

const EONET_SATELLITE_MAP: Record<string, string> = {
  EO: "Earth Observatory",
  MODIS_NRT: "MODIS/Aqua",
  PDC: "VIIRS/Suomi NPP",
  GDACS: "Sentinel-1",
  JTWC: "GOES-16",
  NATICE: "CryoSat-2",
  IDC: "Landsat-9",
  SIVolcano: "Sentinel-2",
  CEMS: "Copernicus EMS",
};

// US-centric fire tracking sources that flood the dataset
const EONET_SKIP_SOURCES = new Set(["InciWeb", "MBFire", "ABFIRE"]);
const RELIEFWEB_TYPE_MAP: Record<string, ClimateEventType> = {
  Flood: "flood",
  "Flash Flood": "flood",
  Earthquake: "earthquake",
  "Tropical Cyclone": "cyclone",
  Volcano: "volcano",
  Drought: "drought",
  "Wild Fire": "wildfire",
  "Heat Wave": "heatwave",
  "Cold Wave": "ice_loss",
  "Storm Surge": "flood",
  "Extratropical Cyclone": "cyclone",
  "Severe Local Storm": "cyclone",
  Tsunami: "flood",
  "Land Slide": "flood",
};

// Country centroids (ISO3 → [lat, lng]) for ReliefWeb geolocation
const COUNTRY_COORDS: Record<string, [number, number]> = {
  afg: [33.9, 67.7],
  ago: [-12.3, 17.9],
  alb: [41.2, 20.2],
  arg: [-38.4, -63.6],
  aus: [-25.3, 133.8],
  bgd: [23.7, 90.4],
  bfa: [12.2, -1.6],
  bra: [-14.2, -51.9],
  can: [56.1, -106.3],
  chn: [35.9, 104.2],
  col: [4.6, -74.3],
  cod: [-4.0, 21.8],
  cub: [21.5, -79.0],
  dza: [28.0, 1.7],
  egy: [26.8, 30.8],
  eth: [9.1, 40.5],
  fra: [46.2, 2.2],
  deu: [51.2, 10.5],
  gha: [7.9, -1.0],
  grc: [39.1, 21.8],
  gtm: [15.8, -90.2],
  hti: [19.1, -72.3],
  hnd: [15.2, -86.2],
  ind: [20.6, 78.9],
  idn: [-0.8, 113.9],
  irn: [32.4, 53.7],
  irq: [33.2, 43.7],
  isr: [31.1, 34.9],
  ita: [41.9, 12.6],
  jpn: [36.2, 138.3],
  ken: [-0.02, 37.9],
  lby: [26.3, 17.2],
  mdg: [-18.8, 46.9],
  mwi: [-13.3, 34.3],
  mys: [4.2, 101.9],
  mli: [17.6, -4.0],
  mex: [23.6, -102.6],
  mar: [31.8, -7.1],
  mmr: [21.9, 95.9],
  moz: [-18.7, 35.5],
  npl: [28.4, 84.1],
  ner: [17.6, 8.1],
  nga: [9.1, 8.7],
  pak: [30.4, 69.3],
  pan: [8.5, -80.8],
  per: [-9.2, -75.0],
  phl: [12.9, 121.8],
  pol: [51.9, 19.1],
  prt: [39.4, -8.2],
  rou: [45.9, 25.0],
  rus: [61.5, 105.3],
  sau: [23.9, 45.1],
  sen: [14.5, -14.5],
  som: [5.2, 46.2],
  zaf: [-30.6, 22.9],
  esp: [40.5, -3.7],
  sdn: [12.9, 30.2],
  swe: [60.1, 18.6],
  syr: [34.8, 39.0],
  tza: [-6.4, 34.9],
  tha: [15.9, 100.9],
  tun: [33.9, 9.5],
  tur: [38.9, 35.2],
  ukr: [48.4, 31.2],
  gbr: [55.4, -3.4],
  usa: [37.1, -95.7],
  ven: [6.4, -66.6],
  vnm: [14.1, 108.3],
  yem: [15.6, 48.5],
  zmb: [-13.1, 27.8],
  zwe: [-19.0, 29.2],
  cri: [10.0, -84.0],
  slv: [13.8, -88.9],
  nic: [12.9, -85.2],
  chl: [-35.7, -71.5],
  ecu: [-1.8, -78.2],
  bol: [-16.3, -63.6],
  pry: [-23.4, -58.4],
  ury: [-32.5, -55.8],
  lka: [7.9, 80.8],
  khm: [12.6, 105.0],
  lao: [19.9, 102.5],
  png: [-6.3, 143.9],
  nzl: [-40.9, 174.9],
  tls: [-8.9, 125.7],
  vut: [-15.4, 166.9],
  fji: [-17.7, 178.1],
  geo: [42.3, 43.4],
  arm: [40.1, 45.0],
  aze: [40.1, 47.6],
  jor: [30.6, 36.2],
  lbn: [33.9, 35.9],
  tkm: [38.9, 59.6],
  uzb: [41.4, 64.6],
  kgz: [41.2, 74.8],
  tjk: [38.9, 71.3],
  ssd: [6.9, 31.3],
  cmr: [7.4, 12.4],
  tcd: [15.5, 18.7],
  civ: [7.5, -5.5],
  gnb: [12.0, -15.0],
  mrt: [21.0, -10.9],
};

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchUSGS(): Promise<ClimateEvent[]> {
  const res = await fetch(USGS_API, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`USGS ${res.status}`);
  const data = await res.json();

  return (data.features || [])
    .slice(0, 40) // limit to 40 most recent
    .map((f: any) => {
      const props = f.properties;
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return null;

      const mag = props.mag || 4.5;
      let severity: 1 | 2 | 3 | 4 | 5;
      if (mag >= 7.0) severity = 5;
      else if (mag >= 6.0) severity = 4;
      else if (mag >= 5.5) severity = 3;
      else if (mag >= 5.0) severity = 2;
      else severity = 1;

      const date = props.time
        ? new Date(props.time).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      const place = props.place || "Unknown Location";

      return {
        id: `usgs-${f.id || Math.random().toString(36).slice(2, 8)}`,
        type: "earthquake" as ClimateEventType,
        title: `M${mag.toFixed(1)} Earthquake — ${place}`,
        region: place,
        lat: coords[1],
        lng: coords[0],
        severity,
        detectingSatellite: "ALOS-2 / Sentinel-1",
        detectionDate: date,
        sdgImpact: getTypicalSdgImpact("earthquake", severity),
        description: `Magnitude ${mag.toFixed(1)} earthquake at ${(coords[2] || 10).toFixed(0)}km depth. ${place}. Seismic data from USGS global network, InSAR surface deformation analysis via satellite radar.`,
        areaAffectedKm2: Math.round(Math.pow(10, mag - 3) * 50),
        status: (props.tsunami
          ? "active"
          : severity >= 4
            ? "active"
            : "monitoring") as any,
        source: "usgs",
        magnitude: mag,
      } satisfies ClimateEvent;
    })
    .filter(Boolean) as ClimateEvent[];
}
async function fetchEONET(): Promise<ClimateEvent[]> {
  const res = await fetch(`${EONET_API}?status=open&limit=40`, {
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`EONET ${res.status}`);
  const data = await res.json();

  let wildfireCount = 0;
  const MAX_WILDFIRES = 8;

  return (data.events || [])
    .filter((e: any) => e.geometry?.length > 0 && e.categories?.length > 0)
    .map((e: any) => {
      const catId = e.categories[0]?.id || "";
      const type: ClimateEventType = EONET_CATEGORY_MAP[catId] || "wildfire";

      // Drops sources that would over-concentrate the feed on US-specific wildfire reporting.
      const sourceId = e.sources?.[0]?.id || "EO";
      if (EONET_SKIP_SOURCES.has(sourceId)) return null;

      // Limits wildfire entries so one hazard type does not crowd out the rest of the global event feed.
      if (type === "wildfire") {
        wildfireCount++;
        if (wildfireCount > MAX_WILDFIRES) return null;
      }

      const geo = e.geometry[e.geometry.length - 1];
      const coords =
        geo.type === "Point"
          ? geo.coordinates
          : geo.type === "Polygon"
            ? geo.coordinates[0]?.[0]
            : null;

      if (!coords || coords.length < 2) return null;

      const mag = geo.magnitudeValue;
      let severity: 1 | 2 | 3 | 4 | 5 = 3;
      if (mag !== null && mag !== undefined) {
        if (type === "wildfire")
          severity = Math.min(5, Math.max(1, Math.ceil(mag / 50))) as any;
        else if (type === "volcano")
          severity = Math.min(5, Math.max(2, Math.ceil(mag / 10000))) as any;
        else severity = Math.min(5, Math.max(1, Math.ceil(mag / 2))) as any;
      }

      return {
        id: e.id || `eonet-${Math.random().toString(36).slice(2, 8)}`,
        type,
        title: e.title || "Unknown Event",
        region: e.title || "Unknown",
        lat: coords[1],
        lng: coords[0],
        severity,
        detectingSatellite: EONET_SATELLITE_MAP[sourceId] || sourceId,
        detectionDate:
          geo.date?.split("T")[0] || new Date().toISOString().split("T")[0],
        sdgImpact: getTypicalSdgImpact(type, severity),
        description:
          e.description ||
          `${e.title} — detected via ${EONET_SATELLITE_MAP[sourceId] || sourceId} satellite remote sensing.`,
        areaAffectedKm2: mag ? Math.round(mag * 80) : 500,
        status: "active" as const,
        source: "eonet",
        magnitude: mag ?? undefined,
      } satisfies ClimateEvent;
    })
    .filter(Boolean) as ClimateEvent[];
}
async function fetchGDACS(): Promise<ClimateEvent[]> {
  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date(Date.now() - 30 * 24 * 3600_000)
    .toISOString()
    .split("T")[0];

  const url = `${GDACS_API}?fromDate=${fromDate}&toDate=${toDate}&alertlevel=Green;Orange;Red&eventlist=EQ,FL,TC,DR,VO,WF&limit=40`;
  const res = await fetch(url, {
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`GDACS ${res.status}`);
  const data = await res.json();

  const features = data.features || [];
  return features
    .map((f: any) => {
      const props = f.properties || {};
      const geo = f.geometry;
      if (!geo?.coordinates || geo.coordinates.length < 2) return null;

      const eventType = props.eventtype || "";
      const type = GDACS_TYPE_MAP[eventType];
      if (!type) return null;

      const alertLevel = props.alertlevel || "Green";
      const severity = Math.min(
        5,
        Math.max(1, GDACS_ALERT_SEVERITY[alertLevel] || 2)
      ) as 1 | 2 | 3 | 4 | 5;

      const title =
        props.name ||
        props.eventname ||
        `${EVENT_TYPE_LABELS_LOCAL[type]} Event`;
      const date = props.fromdate
        ? new Date(props.fromdate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const country = props.country || "Unknown";

      const severityVal = props.severitydata?.severity;
      const severityUnit = props.severitydata?.severityunit || "";
      const magStr = severityVal ? ` (${severityVal} ${severityUnit})` : "";

      return {
        id: `gdacs-${props.eventid || Math.random().toString(36).slice(2, 8)}`,
        type,
        title,
        region: country,
        lat: geo.coordinates[1],
        lng: geo.coordinates[0],
        severity,
        detectingSatellite: "Copernicus EMS",
        detectionDate: date,
        sdgImpact: getTypicalSdgImpact(type, severity),
        description: `${title}${magStr} — ${country}. Monitored by GDACS (Global Disaster Alert and Coordination System). Alert level: ${alertLevel}.`,
        areaAffectedKm2: severityVal
          ? Math.round(severityVal * 100)
          : severity * 500,
        status: alertLevel === "Red" ? "active" : "monitoring",
        source: "gdacs",
        magnitude: severityVal ?? undefined,
      } satisfies ClimateEvent;
    })
    .filter(Boolean) as ClimateEvent[];
}
async function fetchReliefWeb(): Promise<ClimateEvent[]> {
  const fromDate = new Date(Date.now() - 90 * 24 * 3600_000)
    .toISOString()
    .split("T")[0];

  const res = await fetch(`${RELIEFWEB_API}?appname=sat-monitor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      limit: 50,
      fields: { include: ["name", "type", "country", "date", "status"] },
      filter: {
        operator: "AND",
        conditions: [{ field: "date.event", value: { from: fromDate } }],
      },
      sort: ["date.event:desc"],
    }),
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`ReliefWeb ${res.status}`);
  const data = await res.json();

  return (data.data || [])
    .map((item: any) => {
      const fields = item.fields || {};
      const typeName = fields.type?.[0]?.name || "";
      const type = RELIEFWEB_TYPE_MAP[typeName];
      if (!type) return null;

      const country = fields.country?.[0];
      const iso3 = (country?.iso3 || "").toLowerCase();
      const coords = COUNTRY_COORDS[iso3];
      if (!coords) return null;

      const [lat, lng] = coords;
      const name = fields.name || "Unknown Disaster";
      const status = fields.status || "ongoing";
      const date =
        fields.date?.created?.split("T")[0] ||
        new Date().toISOString().split("T")[0];

      // Derives a coarse severity score from hazard type and alert status when the source does not supply one.
      let severity: 1 | 2 | 3 | 4 | 5 = 3;
      if (type === "cyclone") severity = 4;
      if (type === "earthquake") severity = 4;
      if (status === "alert") severity = 4;

      // Deterministic jitter to avoid exact overlap with other sources
      const idNum = parseInt(String(item.id), 10) || 0;
      const jLat = ((idNum % 200) / 100 - 1) * 1.5;
      const jLng = (((idNum * 37) % 200) / 100 - 1) * 1.5;

      return {
        id: `rw-${item.id || Math.random().toString(36).slice(2, 8)}`,
        type,
        title: name.length > 65 ? name.slice(0, 62) + "..." : name,
        region: country?.name || "Unknown",
        lat: lat + jLat,
        lng: lng + jLng,
        severity,
        detectingSatellite: "Copernicus EMS",
        detectionDate: date,
        sdgImpact: getTypicalSdgImpact(type, severity),
        description: `${name}. Reported via ReliefWeb (OCHA). Country: ${country?.name || "Unknown"}. Status: ${status}.`,
        areaAffectedKm2: severity * 800,
        status:
          status === "ongoing" ? ("active" as const) : ("monitoring" as const),
        source: "reliefweb",
      } satisfies ClimateEvent;
    })
    .filter(Boolean) as ClimateEvent[];
}

const EVENT_TYPE_LABELS_LOCAL: Record<ClimateEventType, string> = {
  earthquake: "Earthquake",
  wildfire: "Wildfire",
  flood: "Flood",
  cyclone: "Cyclone",
  volcano: "Volcano",
  drought: "Drought",
  ice_loss: "Ice Loss",
  heatwave: "Heatwave",
};
function isNearMajorLandmass(lat: number, lng: number): boolean {
  const zones = [
    // Covers mainland North America together with Central America when filtering for major landmasses.
    { latMin: 14, latMax: 72, lngMin: -170, lngMax: -52 },
    // Covers South America when filtering for major landmasses.
    { latMin: -56, latMax: 14, lngMin: -82, lngMax: -34 },
    // Covers continental Europe and Scandinavia when filtering for major landmasses.
    { latMin: 35, latMax: 72, lngMin: -12, lngMax: 45 },
    // Covers the nearby North Atlantic islands that sit outside the broader Europe bounding box.
    { latMin: 49, latMax: 67, lngMin: -25, lngMax: 2 },
    // Covers Africa when filtering for major landmasses.
    { latMin: -36, latMax: 38, lngMin: -18, lngMax: 52 },
    // Covers the Middle East and Iran when filtering for major landmasses.
    { latMin: 12, latMax: 42, lngMin: 25, lngMax: 65 },
    // Covers South Asia, including the Indian subcontinent and nearby states.
    { latMin: 5, latMax: 38, lngMin: 65, lngMax: 98 },
    // Covers the core East Asian landmass, including China, Korea, and Mongolia.
    { latMin: 18, latMax: 55, lngMin: 73, lngMax: 135 },
    // Covers Japan separately because it falls outside the main East Asia bounding box.
    { latMin: 30, latMax: 46, lngMin: 128, lngMax: 146 },
    // Covers mainland Southeast Asia separately from the archipelagos to the south and east.
    { latMin: -8, latMax: 28, lngMin: 92, lngMax: 120 },
    // Covers the major Southeast Asian archipelagos, including Indonesia and the Philippines.
    { latMin: -11, latMax: 20, lngMin: 95, lngMax: 141 },
    // Covers Australia when filtering for major landmasses.
    { latMin: -45, latMax: -10, lngMin: 112, lngMax: 155 },
    // Covers New Zealand as a separate Oceania landmass.
    { latMin: -48, latMax: -34, lngMin: 165, lngMax: 179 },
    // Covers the high-latitude Russian landmass that sits outside the lower-latitude Asia boxes.
    { latMin: 42, latMax: 78, lngMin: 45, lngMax: 180 },
    // Caribbean (Cuba, Hispaniola, Jamaica, Puerto Rico)
    { latMin: 17, latMax: 24, lngMin: -86, lngMax: -64 },
    // Covers Madagascar separately because it falls outside the main Africa bounding box.
    { latMin: -26, latMax: -12, lngMin: 43, lngMax: 51 },
    // Covers Papua New Guinea separately to keep Oceania island events from being discarded.
    { latMin: -12, latMax: 0, lngMin: 140, lngMax: 156 },
  ];

  return zones.some(
    (z) =>
      lat >= z.latMin && lat <= z.latMax && lng >= z.lngMin && lng <= z.lngMax
  );
}
// Processes highest severity first so the most important events survive.
function deduplicateByProximity(
  events: ClimateEvent[],
  sameTypeKm: number = 200,
  crossTypeKm: number = 100
): ClimateEvent[] {
  // Sort by severity desc so we keep the most important events
  const sorted = [...events].sort((a, b) => b.severity - a.severity);
  const result: ClimateEvent[] = [];

  for (const event of sorted) {
    let tooClose = false;
    for (const existing of result) {
      const dist = haversineKm(
        existing.lat,
        existing.lng,
        event.lat,
        event.lng
      );
      const threshold = existing.type === event.type ? sameTypeKm : crossTypeKm;
      if (dist < threshold) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) result.push(event);
  }

  return result;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
export async function GET() {
  const sources: string[] = [];

  try {
    const [usgsResult, eonetResult, gdacsResult, reliefwebResult] =
      await Promise.allSettled([
        fetchUSGS(),
        fetchEONET(),
        fetchGDACS(),
        fetchReliefWeb(),
      ]);

    const allEvents: ClimateEvent[] = [];

    if (usgsResult.status === "fulfilled" && usgsResult.value.length > 0) {
      allEvents.push(...usgsResult.value);
      sources.push("usgs");
    } else {
      console.warn(
        "[Climate] USGS unavailable:",
        usgsResult.status === "rejected"
          ? (usgsResult.reason as Error).message
          : "no data"
      );
    }

    if (eonetResult.status === "fulfilled" && eonetResult.value.length > 0) {
      allEvents.push(...eonetResult.value);
      sources.push("eonet");
    } else {
      console.warn(
        "[Climate] EONET unavailable:",
        eonetResult.status === "rejected"
          ? (eonetResult.reason as Error).message
          : "no data"
      );
    }

    if (gdacsResult.status === "fulfilled" && gdacsResult.value.length > 0) {
      allEvents.push(...gdacsResult.value);
      sources.push("gdacs");
    } else {
      console.warn(
        "[Climate] GDACS unavailable:",
        gdacsResult.status === "rejected"
          ? (gdacsResult.reason as Error).message
          : "no data"
      );
    }

    if (
      reliefwebResult.status === "fulfilled" &&
      reliefwebResult.value.length > 0
    ) {
      allEvents.push(...reliefwebResult.value);
      sources.push("reliefweb");
    } else {
      console.warn(
        "[Climate] ReliefWeb unavailable:",
        reliefwebResult.status === "rejected"
          ? (reliefwebResult.reason as Error).message
          : "no data"
      );
    }

    if (allEvents.length === 0) {
      return NextResponse.json({
        events: MOCK_CLIMATE_EVENTS,
        sources: ["mock"],
      });
    }

    // Tiered proximity dedup: same-type 800km, cross-type 500km
    const deduped = deduplicateByProximity(allEvents, 800, 500);

    // Remove events on isolated small islands (look like ocean markers)
    const landFiltered = deduped.filter((e) =>
      isNearMajorLandmass(e.lat, e.lng)
    );

    // Sort by severity first to keep most important when capping
    landFiltered.sort(
      (a, b) =>
        b.severity - a.severity ||
        new Date(b.detectionDate).getTime() -
          new Date(a.detectionDate).getTime()
    );

    // Caps the final land-event list so the map stays readable and performant.
    const capped = landFiltered.slice(0, 80);

    // Re-sort for display: newest first, then severity
    capped.sort((a, b) => {
      const dateDiff =
        new Date(b.detectionDate).getTime() -
        new Date(a.detectionDate).getTime();
      return dateDiff || b.severity - a.severity;
    });

    return NextResponse.json({ events: capped, sources });
  } catch (error) {
    console.warn(
      "[Climate] All sources failed, using mock data:",
      (error as Error).message
    );
    return NextResponse.json({
      events: MOCK_CLIMATE_EVENTS,
      sources: ["mock"],
    });
  }
}
function getTypicalSdgImpact(
  type: ClimateEventType,
  severity: number
): { sdg: number; score: number }[] {
  const base = severity * -0.6;
  switch (type) {
    case "earthquake":
      return [
        { sdg: 11, score: +(base * 1.4).toFixed(1) },
        { sdg: 1, score: +(base * 1.0).toFixed(1) },
        { sdg: 9, score: +(base * 0.7).toFixed(1) },
      ];
    case "wildfire":
      return [
        { sdg: 13, score: +(base * 1.2).toFixed(1) },
        { sdg: 15, score: +(base * 1.0).toFixed(1) },
      ];
    case "flood":
      return [
        { sdg: 6, score: +(base * 1.3).toFixed(1) },
        { sdg: 1, score: +(base * 0.9).toFixed(1) },
        { sdg: 11, score: +(base * 0.8).toFixed(1) },
      ];
    case "cyclone":
      return [
        { sdg: 11, score: +(base * 1.3).toFixed(1) },
        { sdg: 1, score: +(base * 1.1).toFixed(1) },
        { sdg: 13, score: +(base * 0.7).toFixed(1) },
      ];
    case "volcano":
      return [
        { sdg: 11, score: +(base * 1.2).toFixed(1) },
        { sdg: 3, score: +(base * 0.9).toFixed(1) },
        { sdg: 13, score: +(base * 0.6).toFixed(1) },
      ];
    case "drought":
      return [
        { sdg: 2, score: +(base * 1.4).toFixed(1) },
        { sdg: 6, score: +(base * 1.2).toFixed(1) },
      ];
    case "ice_loss":
      return [
        { sdg: 13, score: +(base * 1.3).toFixed(1) },
        { sdg: 14, score: +(base * 0.8).toFixed(1) },
      ];
    case "heatwave":
      return [
        { sdg: 3, score: +(base * 1.1).toFixed(1) },
        { sdg: 13, score: +(base * 0.8).toFixed(1) },
      ];
  }
}
