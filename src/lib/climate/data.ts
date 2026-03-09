export type ClimateEventType =
  | "earthquake"
  | "wildfire"
  | "flood"
  | "cyclone"
  | "volcano"
  | "drought"
  | "ice_loss"
  | "heatwave";

export type EventStatus = "active" | "monitoring" | "resolved";

export interface ClimateEvent {
  id: string;
  type: ClimateEventType;
  title: string;
  region: string;
  lat: number;
  lng: number;
  severity: 1 | 2 | 3 | 4 | 5;
  detectingSatellite: string;
  detectionDate: string; // Stores the detection timestamp in ISO date format.
  sdgImpact: { sdg: number; score: number }[];
  description: string;
  areaAffectedKm2: number;
  status: EventStatus;
  source?: string; // Records which upstream feed supplied the event.
  magnitude?: number; // Stores the raw source magnitude when one is available.
}

export const EVENT_TYPE_COLORS: Record<ClimateEventType, string> = {
  earthquake: "#ff3a8c",
  wildfire: "#ff6b2c",
  flood: "#00e5ff",
  cyclone: "#b44aff",
  volcano: "#ff4444",
  drought: "#ffd54f",
  ice_loss: "#4aa8ff",
  heatwave: "#ff9e64",
};

export const EVENT_TYPE_LABELS: Record<ClimateEventType, string> = {
  earthquake: "Earthquake",
  wildfire: "Wildfire",
  flood: "Flood",
  cyclone: "Cyclone",
  volcano: "Volcano",
  drought: "Drought",
  ice_loss: "Ice Loss",
  heatwave: "Heatwave",
};

export const EVENT_TYPE_ICONS: Record<ClimateEventType, string> = {
  earthquake: "⟁",
  wildfire: "△",
  flood: "≋",
  cyclone: "◎",
  volcano: "▲",
  drought: "◇",
  ice_loss: "◆",
  heatwave: "○",
};

export const ALL_EVENT_TYPES: ClimateEventType[] = [
  "earthquake",
  "wildfire",
  "flood",
  "cyclone",
  "volcano",
  "drought",
  "ice_loss",
  "heatwave",
];

/**
 * Maps raw coordinates into the broad regional buckets used by the climate
 * dashboard filters and summaries.
 */
export function getRegionFromCoords(lat: number, lng: number): string {
  if (lat > 60) return "Arctic";
  if (lat < -60) return "Antarctic";
  if (lat >= 15 && lat <= 45 && lng >= -130 && lng <= -60)
    return "North America";
  if (lat >= -56 && lat < 15 && lng >= -82 && lng <= -34)
    return "South America";
  if (lat >= 35 && lat <= 72 && lng >= -11 && lng <= 40) return "Europe";
  if (lat >= -35 && lat < 35 && lng >= -20 && lng <= 55) return "Africa";
  if (lat >= 10 && lat <= 45 && lng >= 25 && lng <= 75) return "Middle East";
  if (lat >= -50 && lng >= 60 && lng <= 180) return "Asia-Pacific";
  if (lat >= -50 && lng >= 100 && lng <= 180) return "Asia-Pacific";
  if (lat >= -50 && lat < 15 && lng >= 110) return "Asia-Pacific";
  if (lat >= 15 && lng >= 60) return "Asia-Pacific";
  return "Other";
}

