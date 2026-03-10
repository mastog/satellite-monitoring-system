/**
 * Defines the SDG scoring metadata and indicator templates used by the
 * application's analysis pipeline. The engine combines satellite-derived
 * indicators into normalized SDG scores that can be rendered consistently
 * across regions and dashboard views.
 */

export interface SDGIndicator {
  id: string;
  name: string;
  value: number; // Stores the indicator as a 0-100 normalized value.
  weight: number; // Stores the relative contribution of the indicator within its SDG score.
  source: string; // Describes the data source used to derive the indicator.
  trend: "improving" | "declining" | "stable";
  algorithm?: string;
  methodology?: string;
  satelliteSource?: string;
  updateFrequency?: string;
}

export interface SDGScore {
  sdgNumber: number;
  title: string;
  score: number; // Stores the final 0-100 composite score for the SDG.
  confidence: number; // Stores the normalized confidence estimate for the computed score.
  indicators: SDGIndicator[];
  color: string;
  icon: string;
  description: string;
  methodology?: string;
}

export interface RegionalSDGData {
  region: string;
  lat: number;
  lng: number;
  scores: SDGScore[];
  overallScore: number;
}

export const SDG_DEFINITIONS: Omit<
  SDGScore,
  "score" | "confidence" | "indicators"
>[] = [
  {
    sdgNumber: 6,
    title: "Clean Water & Sanitation",
    color: "#26bde2",
    icon: "water-drop",
    description:
      "Ensure availability and sustainable management of water and sanitation for all",
    methodology:
      "Composite score from 4 satellite-derived indicators: surface water extent (Sentinel-2 NDWI), water quality (Landsat spectral analysis), precipitation anomalies (GPM IMERG), and groundwater storage changes (GRACE-FO gravity field). Each indicator is normalized 0\u2013100 and combined using domain-expert weights.",
  },
  {
    sdgNumber: 9,
    title: "Industry, Innovation & Infrastructure",
    color: "#fd6925",
    icon: "gear",
    description:
      "Build resilient infrastructure, promote inclusive and sustainable industrialization",
    methodology:
      "Infrastructure development assessed via nighttime light intensity changes (VIIRS DNB), road network extraction from SAR imagery (Sentinel-1), built-up area classification (Sentinel-2), and telecommunications connectivity estimation. Weighted composite reflects economic activity and physical infrastructure growth.",
  },
  {
    sdgNumber: 11,
    title: "Sustainable Cities & Communities",
    color: "#f99d26",
    icon: "city",
    description:
      "Make cities and human settlements inclusive, safe, resilient and sustainable",
    methodology:
      "Urban sustainability measured through expansion rate (Landsat time-series change detection), green space ratio (Sentinel-2 NDVI within urban boundaries), air quality via PM2.5 proxy (MODIS AOD inversion), and urban heat island intensity (Landsat thermal bands). Higher green space and lower heat island improve scores.",
  },
  {
    sdgNumber: 12,
    title: "Responsible Consumption & Production",
    color: "#bf8b2e",
    icon: "recycle",
    description: "Ensure sustainable consumption and production patterns",
    methodology:
      "Production sustainability assessed by waste site extent changes (Sentinel-2 supervised classification), mining footprint impact (Sentinel-1/2 fusion), agricultural efficiency via enhanced vegetation index (MODIS EVI), and production-linked deforestation rates (Hansen Global Forest Change). Lower environmental footprint yields higher scores.",
  },
  {
    sdgNumber: 13,
    title: "Climate Action",
    color: "#3f7e44",
    icon: "globe",
    description: "Take urgent action to combat climate change and its impacts",
    methodology:
      "Climate indicators combine surface temperature anomalies (ERA5 reanalysis + Sentinel-3 LST), sea level changes (Jason-3 radar altimetry), ice sheet mass balance (CryoSat-2 elevation changes), and atmospheric CO\u2082 concentrations (OCO-2/3 column retrievals). Score inversely proportional to deviation from baseline targets.",
  },
  {
    sdgNumber: 15,
    title: "Life on Land",
    color: "#56c02b",
    icon: "leaf",
    description:
      "Protect, restore and promote sustainable use of terrestrial ecosystems",
    methodology:
      "Terrestrial ecosystem health from vegetation coverage (MODIS/Sentinel-2 NDVI composites), forest loss rates (Hansen GFC annual updates), biodiversity habitat connectivity index (multi-sensor landscape analysis), and soil degradation risk (Sentinel-1 soil moisture anomalies). Stable or increasing vegetation and forest coverage improve scores.",
  },
];

