import nlp from "compromise";

// Defines the curated keyword taxonomies used to derive tags for community posts.

export const SDG_KEYWORDS: Record<string, string[]> = {
  "SDG 6": [
    "water",
    "sanitation",
    "groundwater",
    "hydrology",
    "aquifer",
    "precipitation",
    "drought",
    "freshwater",
    "drinking water",
    "wastewater",
  ],
  "SDG 7": [
    "energy",
    "solar",
    "wind power",
    "renewable",
    "electricity",
    "photovoltaic",
    "geothermal",
    "hydropower",
    "nuclear",
  ],
  "SDG 9": [
    "infrastructure",
    "industry",
    "innovation",
    "connectivity",
    "broadband",
    "urbanization",
    "manufacturing",
  ],
  "SDG 11": [
    "city",
    "urban",
    "housing",
    "transport",
    "air quality",
    "green space",
    "heat island",
    "sustainable city",
    "slum",
    "public space",
  ],
  "SDG 12": [
    "waste",
    "mining",
    "consumption",
    "production",
    "recycling",
    "circular economy",
    "resource efficiency",
  ],
  "SDG 13": [
    "climate",
    "temperature",
    "sea level",
    "ice",
    "carbon",
    "emissions",
    "co2",
    "global warming",
    "greenhouse",
    "methane",
    "ozone",
  ],
  "SDG 14": [
    "ocean",
    "marine",
    "fishery",
    "coral",
    "coastal",
    "sea",
    "aquatic",
    "plastic pollution",
    "algal bloom",
    "mangrove",
  ],
  "SDG 15": [
    "forest",
    "vegetation",
    "biodiversity",
    "soil",
    "ecosystem",
    "land degradation",
    "species",
    "wildlife",
    "habitat",
    "deforestation",
    "reforestation",
  ],
};

export const DOMAIN_TAGS: Record<string, string[]> = {
  // Groups Earth-observation missions and sensor families so post text can map to recognizable remote-sensing tags.
  "Remote Sensing": [
    "remote sensing",
    "earth observation",
    "multispectral",
    "hyperspectral",
    "radiometer",
  ],
  Sentinel: [
    "sentinel-1",
    "sentinel-2",
    "sentinel-3",
    "sentinel-5p",
    "copernicus",
  ],
  Landsat: ["landsat"],
  MODIS: ["modis"],
  GRACE: ["grace", "grace-fo", "gravity recovery"],
  SAR: ["sar ", "insar", "synthetic aperture radar", "radar interferometry"],
  Lidar: ["lidar", "icesat", "calipso", "laser altimetry"],
  TROPOMI: ["tropomi"],
  VIIRS: ["viirs"],

  // Groups scientific subject areas so posts can surface the main discipline they discuss.
  "Climate Change": [
    "climate change",
    "global warming",
    "climate crisis",
    "paris agreement",
  ],
  Atmosphere: [
    "atmospheric",
    "aerosol",
    "ozone layer",
    "stratosphere",
    "troposphere",
    "air pollution",
  ],
  Cryosphere: [
    "ice sheet",
    "glacier",
    "permafrost",
    "sea ice",
    "arctic",
    "antarctic",
    "ice cap",
    "snowpack",
  ],
  Hydrology: [
    "groundwater",
    "aquifer",
    "watershed",
    "river basin",
    "precipitation",
    "rainfall",
    "water cycle",
  ],
  Oceanography: [
    "ocean current",
    "sea surface temperature",
    "thermohaline",
    "ocean color",
    "bathymetry",
    "tidal",
  ],
  Volcanology: [
    "volcano",
    "volcanic",
    "eruption",
    "lava",
    "magma",
    "caldera",
    "tephra",
  ],
  Seismology: ["earthquake", "seismic", "tectonic", "fault", "tsunami"],
  Wildfire: ["wildfire", "fire", "burned area", "fire detection", "combustion"],
  Agriculture: [
    "agriculture",
    "crop",
    "ndvi",
    "irrigation",
    "yield",
    "fertilizer",
    "precision farming",
  ],
  "Urban Monitoring": [
    "urban expansion",
    "city growth",
    "night light",
    "built-up",
    "impervious surface",
  ],

  // Groups spaceflight and technical concepts so engineering-heavy posts receive useful topic tags.
  "Space Debris": [
    "debris",
    "space junk",
    "kessler",
    "collision avoidance",
    "conjunction",
  ],
  "Orbital Mechanics": [
    "orbit",
    "orbital",
    "leo",
    "geo",
    "meo",
    "inclination",
    "eccentricity",
    "tle",
  ],
  Mars: ["mars", "martian", "perseverance", "curiosity", "ingenuity"],
  Moon: ["moon", "lunar", "artemis", "crater"],
  Spacecraft: ["spacecraft", "probe", "rover", "lander"],
  Constellation: [
    "constellation",
    "starlink",
    "mega-constellation",
    "smallsat",
    "cubesat",
  ],
  "Machine Learning": [
    "machine learning",
    "deep learning",
    "neural network",
    "classification",
    "convolutional",
    "random forest",
    "yolo",
    "u-net",
  ],
  GIS: [
    "gis",
    "geospatial",
    "geographic information",
    "mapping",
    "cartography",
  ],
};