export const MOCK_CLIMATE_EVENTS: ClimateEvent[] = [
  // Places earthquake records first so development filters and charts read from a stable mock ordering.
  {
    id: "eq-001",
    type: "earthquake",
    title: "M6.4 Earthquake — Mindanao",
    region: "Mindanao, Philippines",
    lat: 7.1,
    lng: 126.2,
    severity: 4,
    detectingSatellite: "ALOS-2",
    detectionDate: "2026-02-24",
    sdgImpact: [
      { sdg: 11, score: -2.6 },
      { sdg: 1, score: -1.8 },
    ],
    description:
      "Magnitude 6.4 tectonic earthquake at 35km depth beneath eastern Mindanao. ALOS-2 InSAR analysis reveals surface displacement across a 40km rupture zone.",
    areaAffectedKm2: 3200,
    status: "active",
    source: "usgs",
    magnitude: 6.4,
  },
  {
    id: "eq-002",
    type: "earthquake",
    title: "M5.8 Earthquake — Hindu Kush",
    region: "Badakhshan, Afghanistan",
    lat: 36.5,
    lng: 70.8,
    severity: 3,
    detectingSatellite: "Sentinel-1",
    detectionDate: "2026-02-20",
    sdgImpact: [
      { sdg: 11, score: -1.8 },
      { sdg: 1, score: -1.4 },
    ],
    description:
      "Moderate earthquake at intermediate depth (190km). Felt across northern Afghanistan and Tajikistan. Sentinel-1 coherence analysis ongoing.",
    areaAffectedKm2: 1500,
    status: "monitoring",
    source: "usgs",
    magnitude: 5.8,
  },
  {
    id: "eq-003",
    type: "earthquake",
    title: "M7.1 Earthquake — Vanuatu Trench",
    region: "Vanuatu, Pacific",
    lat: -15.4,
    lng: 167.0,
    severity: 5,
    detectingSatellite: "Sentinel-1",
    detectionDate: "2026-02-18",
    sdgImpact: [
      { sdg: 11, score: -3.2 },
      { sdg: 14, score: -1.5 },
    ],
    description:
      "Major subduction zone earthquake triggering localised tsunami warning. Sentinel-1 SAR confirms coastal displacement on Efate island.",
    areaAffectedKm2: 8000,
    status: "active",
    source: "usgs",
    magnitude: 7.1,
  },
  // Lists wildfire records used by fire-oriented maps, feeds, and charts.
  {
    id: "wf-001",
    type: "wildfire",
    title: "Australian Bushfire — New South Wales",
    region: "New South Wales, Australia",
    lat: -33.87,
    lng: 151.21,
    severity: 4,
    detectingSatellite: "Sentinel-2",
    detectionDate: "2026-01-22",
    sdgImpact: [
      { sdg: 15, score: -2.5 },
      { sdg: 13, score: -1.8 },
    ],
    description:
      "Bushfire outbreak in the Blue Mountains region. Sentinel-2 imagery shows active burn scars expanding northeast under strong westerly winds.",
    areaAffectedKm2: 850,
    status: "active",
    source: "eonet",
  },
  {
    id: "wf-002",
    type: "wildfire",
    title: "Siberian Taiga Fire Season",
    region: "Yakutia, Russia",
    lat: 62.03,
    lng: 129.73,
    severity: 4,
    detectingSatellite: "VIIRS/Suomi NPP",
    detectionDate: "2025-12-10",
    sdgImpact: [
      { sdg: 13, score: -2.9 },
      { sdg: 15, score: -3.2 },
    ],
    description:
      "Late-season taiga fires persisting in permafrost regions. VIIRS nightfire data shows smouldering peat combustion at unprecedented extent.",
    areaAffectedKm2: 4500,
    status: "monitoring",
    source: "eonet",
  },
  {
    id: "wf-003",
    type: "wildfire",
    title: "Cerrado Savanna Fires — Goiás",
    region: "Goiás, Brazil",
    lat: -15.94,
    lng: -49.25,
    severity: 3,
    detectingSatellite: "MODIS/Aqua",
    detectionDate: "2026-02-05",
    sdgImpact: [
      { sdg: 15, score: -2.0 },
      { sdg: 13, score: -1.5 },
    ],
    description:
      "Dry-season fires across the Cerrado biome detected by MODIS active fire products.",
    areaAffectedKm2: 620,
    status: "active",
    source: "eonet",
  },
  // Lists flood records used by inundation and hazard-focused views.
  {
    id: "fl-001",
    type: "flood",
    title: "Bangladesh Monsoon Flooding",
    region: "Sylhet Division, Bangladesh",
    lat: 24.9,
    lng: 91.87,
    severity: 5,
    detectingSatellite: "Sentinel-1",
    detectionDate: "2026-01-05",
    sdgImpact: [
      { sdg: 6, score: -3.5 },
      { sdg: 1, score: -2.8 },
      { sdg: 11, score: -2.4 },
    ],
    description:
      "Severe riverine flooding across the Surma-Meghna floodplain. Sentinel-1 SAR confirms over 8,000 km² inundated.",
    areaAffectedKm2: 8200,
    status: "active",
    source: "eonet",
  },
  {
    id: "fl-002",
    type: "flood",
    title: "Niger River Overflow — Niamey",
    region: "Niamey, Niger",
    lat: 13.51,
    lng: 2.11,
    severity: 4,
    detectingSatellite: "Landsat-9",
    detectionDate: "2025-12-18",
    sdgImpact: [
      { sdg: 1, score: -2.6 },
      { sdg: 6, score: -2.1 },
    ],
    description:
      "Annual Niger River flooding exacerbated by upstream dam releases. Landsat-9 shows floodwater extent exceeding 2020 records.",
    areaAffectedKm2: 1800,
    status: "monitoring",
    source: "gdacs",
  },
  {
    id: "fl-003",
    type: "flood",
    title: "Peruvian Coastal Flooding — El Niño",
    region: "Piura, Peru",
    lat: -5.19,
    lng: -80.63,
    severity: 4,
    detectingSatellite: "MODIS/Aqua",
    detectionDate: "2026-02-01",
    sdgImpact: [
      { sdg: 1, score: -2.3 },
      { sdg: 11, score: -1.9 },
    ],
    description:
      "El Niño-driven rainfall causing severe coastal flooding in northern Peru.",
    areaAffectedKm2: 1100,
    status: "active",
    source: "eonet",
  },
  // Lists cyclone records used by storm-tracking views.
  {
    id: "cy-001",
    type: "cyclone",
    title: "Tropical Cyclone Anggrek — Bay of Bengal",
    region: "Bay of Bengal, Indian Ocean",
    lat: 14.2,
    lng: 87.5,
    severity: 4,
    detectingSatellite: "GOES-16",
    detectionDate: "2026-02-22",
    sdgImpact: [
      { sdg: 11, score: -2.5 },
      { sdg: 1, score: -2.0 },
      { sdg: 13, score: -1.3 },
    ],
    description:
      "Category 3 cyclone tracking northwest toward Andhra Pradesh coast. GOES-16 infrared imagery shows symmetric eye formation at 90kt sustained winds.",
    areaAffectedKm2: 45000,
    status: "active",
    source: "eonet",
  },
  {
    id: "cy-002",
    type: "cyclone",
    title: "Typhoon Karding — Western Pacific",
    region: "Luzon, Philippines",
    lat: 16.5,
    lng: 121.0,
    severity: 5,
    detectingSatellite: "Himawari-9",
    detectionDate: "2026-02-15",
    sdgImpact: [
      { sdg: 11, score: -3.0 },
      { sdg: 1, score: -2.5 },
    ],
    description:
      "Super typhoon with 155kt sustained winds approaching Luzon. Himawari-9 visible imagery reveals pinhole eye and intense convective towers.",
    areaAffectedKm2: 65000,
    status: "active",
    source: "gdacs",
  },
  // Lists volcanic activity records used by eruption-monitoring views.
  {
    id: "vo-001",
    type: "volcano",
    title: "Mount Etna Eruption — Sicily",
    region: "Sicily, Italy",
    lat: 37.75,
    lng: 14.99,
    severity: 3,
    detectingSatellite: "Sentinel-2",
    detectionDate: "2026-02-10",
    sdgImpact: [
      { sdg: 11, score: -1.5 },
      { sdg: 13, score: -1.0 },
    ],
    description:
      "Strombolian eruption from the Southeast Crater with lava fountaining to 500m. Sentinel-2 SWIR imagery maps thermal anomaly and SO₂ plume.",
    areaAffectedKm2: 25,
    status: "active",
    source: "eonet",
  },
  {
    id: "vo-002",
    type: "volcano",
    title: "Popocatépetl Activity — Mexico",
    region: "Puebla, Mexico",
    lat: 19.02,
    lng: -98.62,
    severity: 4,
    detectingSatellite: "MODIS/Terra",
    detectionDate: "2026-01-28",
    sdgImpact: [
      { sdg: 3, score: -2.2 },
      { sdg: 11, score: -1.8 },
    ],
    description:
      "Increased explosive activity with ash column reaching 9km ASL. MODIS thermal anomaly and TROPOMI SO₂ data show sustained degassing.",
    areaAffectedKm2: 2500,
    status: "active",
    source: "eonet",
  },
  // Lists drought records used by long-duration hazard views.
  {
    id: "dr-001",
    type: "drought",
    title: "Horn of Africa Mega-Drought",
    region: "Somalia / Ethiopia",
    lat: 2.05,
    lng: 45.32,
    severity: 5,
    detectingSatellite: "GRACE-FO",
    detectionDate: "2025-12-01",
    sdgImpact: [
      { sdg: 2, score: -3.8 },
      { sdg: 6, score: -3.2 },
      { sdg: 1, score: -2.9 },
    ],
    description:
      "Multi-year drought entering sixth consecutive failed rainy season. GRACE-FO gravity data shows groundwater depletion at critical levels.",
    areaAffectedKm2: 580000,
    status: "active",
    source: "gdacs",
  },
  {
    id: "dr-002",
    type: "drought",
    title: "Southern Spain Desertification",
    region: "Andalusia, Spain",
    lat: 37.39,
    lng: -5.99,
    severity: 4,
    detectingSatellite: "Sentinel-2",
    detectionDate: "2025-12-15",
    sdgImpact: [
      { sdg: 15, score: -2.4 },
      { sdg: 2, score: -2.0 },
    ],
    description:
      "Multi-year precipitation deficit pushing Andalusia toward permanent desertification. Sentinel-2 NDVI shows vegetation decline across 35% of arable land.",
    areaAffectedKm2: 28000,
    status: "active",
    source: "eonet",
  },
  // Lists cryosphere-loss records used by glacier and ice-monitoring views.
  {
    id: "il-001",
    type: "ice_loss",
    title: "Thwaites Glacier Calving Event",
    region: "West Antarctica",
    lat: -75.5,
    lng: -106.75,
    severity: 5,
    detectingSatellite: "CryoSat-2",
    detectionDate: "2026-01-08",
    sdgImpact: [
      { sdg: 13, score: -3.5 },
      { sdg: 14, score: -2.2 },
    ],
    description:
      "Major calving event detected on the Thwaites Glacier eastern ice shelf. CryoSat-2 altimetry shows 800 km² iceberg break.",
    areaAffectedKm2: 800,
    status: "monitoring",
    source: "eonet",
  },
  {
    id: "il-002",
    type: "ice_loss",
    title: "Greenland Ice Sheet Melt Acceleration",
    region: "Southwest Greenland",
    lat: 66.5,
    lng: -46.0,
    severity: 4,
    detectingSatellite: "ICESat-2",
    detectionDate: "2026-02-12",
    sdgImpact: [
      { sdg: 13, score: -2.9 },
      { sdg: 14, score: -1.5 },
    ],
    description:
      "ICESat-2 laser altimetry reveals surface elevation loss of 2.3m/year along southwest marginal ice zones.",
    areaAffectedKm2: 35000,
    status: "active",
    source: "eonet",
  },
  // Lists heatwave records used by temperature-extreme views.
  {
    id: "hw-001",
    type: "heatwave",
    title: "Saharan Heat Dome — North Africa",
    region: "Algeria / Libya",
    lat: 32.0,
    lng: 5.0,
    severity: 4,
    detectingSatellite: "MODIS/Aqua",
    detectionDate: "2026-02-18",
    sdgImpact: [
      { sdg: 3, score: -2.5 },
      { sdg: 13, score: -1.8 },
    ],
    description:
      "Record February temperatures exceeding 48°C across central Algeria. MODIS LST product shows persistent heat dome for 12 consecutive days.",
    areaAffectedKm2: 250000,
    status: "active",
    source: "eonet",
  },
  {
    id: "hw-002",
    type: "heatwave",
    title: "Southeast Asian Heatwave",
    region: "Thailand / Cambodia",
    lat: 14.0,
    lng: 101.0,
    severity: 4,
    detectingSatellite: "VIIRS/Suomi NPP",
    detectionDate: "2026-02-20",
    sdgImpact: [
      { sdg: 3, score: -2.3 },
      { sdg: 2, score: -1.6 },
    ],
    description:
      "Extreme heat index exceeding 54°C across the Chao Phraya basin. VIIRS thermal imagery shows urban heat island amplification.",
    areaAffectedKm2: 180000,
    status: "active",
    source: "eonet",
  },
];