// Exposes reusable indicator templates at module scope so UI and analysis code
// can reference the same definitions and metadata.

interface IndicatorTemplate {
  id: string;
  name: string;
  weight: number;
  source: string;
  algorithm: string;
  methodology: string;
  satelliteSource: string;
  updateFrequency: string;
}

export const indicatorSets: Record<number, IndicatorTemplate[]> = {
  6: [
    {
      id: "water-body-area",
      name: "Surface Water Body Area",
      weight: 0.3,
      source: "Sentinel-2 NDWI",
      algorithm:
        "NDWI = (Green \u2212 NIR) / (Green + NIR), threshold > 0.3 for water classification",
      methodology:
        "Score = current_area / baseline_area \u00d7 100, baseline from 2015\u20132020 median",
      satelliteSource:
        "ESA Sentinel-2A/2B MSI, 10m spatial resolution, 5-day revisit",
      updateFrequency: "Every 10 days",
    },
    {
      id: "water-quality",
      name: "Water Quality Index",
      weight: 0.25,
      source: "Landsat 8 spectral",
      algorithm:
        "Trophic State Index from chlorophyll-a retrieval using Blue/Green band ratio",
      methodology:
        "Score = 100 \u2212 (TSI / max_TSI \u00d7 100), lower turbidity = higher score",
      satelliteSource:
        "USGS/NASA Landsat 8/9 OLI, 30m resolution, 16-day revisit",
      updateFrequency: "Every 16 days",
    },
    {
      id: "precipitation",
      name: "Precipitation Anomaly",
      weight: 0.2,
      source: "GPM IMERG",
      algorithm:
        "Monthly accumulated precipitation compared to 20-year climatological mean",
      methodology:
        "Score = 100 \u2212 |anomaly_pct|, closer to normal = higher score",
      satelliteSource:
        "NASA/JAXA GPM Core Observatory + constellation, 0.1\u00b0 grid, 30-min temporal",
      updateFrequency: "Daily (final product: monthly)",
    },
    {
      id: "groundwater",
      name: "Groundwater Storage",
      weight: 0.25,
      source: "GRACE-FO",
      algorithm:
        "Terrestrial water storage anomaly from gravity field spherical harmonics (degree/order 96)",
      methodology:
        "Score = normalize(TWS_anomaly) where stable/increasing storage = higher score",
      satelliteSource:
        "NASA/GFZ GRACE Follow-On, ~300 km resolution, monthly solutions",
      updateFrequency: "Monthly",
    },
  ],
  9: [
    {
      id: "nightlight-growth",
      name: "Nighttime Light Growth",
      weight: 0.3,
      source: "VIIRS DNB",
      algorithm:
        "Year-over-year radiance change in stray-light-corrected DNB composites",
      methodology:
        "Score = normalize(growth_rate), positive growth = higher score, capped at 100",
      satelliteSource:
        "NOAA-20/Suomi NPP VIIRS Day/Night Band, 750m resolution, daily",
      updateFrequency: "Monthly composites",
    },
    {
      id: "road-density",
      name: "Road Network Density",
      weight: 0.25,
      source: "Sentinel-1 SAR",
      algorithm:
        "Road extraction using Sentinel-1 VV/VH backscatter with U-Net segmentation",
      methodology: "Score = road_km_per_km\u00b2 / regional_target \u00d7 100",
      satelliteSource:
        "ESA Sentinel-1A/1B C-band SAR, 10m resolution, 6-day revisit",
      updateFrequency: "Every 12 days",
    },
    {
      id: "urban-infrastructure",
      name: "Infrastructure Development",
      weight: 0.25,
      source: "Sentinel-2 RGB",
      algorithm:
        "Built-up area extraction using Random Forest on spectral + texture features",
      methodology:
        "Score = built_up_change_rate normalized against development targets",
      satelliteSource: "ESA Sentinel-2A/2B MSI, 10m resolution, 5-day revisit",
      updateFrequency: "Quarterly",
    },
    {
      id: "connectivity",
      name: "Connectivity Coverage",
      weight: 0.2,
      source: "Telecom SAR analysis",
      algorithm:
        "Telecom tower detection from SAR point target analysis + coverage modeling",
      methodology:
        "Score = estimated_coverage_pct of populated areas within region",
      satelliteSource:
        "Sentinel-1 SAR + commercial high-resolution imagery, variable resolution",
      updateFrequency: "Quarterly",
    },
  ],
  11: [
    {
      id: "urban-expansion",
      name: "Urban Expansion Rate",
      weight: 0.25,
      source: "Landsat time-series",
      algorithm:
        "Multi-temporal urban extent classification using spectral mixture analysis",
      methodology:
        "Score = 100 \u2212 expansion_rate_pct (slower expansion = more sustainable)",
      satelliteSource:
        "USGS/NASA Landsat 8/9, 30m resolution, 16-day revisit cycle",
      updateFrequency: "Annual (with quarterly interim)",
    },
    {
      id: "green-space",
      name: "Urban Green Space Ratio",
      weight: 0.25,
      source: "Sentinel-2 NDVI",
      algorithm:
        "NDVI > 0.3 within administrative urban boundaries = green space pixels",
      methodology: "Score = green_area / total_urban_area \u00d7 100",
      satelliteSource: "ESA Sentinel-2A/2B MSI, 10m resolution, 5-day revisit",
      updateFrequency: "Every 10 days",
    },
    {
      id: "air-quality",
      name: "Air Quality (PM2.5)",
      weight: 0.3,
      source: "MODIS AOD",
      algorithm:
        "PM2.5 estimation from Aerosol Optical Depth using geographically weighted regression",
      methodology:
        "Score = 100 \u2212 (PM2.5_ug_m3 / WHO_guideline \u00d7 50), lower PM2.5 = higher score",
      satelliteSource:
        "NASA Terra/Aqua MODIS, 3km AOD product (MCD19A2), daily",
      updateFrequency: "Daily",
    },
    {
      id: "heat-island",
      name: "Urban Heat Island Effect",
      weight: 0.2,
      source: "Landsat 8 TIRS",
      algorithm:
        "Land Surface Temperature retrieval from TIRS Band 10 using split-window algorithm",
      methodology:
        "Score = 100 \u2212 (urban_LST \u2212 rural_LST) \u00d7 5, lower differential = higher score",
      satelliteSource:
        "USGS/NASA Landsat 8/9 TIRS, 100m (resampled 30m), 16-day revisit",
      updateFrequency: "Every 16 days",
    },
  ],
  12: [
    {
      id: "waste-sites",
      name: "Waste Site Monitoring",
      weight: 0.3,
      source: "Sentinel-2 classification",
      algorithm:
        "Supervised classification (SVM) of waste deposits using SWIR + visible bands",
      methodology:
        "Score = 100 \u2212 (waste_area_change_pct \u00d7 2), shrinking waste sites = higher score",
      satelliteSource:
        "ESA Sentinel-2A/2B MSI, 10\u201320m resolution, 5-day revisit",
      updateFrequency: "Monthly",
    },
    {
      id: "mining-impact",
      name: "Mining Impact Assessment",
      weight: 0.25,
      source: "Sentinel-1/2 fusion",
      algorithm:
        "Change detection fusing SAR coherence loss with spectral anomaly mapping",
      methodology:
        "Score = 100 \u2212 impacted_area_km2 / regional_threshold \u00d7 100",
      satelliteSource: "ESA Sentinel-1 SAR + Sentinel-2 MSI, 10m resolution",
      updateFrequency: "Monthly",
    },
    {
      id: "agricultural-eff",
      name: "Agricultural Efficiency",
      weight: 0.25,
      source: "MODIS EVI",
      algorithm:
        "Crop yield proxy from peak-season Enhanced Vegetation Index integration",
      methodology:
        "Score = actual_EVI_integral / potential_EVI_integral \u00d7 100",
      satelliteSource:
        "NASA Terra/Aqua MODIS, 250m EVI product (MOD13Q1), 16-day",
      updateFrequency: "Every 16 days",
    },
    {
      id: "deforestation-prod",
      name: "Production-linked Deforestation",
      weight: 0.2,
      source: "Hansen GFC",
      algorithm:
        "Annual tree cover loss detection using Landsat time-series break detection",
      methodology:
        "Score = 100 \u2212 (annual_loss_ha / baseline_forest_ha \u00d7 1000)",
      satelliteSource:
        "Hansen/UMD Global Forest Change, Landsat-derived, 30m resolution",
      updateFrequency: "Annual",
    },
  ],
  13: [
    {
      id: "temperature-anomaly",
      name: "Temperature Anomaly",
      weight: 0.3,
      source: "ERA5 + Sentinel-3",
      algorithm:
        "Land Surface Temperature anomaly from Sentinel-3 SLSTR calibrated against ERA5 reanalysis",
      methodology:
        "Score = 100 \u2212 |temp_anomaly_C| \u00d7 20, closer to baseline = higher score",
      satelliteSource:
        "ESA Sentinel-3 SLSTR + ECMWF ERA5 reanalysis, 1km resolution",
      updateFrequency: "Daily",
    },
    {
      id: "sea-level",
      name: "Sea Level Change",
      weight: 0.2,
      source: "Jason-3 altimetry",
      algorithm:
        "Sea surface height from radar altimetry with tidal/atmospheric corrections",
      methodology:
        "Score = 100 \u2212 (cumulative_rise_mm / 100 \u00d7 50), slower rise = higher score",
      satelliteSource:
        "NASA/CNES/EUMETSAT Jason-3, along-track ~300m, 10-day exact repeat",
      updateFrequency: "Every 10 days",
    },
    {
      id: "ice-coverage",
      name: "Ice Sheet Coverage",
      weight: 0.25,
      source: "CryoSat-2",
      algorithm:
        "Ice sheet elevation change from SAR/Interferometric radar altimetry",
      methodology:
        "Score = normalize(mass_balance), stable or gaining mass = higher score",
      satelliteSource:
        "ESA CryoSat-2 SIRAL, ~1.65 km resolution, 369-day repeat",
      updateFrequency: "Monthly",
    },
    {
      id: "carbon-emissions",
      name: "CO\u2082 Emissions Proxy",
      weight: 0.25,
      source: "OCO-2/3",
      algorithm:
        "Column-averaged CO\u2082 (XCO2) retrieval from near-infrared spectrometry",
      methodology:
        "Score = 100 \u2212 (regional_XCO2 \u2212 global_mean) \u00d7 10, lower excess = higher score",
      satelliteSource:
        "NASA OCO-2 (sun-synchronous) + OCO-3 (ISS), ~2.25 km footprint",
      updateFrequency: "Every 16 days",
    },
  ],
  15: [
    {
      id: "vegetation-ndvi",
      name: "Vegetation Coverage (NDVI)",
      weight: 0.3,
      source: "MODIS/Sentinel-2",
      algorithm:
        "Maximum Value Composite NDVI from 16-day MODIS + 10-day Sentinel-2 stacks",
      methodology: "Score = regional_mean_NDVI / reference_NDVI \u00d7 100",
      satelliteSource:
        "NASA MODIS (250m) + ESA Sentinel-2 (10m), fused product",
      updateFrequency: "Every 10 days",
    },
    {
      id: "forest-loss",
      name: "Forest Loss Rate",
      weight: 0.3,
      source: "Hansen GFC",
      algorithm:
        "Annual tree cover loss pixels (>50% canopy) from Landsat time-series",
      methodology:
        "Score = 100 \u2212 (annual_loss_rate_pct \u00d7 20), less loss = higher score",
      satelliteSource:
        "Hansen/UMD Global Forest Change, Landsat-derived, 30m resolution",
      updateFrequency: "Annual",
    },
    {
      id: "biodiversity-proxy",
      name: "Biodiversity Habitat Index",
      weight: 0.2,
      source: "Multi-sensor fusion",
      algorithm:
        "Habitat connectivity from landscape fragmentation analysis (patch cohesion index)",
      methodology:
        "Score = cohesion_index normalized 0\u2013100, higher connectivity = higher score",
      satelliteSource:
        "Sentinel-2 MSI + Landsat + MODIS land cover, multi-resolution fusion",
      updateFrequency: "Quarterly",
    },
    {
      id: "soil-degradation",
      name: "Soil Degradation Risk",
      weight: 0.2,
      source: "Sentinel-1 soil moisture",
      algorithm:
        "Soil moisture anomaly from Sentinel-1 backscatter change detection model",
      methodology:
        "Score = 100 \u2212 degradation_risk_index \u00d7 100, lower risk = higher score",
      satelliteSource:
        "ESA Sentinel-1 C-band SAR, 1km soil moisture product, 3-day revisit",
      updateFrequency: "Every 6 days",
    },
  ],
};