// Lists generic terms that compromise.js often extracts but that make poor visible tags.
const STOPWORD_NOUNS = new Set([
  "way",
  "time",
  "year",
  "day",
  "thing",
  "fact",
  "part",
  "case",
  "point",
  "group",
  "number",
  "world",
  "area",
  "place",
  "work",
  "week",
  "end",
  "people",
  "state",
  "result",
  "use",
  "set",
  "change",
  "order",
  "home",
  "post",
  "data",
  "study",
  "image",
  "paper",
  "figure",
  "model",
  "system",
  "method",
  "approach",
  "table",
  "example",
  "level",
  "type",
  "form",
  "process",
  "analysis",
  "information",
  "research",
  "review",
  "report",
  "section",
  "value",
  "rate",
  "range",
  "term",
  "phase",
  "period",
  "effect",
  "source",
  "role",
  "base",
  "view",
  "field",
  "unit",
  "side",
  "line",
  "site",
  "team",
  "foot",
  "hand",
  "head",
  "body",
  "eye",
  "name",
  "description",
  "title",
  "content",
  "page",
  "link",
  // Removes short generic terms that add little value when shown as visible tags.
  "ones",
  "lot",
  "lots",
  "kind",
  "sort",
  "stuff",
  "thing",
]);

// Extracts a prioritized set of visible tags from post title and body text.

export function autoTagText(title: string, body: string): string[] {
  const combined = `${title} ${body}`;
  const text = combined.toLowerCase();
  const tags: string[] = [];
  const seen = new Set<string>();

  function add(raw: string) {
    // Removes punctuation artifacts that NLP extraction can leave around candidate phrases.
    let tag = raw
      // Strips punctuation from both ends so the phrase can be compared and displayed cleanly.
      .replace(
        /^[\s,.:;!?\-\u2013\u2014\u2015\u2026\u200B"']+|[\s,.:;!?\-\u2013\u2014\u2015\u2026\u200B"']+$/g,
        ""
      )
      .trim();

    // Removes trailing text after an unmatched opening bracket so broken fragments do not become tags.
    if (tag.includes("(") && !tag.includes(")")) {
      tag = tag.replace(/\s*\(.*$/, "");
    }
    if (tag.includes("[") && !tag.includes("]")) {
      tag = tag.replace(/\s*\[.*$/, "");
    }
    // Removes orphan closing brackets that remain after cleanup.
    if (!tag.includes("(") && tag.includes(")")) {
      tag = tag.replaceAll(")", "");
    }
    if (!tag.includes("[") && tag.includes("]")) {
      tag = tag.replaceAll("]", "");
    }
    // Removes unmatched quotation marks so the final tag text stays readable.
    for (const [open, close] of [
      ["'", "'"],
      ["\u2018", "\u2019"],
      ['"', '"'],
      ["\u201C", "\u201D"],
    ] as const) {
      const hasOpen = tag.includes(open);
      const hasClose =
        open === close ? tag.split(open).length - 1 >= 2 : tag.includes(close);
      if (hasOpen && !hasClose) tag = tag.replaceAll(open, "");
      if (!hasOpen && hasClose && open !== close)
        tag = tag.replaceAll(close, "");
    }

    tag = tag.trim();
    if (!tag || tag.length < 2) return;
    if (/^\d{1,2}:\d{2}(?::\d{2})?\s*(utc|gmt)?$/i.test(tag)) return;
    if (/^\d{1,2}\s*(am|pm)\s*(utc|gmt)?$/i.test(tag)) return;

    const key = tag.toLowerCase();
    if (!seen.has(key) && tags.length < 6) {
      seen.add(key);
      tags.push(tag);
    }
  }

  // Matches SDG concepts first because they are the most valuable visible tags for this product.
  for (const [sdg, keywords] of Object.entries(SDG_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      add(sdg);
    }
  }

  // Adds domain tags next and prefers the concepts backed by the most keyword evidence.
  const domainScores: { tag: string; score: number }[] = [];
  for (const [tag, keywords] of Object.entries(DOMAIN_TAGS)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > 0) domainScores.push({ tag, score });
  }
  domainScores.sort((a, b) => b.score - a.score);
  for (const { tag } of domainScores) {
    add(tag);
  }

  // Falls back to NLP-derived phrases only when taxonomy matching did not produce enough tags.
  if (tags.length < 4) {
    const doc = nlp(combined);

    // Prefers proper nouns and acronyms first because mission names and organizations make strong tags.
    const acronyms = combined.match(/\b[A-Z]{2,}(?:-\d+[A-Za-z]?)?\b/g) || [];
    const uniqueAcronyms = [...new Set(acronyms)].filter(
      (a) =>
        a.length >= 2 &&
        a.length <= 12 &&
        !["THE", "AND", "FOR", "WITH", "FROM", "NASA", "ESA", "NOAA"].includes(
          a
        )
    );
    for (const acr of uniqueAcronyms.slice(0, 2)) {
      add(acr);
    }

    // Extracts noun phrases next because multi-word concepts are usually more informative than isolated words.
    const nounPhrases = doc.nouns().out("array") as string[];
    const scored = nounPhrases
      .map((np: string) => {
        const clean = np
          .replace(/^(the|a|an|this|that|some|its|their)\s+/i, "")
          .replace(/[\s,.:;!?\-\u2013\u2014\u2015\u2026"']+$/, "")
          .trim();
        const words = clean.split(/\s+/);
        // Rewards longer and more specific phrases so generic fragments rank lower.
        const lengthScore = words.length >= 2 ? 3 : clean.length >= 6 ? 1 : 0;
        // Penalizes stopword-only or stopword-dominated phrases.
        const isStopword =
          words.length === 1 && STOPWORD_NOUNS.has(clean.toLowerCase());
        return { phrase: clean, score: isStopword ? -1 : lengthScore };
      })
      .filter((item) => item.score > 0 && item.phrase.length >= 3)
      .sort((a, b) => b.score - a.score);

    for (const { phrase } of scored.slice(0, 3)) {
      // Normalizes presentation casing before the tag is returned to the UI.
      const tag = phrase
        .split(/\s+/)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      add(tag);
    }
  }

  return tags;
}
