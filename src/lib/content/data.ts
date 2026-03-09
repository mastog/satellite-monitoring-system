export interface Article {
  id: string;
  title: string;
  abstract: string;
  tags: string[];
  source: string;
  date: string;
  readTime: string;
  category: "earth-science" | "sustainability" | "space-tech" | "climate";
  url: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  abstract: string;
  doi: string;
}

// Provides the mock article corpus used by dashboard and science-search views in development.
export const MOCK_ARTICLES: Article[] = [
  {
    id: "1",
    title: "How Satellites Monitor Deforestation in the Amazon Basin",
    abstract:
      "Using Sentinel-2 multispectral imagery and machine learning classifiers, researchers can detect forest loss at 10m resolution, enabling rapid response to illegal logging activities.",
    tags: ["SDG 15", "Deforestation", "Sentinel-2", "Machine Learning"],
    source: "Earth Observatory",
    date: "2026-02-10",
    readTime: "8 min",
    category: "earth-science",
    url: "https://earthobservatory.nasa.gov/features/Deforestation",
  },
  {
    id: "2",
    title: "Urban Heat Islands: Satellite Thermal Imaging for City Planning",
    abstract:
      "Landsat 8 TIRS data reveals temperature differentials of up to 12\u00B0C between urban cores and surrounding green areas, informing sustainable city development strategies.",
    tags: ["SDG 11", "Urban Planning", "Thermal Imaging", "Landsat"],
    source: "Sustainability Journal",
    date: "2026-02-08",
    readTime: "6 min",
    category: "sustainability",
    url: "https://www.nature.com/articles/s41893-021-00741-z",
  },
  {
    id: "3",
    title: "Space Debris: The Growing Threat to Earth Observation",
    abstract:
      "With over 34,000 tracked objects in orbit, the Kessler syndrome risk intensifies. New debris tracking radar systems and active removal missions aim to preserve critical orbital lanes.",
    tags: ["Space Debris", "Kessler Syndrome", "Orbital Safety"],
    source: "Space Review",
    date: "2026-02-05",
    readTime: "10 min",
    category: "space-tech",
    url: "https://www.esa.int/Space_Safety/Space_Debris",
  },
  {
    id: "4",
    title: "Measuring Global Water Quality from Space with GRACE-FO",
    abstract:
      "The GRACE Follow-On mission provides unprecedented data on groundwater depletion, aquifer recharge rates, and large-scale hydrological changes critical for SDG 6 monitoring.",
    tags: ["SDG 6", "Water Quality", "GRACE-FO", "Hydrology"],
    source: "Nature Geoscience",
    date: "2026-02-01",
    readTime: "12 min",
    category: "earth-science",
    url: "https://gracefo.jpl.nasa.gov/",
  },
  {
    id: "5",
    title: "CO\u2082 Monitoring: OCO-3 and the Future of Emissions Tracking",
    abstract:
      "The Orbiting Carbon Observatory-3 on the ISS provides high-resolution CO\u2082 measurements, enabling city-level emissions monitoring for climate policy enforcement.",
    tags: ["SDG 13", "CO\u2082", "OCO-3", "Climate Policy"],
    source: "Climate Science Weekly",
    date: "2026-01-28",
    readTime: "7 min",
    category: "climate",
    url: "https://oco.jpl.nasa.gov/",
  },
  {
    id: "6",
    title:
      "Coral Reef Bleaching Events Detected by Sentinel-2 Multispectral Analysis",
    abstract:
      "A new classification algorithm applied to Sentinel-2 10m imagery identifies coral bleaching across the Great Barrier Reef with 89% accuracy, enabling near-real-time ecological assessments.",
    tags: ["SDG 14", "Coral Reefs", "Sentinel-2", "Marine Ecology"],
    source: "Nature Ecology",
    date: "2026-02-12",
    readTime: "9 min",
    category: "earth-science",
    url: "https://www.nature.com/natecolevol/",
  },
  {
    id: "7",
    title: "Methane Super-Emitters Mapped from Orbit by TROPOMI",
    abstract:
      "The Sentinel-5P TROPOMI instrument has identified over 1,200 methane super-emitter sites globally, with oil and gas infrastructure responsible for 62% of total detected plumes.",
    tags: ["SDG 13", "Methane", "TROPOMI", "Emissions"],
    source: "Science Daily",
    date: "2026-02-09",
    readTime: "6 min",
    category: "climate",
    url: "https://www.sciencedaily.com/",
  },
  {
    id: "8",
    title:
      "Precision Agriculture: How Satellite NDVI Data Reduces Fertiliser Waste",
    abstract:
      "Farm-scale NDVI maps from Planet SuperDove constellation guide variable-rate fertiliser application, cutting nitrogen runoff by 35% while maintaining crop yields across EU trial sites.",
    tags: ["SDG 12", "Agriculture", "NDVI", "Planet"],
    source: "Agri-Tech Review",
    date: "2026-02-06",
    readTime: "7 min",
    category: "sustainability",
    url: "https://www.planet.com/pulse/",
  },
  {
    id: "9",
    title: "Antarctic Ice Sheet Mass Loss Accelerates: GRACE-FO 2025 Report",
    abstract:
      "GRACE-FO gravity measurements show Antarctic ice mass loss reached 150 Gt/year in 2025, a 23% increase over the 2012-2017 baseline, contributing 0.42mm/yr to sea level rise.",
    tags: ["SDG 13", "Ice Sheets", "GRACE-FO", "Sea Level"],
    source: "Cryosphere Journal",
    date: "2026-01-30",
    readTime: "11 min",
    category: "climate",
    url: "https://tc.copernicus.org/",
  },
  {
    id: "10",
    title: "Wildfire Progression Tracking with VIIRS Active Fire Data",
    abstract:
      "NOAA-20 VIIRS 375m active fire detections now enable 12-hour fire spread predictions, tested during the 2025 California and Australian wildfire seasons with 78% spatial accuracy.",
    tags: ["SDG 15", "Wildfires", "VIIRS", "NOAA"],
    source: "Fire Science Review",
    date: "2026-01-25",
    readTime: "8 min",
    category: "earth-science",
    url: "https://firms.modaps.eosdis.nasa.gov/",
  },
  {
    id: "11",
    title: "Starlink Mega-Constellation Impact on Astronomical Observations",
    abstract:
      "A comprehensive study of 5,400+ Starlink satellites reveals that reflected sunlight contamination affects 8% of twilight telescope observations, prompting revised ITU coordination standards.",
    tags: ["Mega-Constellation", "Light Pollution", "Starlink", "Astronomy"],
    source: "Space Policy Review",
    date: "2026-02-14",
    readTime: "9 min",
    category: "space-tech",
    url: "https://www.iau.org/",
  },
  {
    id: "12",
    title:
      "Sustainable Cities: Using SAR Interferometry to Monitor Building Subsidence",
    abstract:
      "Sentinel-1 InSAR time series analysis detects millimetre-scale ground subsidence in Jakarta, Mexico City, and Venice, informing urban planning decisions and infrastructure investment.",
    tags: ["SDG 11", "InSAR", "Subsidence", "Urban Monitoring"],
    source: "GeoScience Review",
    date: "2026-02-03",
    readTime: "10 min",
    category: "sustainability",
    url: "https://sentinel.esa.int/web/sentinel/missions/sentinel-1",
  },
  {
    id: "13",
    title: "Mapping Global Plastic Pollution in Oceans from Satellite Imagery",
    abstract:
      "Combining Sentinel-2 spectral signatures with deep learning models, researchers detect floating plastic debris patches as small as 5m\u00B2 across Mediterranean and Pacific test sites.",
    tags: ["SDG 14", "Plastic Pollution", "Deep Learning", "Oceans"],
    source: "Marine Pollution Bulletin",
    date: "2026-01-22",
    readTime: "8 min",
    category: "earth-science",
    url: "https://www.sciencedirect.com/journal/marine-pollution-bulletin",
  },
  {
    id: "14",
    title: "Solar Radiation Budget Monitoring with CERES and EarthCARE",
    abstract:
      "The new ESA EarthCARE mission complements NASA CERES instruments to provide the most detailed cloud-aerosol-radiation budget to date, refining climate model projections by 15%.",
    tags: ["SDG 13", "Radiation Budget", "EarthCARE", "CERES"],
    source: "Atmospheric Science Letters",
    date: "2026-02-11",
    readTime: "11 min",
    category: "climate",
    url: "https://www.esa.int/Applications/Observing_the_Earth/FutureEO/EarthCARE",
  },
  {
    id: "15",
    title:
      "On-Orbit Servicing: Extending the Life of Aging Earth Observation Satellites",
    abstract:
      "Northrop Grumman's MEV-3 mission successfully docked with Intelsat-901, demonstrating satellite life extension by 5+ years and opening possibilities for refuelling EO assets in LEO.",
    tags: ["On-Orbit Servicing", "Satellite Life Extension", "MEV"],
    source: "SpaceNews",
    date: "2026-01-18",
    readTime: "7 min",
    category: "space-tech",
    url: "https://spacenews.com/",
  },
  {
    id: "16",
    title: "Flood Extent Mapping in Near-Real-Time Using Sentinel-1 SAR",
    abstract:
      "An automated pipeline processes Sentinel-1 GRD imagery within 3 hours of acquisition, producing flood extent maps that supported disaster response in Bangladesh and Pakistan in 2025.",
    tags: ["SDG 11", "Flood Mapping", "SAR", "Disaster Response"],
    source: "Natural Hazards Journal",
    date: "2026-02-15",
    readTime: "9 min",
    category: "earth-science",
    url: "https://emergency.copernicus.eu/",
  },
  {
    id: "17",
    title: "Quantum Key Distribution via Satellite: Micius Mission Update",
    abstract:
      "China's Micius satellite achieves 1,200km quantum key distribution with a secure key rate of 47.8 kbps, paving the way for a global quantum-encrypted communication network.",
    tags: ["Quantum Communication", "Micius", "Encryption"],
    source: "Nature Physics",
    date: "2026-01-15",
    readTime: "10 min",
    category: "space-tech",
    url: "https://www.nature.com/nphys/",
  },
  {
    id: "18",
    title:
      "Renewable Energy Site Selection Optimised by Solar Irradiance Satellite Data",
    abstract:
      "CMSAF satellite-derived surface solar irradiance datasets enable optimal photovoltaic farm placement in sub-Saharan Africa, increasing projected energy yield by 18% compared to ground-only models.",
    tags: ["SDG 7", "Solar Energy", "Renewable", "Africa"],
    source: "Energy Policy",
    date: "2026-02-07",
    readTime: "8 min",
    category: "sustainability",
    url: "https://www.sciencedirect.com/journal/energy-policy",
  },
  {
    id: "19",
    title: "Tracking Illegal Fishing from Space with AIS and Radar Fusion",
    abstract:
      "Combining automatic identification system (AIS) gaps with Sentinel-1 SAR vessel detections reveals dark fishing fleet activity in protected marine areas, supporting SDG 14 enforcement.",
    tags: ["SDG 14", "Illegal Fishing", "AIS", "Radar"],
    source: "Global Fishing Watch",
    date: "2026-01-20",
    readTime: "7 min",
    category: "sustainability",
    url: "https://globalfishingwatch.org/",
  },
  {
    id: "20",
    title: "Ozone Layer Recovery: 40 Years of Satellite Monitoring Success",
    abstract:
      "Four decades of continuous satellite ozone observations from TOMS, OMI, and TROPOMI confirm the Antarctic ozone hole has shrunk by 25% since 2000, validating the Montreal Protocol's effectiveness.",
    tags: ["SDG 13", "Ozone", "TROPOMI", "Montreal Protocol"],
    source: "WMO Bulletin",
    date: "2026-02-13",
    readTime: "6 min",
    category: "climate",
    url: "https://public.wmo.int/",
  },
];