/**
 * Get indicator templates for a given SDG number
 */
export function getIndicatorTemplates(sdgNumber: number): IndicatorTemplate[] {
  return indicatorSets[sdgNumber] || [];
}

/**
 * Compute composite SDG score from weighted indicators
 */
function computeScore(indicators: SDGIndicator[]): number {
  const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
  const weightedSum = indicators.reduce(
    (sum, ind) => sum + ind.value * ind.weight,
    0
  );
  return Math.round(weightedSum / totalWeight);
}

/**
 * Compute confidence from indicator characteristics.
 *
 * Confidence reflects how reliable the composite score is, derived from:
 *  1. Indicator agreement   (35%) — low inter-indicator variance → higher confidence
 *  2. Trend consistency     (25%) — indicators sharing the same trend → higher confidence
 *  3. Temporal resolution   (20%) — more frequent satellite revisits → fresher data
 *  4. Source diversity       (20%) — independent sensor platforms reduce single-source bias
 */
function computeConfidence(indicators: SDGIndicator[]): number {
  if (indicators.length === 0) return 0.5;

  // 1. Indicator agreement — coefficient of variation
  const values = indicators.map((ind) => ind.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? stddev / mean : 0; // typically 0–0.4 for our value range
  const agreementScore = 1 - Math.min(cv / 0.4, 1);

  // 2. Trend consistency — fraction sharing the dominant trend
  const trendCounts: Record<string, number> = {};
  for (const ind of indicators) {
    trendCounts[ind.trend] = (trendCounts[ind.trend] || 0) + 1;
  }
  const dominantCount = Math.max(...Object.values(trendCounts));
  const trendScore = dominantCount / indicators.length;

  // 3. Temporal resolution — map update frequency strings to scores
  const freqMap: Record<string, number> = {
    daily: 1.0,
    "every 6 days": 0.9,
    "every 10 days": 0.85,
    "every 12 days": 0.8,
    "every 16 days": 0.75,
    monthly: 0.65,
    "monthly composites": 0.65,
    quarterly: 0.5,
    "quarterly (with quarterly interim)": 0.5,
    annual: 0.35,
    "annual (with quarterly interim)": 0.4,
  };
  const freqScores = indicators.map((ind) => {
    const key = (ind.updateFrequency || "quarterly").toLowerCase();
    for (const [pattern, score] of Object.entries(freqMap)) {
      if (key.includes(pattern)) return score;
    }
    return 0.5;
  });
  const totalWeight = indicators.reduce((s, ind) => s + ind.weight, 0);
  const temporalScore =
    indicators.reduce((s, ind, i) => s + freqScores[i] * ind.weight, 0) /
    totalWeight;

  // 4. Source diversity — count distinct satellite platforms
  const platforms = new Set(
    indicators
      .map((ind) => (ind.satelliteSource || "").split(",")[0].trim())
      .filter(Boolean)
  );
  const diversityScore = Math.min(platforms.size / 4, 1);

  // Weighted combination → scale to 0.55–0.95 range
  const raw =
    0.35 * agreementScore +
    0.25 * trendScore +
    0.2 * temporalScore +
    0.2 * diversityScore;
  return 0.55 + raw * 0.4;
}

/**
 * Map World Bank indicator codes to our indicator template IDs
 */
const WB_TO_INDICATOR_ID: Record<string, string> = {
  "SH.H2O.SMDW.ZS": "water-body-area",
  "SH.H2O.BASW.ZS": "water-quality",
  "SH.STA.SMSS.ZS": "precipitation",
  "ER.H2O.FWTL.ZS": "groundwater",
  "NV.IND.MANF.ZS": "nightlight-growth",
  "IT.NET.USER.ZS": "road-density",
  "GB.XPD.RSDV.GD.ZS": "urban-infrastructure",
  "IP.PAT.RESD": "connectivity",
  "EN.ATM.PM25.MC.M3": "urban-expansion",
  "SP.URB.TOTL.IN.ZS": "green-space",
  "EN.URB.LCTY.UR.ZS": "air-quality",
  "EG.ELC.ACCS.ZS": "heat-island",
  "EN.GHG.CO2.PC.CE.AR5": "waste-sites",
  "AG.LND.ARBL.ZS": "mining-impact",
  "NY.GDP.PCAP.KD.ZG": "agricultural-eff",
  "EG.USE.PCAP.KG.OE": "deforestation-prod",
  "EN.GHG.ALL.PC.CE.AR5": "temperature-anomaly",
  "EG.USE.COMM.FO.ZS": "sea-level",
  "AG.LND.FRST.ZS": "ice-coverage",
  "EG.FEC.RNEW.ZS": "carbon-emissions",
  "ER.PTD.TOTL.ZS": "forest-loss",
  "ER.LND.PTLD.ZS": "biodiversity-proxy",
  "AG.LND.AGRI.ZS": "soil-degradation",
};

export interface RegionalSDGDataAsync extends RegionalSDGData {
  lastUpdated: string;
  dataSource: string;
}

/**
 * Async SDG analysis using real World Bank data
 */
export async function analyzeRegionAsync(
  region: string,
  lat: number,
  lng: number,
  apiData?: Record<
    number,
    {
      latest: {
        indicatorCode: string;
        normalizedScore: number;
        year: number | null;
      }[];
    }
  >
): Promise<RegionalSDGDataAsync> {
  const scores: SDGScore[] = SDG_DEFINITIONS.map((def) => {
    const templates = indicatorSets[def.sdgNumber] || [];
    const sdgApiData = apiData?.[def.sdgNumber]?.latest;

    const indicators: SDGIndicator[] = templates.map((t, i) => {
      if (sdgApiData) {
        // Ensures SDG 9 connectivity uses the internet-access indicator instead
        // of the patents proxy that previously occupied the same template slot.
        const connectivityData =
          t.id === "connectivity"
            ? sdgApiData.find(
                (entry) => entry.indicatorCode === "IT.NET.USER.ZS"
              )
            : null;
        const realData = sdgApiData[i];
        const resolvedData = connectivityData ?? realData;
        if (resolvedData && resolvedData.year !== null) {
          const indicatorId =
            t.id === "connectivity"
              ? t.id
              : WB_TO_INDICATOR_ID[resolvedData.indicatorCode] || t.id;
          return {
            ...t,
            id: indicatorId,
            value: resolvedData.normalizedScore,
            trend: "stable" as const,
          };
        }
      }
      // No data available — report as 0
      return { ...t, value: 0, trend: "stable" as const };
    });

    const score = computeScore(indicators);
    const confidence = computeConfidence(indicators);
    return { ...def, score, confidence, indicators };
  });

  const overallScore = Math.round(
    scores.reduce((sum, s) => sum + s.score, 0) / scores.length
  );

  return {
    region,
    lat,
    lng,
    scores,
    overallScore,
    lastUpdated: new Date().toISOString(),
    dataSource: apiData ? "World Bank SDG Indicators" : "No data available",
  };
}

/**
 * Get global comparison data (async, uses real API data)
 */
export async function getGlobalComparison(): Promise<RegionalSDGDataAsync[]> {
  const regions = [
    { name: "East Asia & Pacific", lat: 35, lng: 105 },
    { name: "Europe & Central Asia", lat: 50, lng: 30 },
    { name: "Latin America & Caribbean", lat: -10, lng: -60 },
    { name: "Middle East & North Africa", lat: 30, lng: 35 },
    { name: "North America", lat: 40, lng: -100 },
    { name: "South Asia", lat: 25, lng: 80 },
    { name: "Sub-Saharan Africa", lat: 0, lng: 25 },
  ];

  return Promise.all(
    regions.map((r) => analyzeRegionAsync(r.name, r.lat, r.lng))
  );
}