export const MOCK_PAPERS: Paper[] = [
  {
    id: "p1",
    title: "Multi-temporal Sentinel-2 Data for SDG 15 Indicator Assessment",
    authors: "Zhang, L., Chen, Y., et al.",
    journal: "Remote Sensing of Environment",
    year: 2026,
    abstract:
      "This study develops a framework for computing SDG 15.1.1 and 15.3.1 indicators using multi-temporal Sentinel-2 imagery with 92% accuracy.",
    doi: "10.1016/j.rse.2026.01.004",
  },
  {
    id: "p2",
    title: "Deep Learning for Space Debris Detection in Radar Data",
    authors: "Smith, J., Patel, R., et al.",
    journal: "Acta Astronautica",
    year: 2026,
    abstract:
      "A novel YOLOv8-based approach achieves 97.3% detection rate for debris objects >1cm in ground-based radar observations.",
    doi: "10.1016/j.actaastro.2026.02.011",
  },
  {
    id: "p3",
    title: "Global Urban Expansion Mapping Using VIIRS Nighttime Light Data",
    authors: "Kim, H., Wang, X., et al.",
    journal: "ISPRS Journal",
    year: 2025,
    abstract:
      "Combining VIIRS DNB with Landsat time series achieves unprecedented accuracy in mapping global urban expansion rates from 2015-2025.",
    doi: "10.1016/j.isprsjprs.2025.12.003",
  },
  {
    id: "p4",
    title:
      "Satellite-Based Estimation of Global Crop Water Productivity under Climate Change",
    authors: "Martinez, A., Osei, K., Li, W.",
    journal: "Agricultural Water Management",
    year: 2026,
    abstract:
      "Integrating MODIS ET products with Sentinel-2 crop maps quantifies water use efficiency trends across 48 countries, showing a 12% average decline since 2018.",
    doi: "10.1016/j.agwat.2026.01.019",
  },
  {
    id: "p5",
    title:
      "Autonomous Collision Avoidance for LEO Constellations Using Reinforcement Learning",
    authors: "Nakamura, T., Brown, C., et al.",
    journal: "Journal of Spacecraft and Rockets",
    year: 2026,
    abstract:
      "A multi-agent RL framework reduces conjunction event response time from hours to seconds while maintaining a false-positive rate below 0.3%.",
    doi: "10.2514/1.A36201",
  },
  {
    id: "p6",
    title:
      "InSAR Time Series Analysis for Infrastructure Health Monitoring: A Global Review",
    authors: "Ferretti, A., Perissin, D., Rosen, P.",
    journal: "IEEE Transactions on Geoscience and Remote Sensing",
    year: 2025,
    abstract:
      "A systematic review of 312 studies shows persistent scatterer InSAR achieves sub-millimetre accuracy for bridge, dam, and building deformation monitoring across diverse environments.",
    doi: "10.1109/TGRS.2025.3412891",
  },
  {
    id: "p7",
    title:
      "Ocean Colour Remote Sensing for Harmful Algal Bloom Early Warning Systems",
    authors: "Garcia, M., Johannessen, O., Sathyendranath, S.",
    journal: "Remote Sensing of Environment",
    year: 2026,
    abstract:
      "A Sentinel-3 OLCI-based pipeline provides 48-hour advance HAB warnings across 23 coastal zones, reducing economic losses to aquaculture by an estimated $180M annually.",
    doi: "10.1016/j.rse.2026.02.008",
  },
  {
    id: "p8",
    title: "The Carbon Budget of Tropical Peatlands from PALSAR-2 and ICESat-2",
    authors: "Hooijer, A., Miettinen, J., Page, S.",
    journal: "Nature Climate Change",
    year: 2026,
    abstract:
      "Combining L-band SAR wetness maps with lidar-derived canopy heights reveals that SE Asian peatland degradation emits 1.8 Gt CO\u2082e/yr, 40% higher than previous ground-based estimates.",
    doi: "10.1038/s41558-026-01723-4",
  },
  {
    id: "p9",
    title:
      "Machine Learning Classification of Satellite Imagery for SDG 11.7.1 Public Space Assessment",
    authors: "Patel, N., Liu, X., Adegoke, J.",
    journal: "Computers, Environment and Urban Systems",
    year: 2025,
    abstract:
      "A U-Net segmentation model trained on VHR imagery from 50 cities classifies public open spaces with 94% IoU, enabling scalable SDG 11.7.1 indicator computation.",
    doi: "10.1016/j.compenvurbsys.2025.102087",
  },
  {
    id: "p10",
    title:
      "Gravitational Wave Detection Concepts Using Satellite Laser Interferometry",
    authors: "Danzmann, K., LISA Consortium",
    journal: "Physical Review Letters",
    year: 2026,
    abstract:
      "LISA Pathfinder follow-up results demonstrate picometer-level displacement sensitivity, confirming technological readiness for the full LISA space gravitational wave observatory.",
    doi: "10.1103/PhysRevLett.136.041101",
  },
  {
    id: "p11",
    title:
      "Global Shipping Emissions Monitoring from Space: A Multi-Sensor Approach",
    authors: "Johansson, L., Jalkanen, J-P., Kukkonen, J.",
    journal: "Atmospheric Chemistry and Physics",
    year: 2026,
    abstract:
      "Fusing TROPOMI NO\u2082 columns with AIS vessel tracks provides bottom-up emissions estimates for 85,000 ships, revealing a 7% non-compliance rate with IMO 2020 sulphur regulations.",
    doi: "10.5194/acp-2026-0142",
  },
  {
    id: "p12",
    title:
      "High-Resolution Bathymetry from Satellite-Derived Coastal Water Transparency",
    authors: "Caballero, I., Stumpf, R., Mouw, C.",
    journal: "Estuarine, Coastal and Shelf Science",
    year: 2025,
    abstract:
      "Physics-based inversion of Sentinel-2 coastal reflectance retrieves bathymetry to 25m depth with RMSE < 0.8m, providing affordable mapping for 71 Small Island Developing States.",
    doi: "10.1016/j.ecss.2025.108621",
  },
];
