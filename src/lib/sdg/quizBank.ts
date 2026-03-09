// Stores the SDG quiz question bank covering SDGs 6, 9, 11, 12, 13, and 15 across targets, sensors, methods, and real-world facts.

export interface QuizQuestion {
  id: string;
  sdgNumber: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

// Stores the questions used when the quiz draws from the SDG 6 water and sanitation topic set.
const sdg6Questions: QuizQuestion[] = [
  {
    id: "sdg6-q1",
    sdgNumber: 6,
    question: "What is the full title of SDG 6?",
    options: [
      "Clean Water and Sanitation",
      "Life Below Water",
      "Affordable and Clean Energy",
      "Good Health and Well-Being",
    ],
    correctIndex: 0,
    explanation:
      "SDG 6 is officially titled 'Ensure availability and sustainable management of water and sanitation for all,' commonly shortened to Clean Water and Sanitation.",
  },
  {
    id: "sdg6-q2",
    sdgNumber: 6,
    question:
      "Which satellite index is primarily used to detect surface water bodies from Sentinel-2 imagery?",
    options: [
      "NDVI (Normalized Difference Vegetation Index)",
      "NDWI (Normalized Difference Water Index)",
      "EVI (Enhanced Vegetation Index)",
      "SAVI (Soil-Adjusted Vegetation Index)",
    ],
    correctIndex: 1,
    explanation:
      "NDWI uses the green and near-infrared (NIR) bands to highlight open water features while suppressing vegetation and soil noise. It was proposed by McFeeters in 1996.",
  },
  {
    id: "sdg6-q3",
    sdgNumber: 6,
    question:
      "Which NASA/DLR gravity mission measures changes in terrestrial water storage, including groundwater?",
    options: [
      "GRACE-FO (Gravity Recovery and Climate Experiment Follow-On)",
      "Jason-3",
      "CryoSat-2",
      "Aqua",
    ],
    correctIndex: 0,
    explanation:
      "GRACE-FO, launched in 2018 as a successor to GRACE, measures minute variations in Earth's gravity field caused by redistribution of mass, including groundwater depletion and recharge.",
  },
  {
    id: "sdg6-q4",
    sdgNumber: 6,
    question:
      "The GPM IMERG product provides global precipitation estimates. What does GPM stand for?",
    options: [
      "Global Precipitation Mission",
      "Global Precipitation Measurement",
      "Geostationary Precipitation Monitor",
      "Gravity-based Precipitation Model",
    ],
    correctIndex: 1,
    explanation:
      "GPM stands for Global Precipitation Measurement. It is an international satellite mission co-led by NASA and JAXA that provides next-generation global observations of rain and snow.",
  },
  {
    id: "sdg6-q5",
    sdgNumber: 6,
    question:
      "According to the UN, approximately how many people worldwide lacked safely managed drinking water services as of 2022?",
    options: [
      "About 500 million",
      "About 1.2 billion",
      "About 2.2 billion",
      "About 4 billion",
    ],
    correctIndex: 2,
    explanation:
      "As of 2022, roughly 2.2 billion people lacked safely managed drinking water services, meaning water that is accessible on premises, available when needed, and free from contamination.",
  },
  {
    id: "sdg6-q6",
    sdgNumber: 6,
    question: "What spectral bands does the McFeeters NDWI formula use?",
    options: [
      "Red and Near-Infrared",
      "Green and Near-Infrared",
      "Blue and Short-Wave Infrared",
      "Red Edge and Thermal Infrared",
    ],
    correctIndex: 1,
    explanation:
      "The McFeeters NDWI is calculated as (Green - NIR) / (Green + NIR). Water absorbs strongly in NIR while reflecting in the green band, producing positive NDWI values for water.",
  },
  {
    id: "sdg6-q7",
    sdgNumber: 6,
    question:
      "SDG Target 6.3 calls for improving water quality by reducing what?",
    options: [
      "Water prices globally",
      "Pollution, eliminating dumping, and minimizing release of hazardous chemicals",
      "The number of dams and reservoirs",
      "International water trade agreements",
    ],
    correctIndex: 1,
    explanation:
      "Target 6.3 aims to improve water quality by reducing pollution, eliminating dumping, minimizing release of hazardous chemicals and materials, halving untreated wastewater, and substantially increasing recycling and safe reuse globally.",
  },
  {
    id: "sdg6-q8",
    sdgNumber: 6,
    question:
      "Which Landsat 8 sensor is most useful for assessing inland water quality parameters like chlorophyll-a and turbidity?",
    options: [
      "Thermal Infrared Sensor (TIRS)",
      "Operational Land Imager (OLI)",
      "Panchromatic band only",
      "Cirrus detection band only",
    ],
    correctIndex: 1,
    explanation:
      "The OLI sensor on Landsat 8 provides multispectral bands (coastal aerosol, blue, green, red, NIR, SWIR) at 30 m resolution that are widely used for retrieval of chlorophyll-a, turbidity, colored dissolved organic matter, and other water quality indicators.",
  },
  {
    id: "sdg6-q9",
    sdgNumber: 6,
    question:
      "GRACE-FO consists of how many identical satellites flying in formation?",
    options: ["One", "Two", "Three", "Five"],
    correctIndex: 1,
    explanation:
      "GRACE-FO uses two identical satellites flying about 220 km apart in the same orbit. By precisely measuring the distance between them using microwave ranging (and a laser ranging interferometer), scientists detect gravity anomalies caused by mass redistribution on Earth.",
  },
  {
    id: "sdg6-q10",
    sdgNumber: 6,
    question:
      "What does the Modified NDWI (MNDWI) replace compared to the original NDWI?",
    options: [
      "It replaces the green band with the red band",
      "It replaces the NIR band with a short-wave infrared (SWIR) band",
      "It replaces the green band with the blue band",
      "It adds a thermal infrared component",
    ],
    correctIndex: 1,
    explanation:
      "The MNDWI, proposed by Xu (2006), substitutes the SWIR band for the NIR band: (Green - SWIR) / (Green + SWIR). This enhances open water detection in urban areas by suppressing built-up land noise that can confuse the original NDWI.",
  },
  {
    id: "sdg6-q11",
    sdgNumber: 6,
    question:
      "SDG Target 6.6 calls for the protection and restoration of which ecosystems?",
    options: [
      "Coral reefs and mangroves",
      "Water-related ecosystems including mountains, forests, wetlands, rivers, aquifers, and lakes",
      "Urban parks and greenways",
      "Agricultural irrigation systems",
    ],
    correctIndex: 1,
    explanation:
      "Target 6.6 specifically aims to protect and restore water-related ecosystems, including mountains, forests, wetlands, rivers, aquifers, and lakes by 2030.",
  },
  {
    id: "sdg6-q12",
    sdgNumber: 6,
    question:
      "GPM IMERG integrates data from multiple satellite sensors. What does IMERG stand for?",
    options: [
      "Integrated Multi-sensor Estimation of Rainfall Globally",
      "Integrated Multi-satellitE Retrievals for GPM",
      "International Measurement of Environmental Rain Gauges",
      "Infrared Microwave Estimation of Regional Gradients",
    ],
    correctIndex: 1,
    explanation:
      "IMERG stands for Integrated Multi-satellitE Retrievals for GPM. It combines data from the GPM constellation of satellites with gauge analyses to produce half-hourly precipitation estimates at 0.1-degree resolution globally.",
  },
  {
    id: "sdg6-q13",
    sdgNumber: 6,
    question:
      "Which region of the world faces the most severe groundwater depletion, detectable by GRACE/GRACE-FO data?",
    options: [
      "Northern Europe",
      "Northern India and the Middle East",
      "Southeast Australia",
      "Eastern Canada",
    ],
    correctIndex: 1,
    explanation:
      "GRACE data revealed alarming groundwater depletion rates in northern India (particularly the Punjab and Rajasthan regions) and the Middle East (including the Tigris-Euphrates basin), driven by intensive irrigation and arid climate conditions.",
  },
  {
    id: "sdg6-q14",
    sdgNumber: 6,
    question:
      "Sentinel-2 has a revisit time at the equator of approximately how many days (with both satellites)?",
    options: ["1 day", "5 days", "16 days", "26 days"],
    correctIndex: 1,
    explanation:
      "With both Sentinel-2A and Sentinel-2B operational, the combined revisit time at the equator is 5 days. At higher latitudes, overlapping orbits result in even more frequent coverage (2-3 days).",
  },
  {
    id: "sdg6-q15",
    sdgNumber: 6,
    question:
      "What percentage of Earth's freshwater is stored as groundwater (approximate)?",
    options: ["Less than 1%", "About 10%", "About 30%", "About 70%"],
    correctIndex: 2,
    explanation:
      "Approximately 30% of the world's freshwater is stored as groundwater. The vast majority (~69%) is locked in glaciers and ice caps, while surface water in lakes and rivers accounts for only about 1%.",
  },
  {
    id: "sdg6-q16",
    sdgNumber: 6,
    question:
      "Which SDG is most directly cross-linked with SDG 6 through the water-food nexus?",
    options: [
      "SDG 2 (Zero Hunger)",
      "SDG 4 (Quality Education)",
      "SDG 10 (Reduced Inequalities)",
      "SDG 16 (Peace, Justice, and Strong Institutions)",
    ],
    correctIndex: 0,
    explanation:
      "SDG 2 (Zero Hunger) is directly linked to SDG 6 through the water-food nexus. Agriculture accounts for roughly 70% of global freshwater withdrawals, making water availability critical for food security.",
  },
  {
    id: "sdg6-q17",
    sdgNumber: 6,
    question:
      "What spatial resolution do Sentinel-2's visible and NIR bands (used for NDWI) provide?",
    options: ["1 m", "10 m", "30 m", "250 m"],
    correctIndex: 1,
    explanation:
      "Sentinel-2's bands 2 (Blue), 3 (Green), 4 (Red), and 8 (NIR) all have 10 m spatial resolution, making them suitable for detailed surface water mapping using NDWI.",
  },
  {
    id: "sdg6-q18",
    sdgNumber: 6,
    question:
      "SDG Indicator 6.4.2 measures the 'level of water stress.' How is it defined?",
    options: [
      "Total rainfall minus evapotranspiration",
      "Freshwater withdrawal as a proportion of available freshwater resources",
      "Number of water treatment plants per capita",
      "Percentage of population connected to piped water",
    ],
    correctIndex: 1,
    explanation:
      "SDG Indicator 6.4.2 defines water stress as total freshwater withdrawn by all major sectors divided by total renewable freshwater resources (minus environmental flow requirements), expressed as a percentage.",
  },
  {
    id: "sdg6-q19",
    sdgNumber: 6,
    question:
      "What is the primary advantage of Synthetic Aperture Radar (SAR) for water body detection compared to optical imagery?",
    options: [
      "Higher spectral resolution",
      "Ability to image through clouds and at night",
      "Better color rendering of water",
      "Higher temporal resolution from geostationary orbit",
    ],
    correctIndex: 1,
    explanation:
      "SAR operates in the microwave spectrum, allowing it to penetrate clouds and operate independently of sunlight. This is critical for monitoring water bodies in persistently cloudy tropical regions where optical sensors like Sentinel-2 are frequently obscured.",
  },
  {
    id: "sdg6-q20",
    sdgNumber: 6,
    question:
      "The JRC Global Surface Water dataset, used for SDG 6 tracking, is based primarily on imagery from which satellite series?",
    options: [
      "MODIS (Terra and Aqua)",
      "Landsat (4, 5, 7, and 8)",
      "Sentinel-1 (A and B)",
      "SPOT (1 through 7)",
    ],
    correctIndex: 1,
    explanation:
      "The European Commission's Joint Research Centre (JRC) Global Surface Water dataset is derived from over 4.4 million Landsat scenes spanning 1984-present, providing the longest continuous record of surface water dynamics at 30 m resolution.",
  },
  {
    id: "sdg6-q21",
    sdgNumber: 6,
    question:
      "SDG Target 6.b supports strengthening the participation of which groups in water and sanitation management?",
    options: [
      "Multinational corporations",
      "Military organizations",
      "Local communities",
      "Satellite data providers",
    ],
    correctIndex: 2,
    explanation:
      "Target 6.b calls for supporting and strengthening the participation of local communities in improving water and sanitation management, recognizing the importance of community-driven governance for sustainable outcomes.",
  },
  {
    id: "sdg6-q22",
    sdgNumber: 6,
    question:
      "Chlorophyll-a concentration in water bodies, measurable by Landsat 8, is an indicator of what?",
    options: [
      "Salinity level",
      "Eutrophication and algal biomass",
      "Water temperature",
      "Dissolved oxygen",
    ],
    correctIndex: 1,
    explanation:
      "Chlorophyll-a is the primary photosynthetic pigment in algae. Elevated concentrations indicate eutrophication (nutrient enrichment), which can lead to harmful algal blooms, oxygen depletion, and degraded water quality.",
  },
];

// Stores the questions used when the quiz draws from the SDG 9 industry, innovation, and infrastructure topic set.
const sdg9Questions: QuizQuestion[] = [
  {
    id: "sdg9-q1",
    sdgNumber: 9,
    question: "What is the full title of SDG 9?",
    options: [
      "Industry, Innovation, and Infrastructure",
      "Decent Work and Economic Growth",
      "Affordable and Clean Energy",
      "Partnerships for the Goals",
    ],
    correctIndex: 0,
    explanation:
      "SDG 9 is officially titled 'Build resilient infrastructure, promote inclusive and sustainable industrialization, and foster innovation,' commonly shortened to Industry, Innovation, and Infrastructure.",
  },
  {
    id: "sdg9-q2",
    sdgNumber: 9,
    question:
      "Which satellite product is widely used to measure nighttime lights as a proxy for economic activity and electrification?",
    options: [
      "Sentinel-2 MSI",
      "Landsat 8 OLI",
      "VIIRS Day/Night Band (DNB)",
      "MODIS Land Surface Temperature",
    ],
    correctIndex: 2,
    explanation:
      "The VIIRS (Visible Infrared Imaging Radiometer Suite) Day/Night Band on the Suomi NPP and NOAA-20 satellites detects low-level visible light emissions at night, making it the standard for mapping electrification, economic activity, and urbanization globally.",
  },
  {
    id: "sdg9-q3",
    sdgNumber: 9,
    question:
      "What type of radar imaging does Sentinel-1 use, which is especially valuable for infrastructure mapping?",
    options: [
      "Doppler weather radar",
      "Synthetic Aperture Radar (SAR)",
      "Ground-penetrating radar",
      "Phased-array radar",
    ],
    correctIndex: 1,
    explanation:
      "Sentinel-1 carries a C-band Synthetic Aperture Radar instrument that provides all-weather, day-and-night imaging. SAR backscatter signatures are particularly useful for detecting roads, buildings, and other infrastructure due to their distinct scattering characteristics.",
  },
  {
    id: "sdg9-q4",
    sdgNumber: 9,
    question:
      "SDG Target 9.1 calls for the development of what kind of infrastructure?",
    options: [
      "Military and defense infrastructure",
      "Quality, reliable, sustainable, and resilient infrastructure",
      "Luxury tourism infrastructure",
      "Space launch infrastructure",
    ],
    correctIndex: 1,
    explanation:
      "Target 9.1 aims to develop quality, reliable, sustainable, and resilient infrastructure, including regional and transborder infrastructure, to support economic development and human well-being with a focus on affordable and equitable access for all.",
  },
  {
    id: "sdg9-q5",
    sdgNumber: 9,
    question:
      "The VIIRS DNB sensor can detect nighttime radiance as low as approximately what level?",
    options: [
      "0.1 W/m\u00B2",
      "2 nW/cm\u00B2/sr (nanowatts per square centimeter per steradian)",
      "50 lux",
      "1 milliwatt",
    ],
    correctIndex: 1,
    explanation:
      "The VIIRS DNB has a minimum detectable radiance of approximately 2 nW/cm\u00B2/sr, about 100 times more sensitive than the heritage DMSP-OLS sensor. This sensitivity allows detection of small settlements and dim lighting.",
  },
  {
    id: "sdg9-q6",
    sdgNumber: 9,
    question:
      "Road network density derived from SAR imagery is typically measured in what units?",
    options: [
      "Roads per building",
      "km of road per km\u00B2 of land area",
      "Number of lanes per highway",
      "Traffic volume per hour",
    ],
    correctIndex: 1,
    explanation:
      "Road density is commonly expressed as kilometers of road per square kilometer of land area (km/km\u00B2). SAR imagery helps detect roads through characteristic linear backscatter features, especially in areas where optical imagery is limited by clouds.",
  },
  {
    id: "sdg9-q7",
    sdgNumber: 9,
    question:
      "SDG Target 9.c aims to significantly increase access to what technology in least developed countries?",
    options: [
      "Nuclear energy",
      "Information and communications technology (ICT) and the internet",
      "Autonomous vehicles",
      "Satellite manufacturing",
    ],
    correctIndex: 1,
    explanation:
      "Target 9.c aims to significantly increase access to information and communications technology and strive to provide universal and affordable access to the internet in least developed countries by 2030.",
  },
  {
    id: "sdg9-q8",
    sdgNumber: 9,
    question:
      "Which of the following is a key advantage of SAR over optical sensors for infrastructure monitoring?",
    options: [
      "Higher spectral resolution for material identification",
      "Cloud-penetrating capability and independence from solar illumination",
      "Better color accuracy for visual interpretation",
      "Higher spatial resolution in all cases",
    ],
    correctIndex: 1,
    explanation:
      "SAR uses microwave energy that penetrates clouds, rain, and smoke, and does not require sunlight. This makes it invaluable for infrastructure monitoring in tropical regions or for rapid damage assessment after disasters regardless of weather or time of day.",
  },
  {
    id: "sdg9-q9",
    sdgNumber: 9,
    question:
      "Annual composite nighttime light data can serve as a proxy for which SDG 9 indicator?",
    options: [
      "Research and development expenditure",
      "Proportion of population with access to electricity",
      "Patent applications per capita",
      "Number of researchers per million people",
    ],
    correctIndex: 1,
    explanation:
      "Nighttime light intensity and extent strongly correlate with electrification rates. Areas with stable nighttime light presence are used as a proxy for access to electricity, particularly useful in regions with limited ground-based survey data.",
  },
  {
    id: "sdg9-q10",
    sdgNumber: 9,
    question: "Sentinel-1 operates in which radar frequency band?",
    options: [
      "X-band (8-12 GHz)",
      "L-band (1-2 GHz)",
      "C-band (4-8 GHz)",
      "P-band (0.2-1 GHz)",
    ],
    correctIndex: 2,
    explanation:
      "Sentinel-1 operates in C-band (center frequency ~5.405 GHz). C-band offers a good balance between penetration capability and spatial resolution, making it effective for infrastructure, agriculture, and maritime monitoring.",
  },
  {
    id: "sdg9-q11",
    sdgNumber: 9,
    question:
      "SDG Target 9.2 calls for promoting inclusive and sustainable industrialization. By 2030, it aims to significantly raise industry's share of employment and GDP, especially in which countries?",
    options: [
      "G7 countries",
      "Least developed countries (LDCs)",
      "Oil-exporting nations",
      "European Union member states",
    ],
    correctIndex: 1,
    explanation:
      "Target 9.2 specifically highlights least developed countries, aiming to double industry's share of GDP in LDCs by 2030 as a path to economic diversification and development.",
  },
  {
    id: "sdg9-q12",
    sdgNumber: 9,
    question:
      "Interferometric SAR (InSAR) from Sentinel-1 can detect ground surface deformation with what level of precision?",
    options: [
      "About 10 meters",
      "About 1 meter",
      "Millimeter to centimeter scale",
      "About 100 meters",
    ],
    correctIndex: 2,
    explanation:
      "InSAR measures the phase difference between two SAR acquisitions to detect surface displacement at millimeter to centimeter precision. This is used for monitoring infrastructure stability, land subsidence near buildings, and post-earthquake damage.",
  },
  {
    id: "sdg9-q13",
    sdgNumber: 9,
    question:
      "What is the approximate spatial resolution of the VIIRS DNB nighttime lights product?",
    options: ["10 m", "30 m", "375 m", "750 m"],
    correctIndex: 3,
    explanation:
      "The VIIRS DNB has a spatial resolution of approximately 750 meters across its entire swath. While coarser than Sentinel-2, this resolution is a significant improvement over the legacy DMSP-OLS (2.7 km) and is sufficient for sub-urban analysis.",
  },
  {
    id: "sdg9-q14",
    sdgNumber: 9,
    question:
      "SDG Target 9.5 encourages nations to enhance scientific research and increase the number of what per million people?",
    options: [
      "Hospitals",
      "Research and development workers",
      "Satellite ground stations",
      "Manufacturing plants",
    ],
    correctIndex: 1,
    explanation:
      "Target 9.5 calls for enhancing scientific research, upgrading the technological capabilities of industrial sectors, and encouraging innovation, including substantially increasing the number of R&D workers per million people.",
  },
  {
    id: "sdg9-q15",
    sdgNumber: 9,
    question:
      "Change detection analysis of nighttime lights can reveal which of the following phenomena?",
    options: [
      "Migration of fish stocks",
      "Economic growth or decline, conflict zones, and disaster impacts",
      "Changes in ocean currents",
      "Volcanic eruptions beneath the ocean",
    ],
    correctIndex: 1,
    explanation:
      "Temporal analysis of nighttime lights can reveal economic trends (increasing lights = growth), conflict impacts (decreasing lights in war-affected areas like Syria and Yemen), and disaster damage (sudden loss of lights after earthquakes or hurricanes).",
  },
  {
    id: "sdg9-q16",
    sdgNumber: 9,
    question:
      "Which polarization mode of Sentinel-1 SAR is most commonly used for infrastructure and urban mapping?",
    options: [
      "HH (horizontal transmit, horizontal receive)",
      "VV (vertical transmit, vertical receive)",
      "VH (vertical transmit, horizontal receive)",
      "HV (horizontal transmit, vertical receive)",
    ],
    correctIndex: 1,
    explanation:
      "VV polarization is commonly used for infrastructure mapping because vertical structures like buildings create strong backscatter in the VV channel through double-bounce reflection between the ground and vertical walls.",
  },
  {
    id: "sdg9-q17",
    sdgNumber: 9,
    question: "How does SDG 9 relate to SDG 13 (Climate Action)?",
    options: [
      "They are unrelated goals",
      "Resilient infrastructure reduces climate vulnerability, while sustainable industrialization reduces emissions",
      "SDG 9 replaces SDG 13 for developed countries",
      "SDG 13 provides funding for SDG 9",
    ],
    correctIndex: 1,
    explanation:
      "SDG 9 and SDG 13 are deeply interconnected: building climate-resilient infrastructure (Target 9.1) reduces vulnerability to climate impacts, while promoting sustainable and clean industrial processes (Target 9.4) helps reduce greenhouse gas emissions addressed by SDG 13.",
  },
  {
    id: "sdg9-q18",
    sdgNumber: 9,
    question:
      "The Black Marble product from NASA provides what kind of nighttime lights data?",
    options: [
      "Raw unprocessed sensor readings only",
      "Atmospherically corrected, lunar-cycle adjusted nighttime radiance composites",
      "Visible-only daytime reflectance",
      "Thermal infrared nighttime temperature maps",
    ],
    correctIndex: 1,
    explanation:
      "NASA's Black Marble (VNP46A) product provides atmospherically corrected VIIRS DNB nighttime radiance that accounts for lunar illumination, atmospheric conditions, and seasonal vegetation effects, producing consistent time-series data for trend analysis.",
  },
  {
    id: "sdg9-q19",
    sdgNumber: 9,
    question:
      "What percentage of the global population still lacked access to the internet as of 2023 (approximate)?",
    options: ["About 5%", "About 15%", "About 33%", "About 60%"],
    correctIndex: 2,
    explanation:
      "As of 2023, roughly one-third (about 2.6 billion people) of the global population still lacked internet access, with the digital divide disproportionately affecting least developed countries, rural areas, women, and older populations.",
  },
  {
    id: "sdg9-q20",
    sdgNumber: 9,
    question:
      "Sentinel-2 multispectral imagery can assist SDG 9 monitoring by identifying what infrastructure features?",
    options: [
      "Underground pipelines",
      "Building footprints, construction sites, and impervious surfaces",
      "Internet backbone fiber-optic cables",
      "Subsurface geological faults",
    ],
    correctIndex: 1,
    explanation:
      "Sentinel-2's 10 m resolution visible and NIR bands can distinguish impervious surfaces (buildings, roads, parking lots) from surrounding vegetation and bare soil, enabling mapping of building footprints, tracking new construction, and monitoring urban infrastructure expansion.",
  },
  {
    id: "sdg9-q21",
    sdgNumber: 9,
    question:
      "SDG Target 9.a focuses on facilitating sustainable and resilient infrastructure development in developing countries through what means?",
    options: [
      "Military aid",
      "Enhanced financial, technological, and technical support",
      "Trade sanctions",
      "Mandatory technology licensing",
    ],
    correctIndex: 1,
    explanation:
      "Target 9.a calls for facilitating sustainable and resilient infrastructure development in developing countries through enhanced financial, technological, and technical support to African countries, LDCs, LLDCs, and SIDS.",
  },
];

// Stores the questions used when the quiz draws from the SDG 11 sustainable cities and communities topic set.
const sdg11Questions: QuizQuestion[] = [
  {
    id: "sdg11-q1",
    sdgNumber: 11,
    question: "What is the full title of SDG 11?",
    options: [
      "Sustainable Cities and Communities",
      "Reduced Inequalities",
      "Life on Land",
      "Responsible Consumption and Production",
    ],
    correctIndex: 0,
    explanation:
      "SDG 11 is officially titled 'Make cities and human settlements inclusive, safe, resilient, and sustainable,' commonly shortened to Sustainable Cities and Communities.",
  },
  {
    id: "sdg11-q2",
    sdgNumber: 11,
    question:
      "Which satellite series provides the longest continuous record for monitoring urban expansion?",
    options: [
      "Sentinel-2 (since 2015)",
      "SPOT (since 1986)",
      "Landsat (since 1972)",
      "WorldView (since 2007)",
    ],
    correctIndex: 2,
    explanation:
      "The Landsat program, beginning with Landsat 1 in 1972, provides the longest continuous space-based record of Earth's land surface at moderate resolution (30 m since Landsat 4). Over 50 years of imagery enables long-term urban expansion analysis.",
  },
  {
    id: "sdg11-q3",
    sdgNumber: 11,
    question: "Sentinel-2 NDVI is used for SDG 11 to measure what in cities?",
    options: [
      "Building height",
      "Traffic density",
      "Urban green space coverage",
      "Population density",
    ],
    correctIndex: 2,
    explanation:
      "NDVI (Normalized Difference Vegetation Index) from Sentinel-2 quantifies vegetation density and health. In an SDG 11 context, it is used to measure and monitor the proportion of urban green space (parks, gardens, street trees) critical for livability and public health.",
  },
  {
    id: "sdg11-q4",
    sdgNumber: 11,
    question:
      "MODIS Aerosol Optical Depth (AOD) is used as a proxy for which urban air quality parameter?",
    options: [
      "Ozone (O3)",
      "PM2.5 (fine particulate matter)",
      "Carbon monoxide (CO)",
      "Nitrogen dioxide (NO2)",
    ],
    correctIndex: 1,
    explanation:
      "MODIS AOD measures the total aerosol loading in the atmospheric column, which is statistically correlated with ground-level PM2.5 concentrations. Regression models and machine learning techniques convert AOD to surface PM2.5 estimates for health impact assessment.",
  },
  {
    id: "sdg11-q5",
    sdgNumber: 11,
    question:
      "The Urban Heat Island (UHI) effect is measured using which Landsat sensor?",
    options: [
      "OLI (Operational Land Imager) visible bands",
      "OLI panchromatic band",
      "TIRS (Thermal Infrared Sensor)",
      "OLI coastal/aerosol band",
    ],
    correctIndex: 2,
    explanation:
      "Landsat's TIRS measures thermal infrared radiation emitted by Earth's surface, providing Land Surface Temperature (LST) data. Urban areas show elevated LST compared to surrounding rural areas, quantifying the Urban Heat Island effect.",
  },
  {
    id: "sdg11-q6",
    sdgNumber: 11,
    question:
      "By 2050, approximately what percentage of the world's population is projected to live in urban areas?",
    options: ["50%", "55%", "68%", "85%"],
    correctIndex: 2,
    explanation:
      "The UN projects that 68% of the world's population will be urban by 2050, up from 56% in 2021. This rapid urbanization underscores the urgency of SDG 11's goals for sustainable urban planning.",
  },
  {
    id: "sdg11-q7",
    sdgNumber: 11,
    question:
      "SDG Target 11.7 calls for providing universal access to what by 2030?",
    options: [
      "High-speed internet",
      "Safe, inclusive, and accessible green and public spaces",
      "Private vehicle ownership",
      "Skyscraper housing",
    ],
    correctIndex: 1,
    explanation:
      "Target 11.7 aims to provide universal access to safe, inclusive, and accessible green and public spaces, particularly for women and children, older persons, and persons with disabilities.",
  },
  {
    id: "sdg11-q8",
    sdgNumber: 11,
    question: "What is Aerosol Optical Depth (AOD)?",
    options: [
      "The depth of aerosol deposits on the ground surface",
      "A dimensionless measure of the extinction of solar radiation by atmospheric aerosols in the total atmospheric column",
      "The altitude at which aerosols are most concentrated",
      "The thickness of the ozone layer",
    ],
    correctIndex: 1,
    explanation:
      "AOD is a dimensionless number that quantifies how much direct sunlight is prevented from reaching the ground by aerosol particles (dust, smoke, pollution) in the entire atmospheric column. Higher AOD values indicate hazier, more polluted conditions.",
  },
  {
    id: "sdg11-q9",
    sdgNumber: 11,
    question:
      "Landsat TIRS measures surface temperature in which part of the electromagnetic spectrum?",
    options: [
      "Visible (0.4-0.7 \u03BCm)",
      "Near-Infrared (0.7-1.3 \u03BCm)",
      "Thermal Infrared (10.6-12.5 \u03BCm)",
      "Microwave (1-10 cm)",
    ],
    correctIndex: 2,
    explanation:
      "TIRS measures emitted thermal infrared radiation in two bands centered at 10.9 \u03BCm and 12.0 \u03BCm. These wavelengths correspond to the thermal emission peak of Earth-temperature objects, enabling retrieval of Land Surface Temperature.",
  },
  {
    id: "sdg11-q10",
    sdgNumber: 11,
    question:
      "Which classification algorithm is commonly used for mapping urban land cover from satellite imagery?",
    options: [
      "Fast Fourier Transform",
      "Random Forest",
      "Kalman Filter",
      "Dijkstra's Algorithm",
    ],
    correctIndex: 1,
    explanation:
      "Random Forest is a widely used ensemble machine learning classifier for land cover mapping. It handles high-dimensional multispectral data well, is robust to overfitting, and provides feature importance metrics useful for understanding which bands contribute most to urban classification.",
  },
  {
    id: "sdg11-q11",
    sdgNumber: 11,
    question:
      "SDG Target 11.5 aims to significantly reduce deaths and economic losses from disasters. Which satellite capability supports this?",
    options: [
      "SAR-based flood and damage mapping for rapid disaster response",
      "Visible imagery for tourism promotion",
      "Gravity measurements for mineral prospecting",
      "Radar altimetry for ocean floor mapping",
    ],
    correctIndex: 0,
    explanation:
      "SAR sensors (Sentinel-1, ALOS-2) can map flood extent through clouds and at night, while pre/post-disaster optical imagery enables rapid building damage assessment. These capabilities directly support Target 11.5 by enabling faster emergency response and risk mapping.",
  },
  {
    id: "sdg11-q12",
    sdgNumber: 11,
    question:
      "The Global Human Settlement Layer (GHSL) dataset uses satellite data to map what?",
    options: [
      "Ocean shipping routes",
      "Built-up areas, population grids, and settlement classifications globally",
      "Agricultural field boundaries",
      "Forest canopy height",
    ],
    correctIndex: 1,
    explanation:
      "GHSL, produced by the European Commission's JRC, uses Landsat and Sentinel data combined with census information to produce global layers of built-up areas, population density grids, and a settlement model classifying urban centers, towns, and rural areas at multiple time points.",
  },
  {
    id: "sdg11-q13",
    sdgNumber: 11,
    question:
      "Urban green space provides which of the following ecosystem services relevant to SDG 11?",
    options: [
      "Air purification, heat mitigation, flood absorption, and mental health benefits",
      "Increased vehicle traffic flow",
      "Higher property tax revenue only",
      "Reduced need for public transport",
    ],
    correctIndex: 0,
    explanation:
      "Urban green spaces provide multiple ecosystem services: they filter air pollutants, reduce urban heat island intensity through evapotranspiration, absorb stormwater reducing flood risk, sequester carbon, support biodiversity, and provide recreation that improves mental health.",
  },
  {
    id: "sdg11-q14",
    sdgNumber: 11,
    question:
      "What is the spatial resolution of MODIS AOD products commonly used for PM2.5 estimation?",
    options: [
      "10 m",
      "30 m",
      "1 km (MAIAC product) to 10 km (standard Dark Target/Deep Blue)",
      "100 km",
    ],
    correctIndex: 2,
    explanation:
      "The standard MODIS Dark Target and Deep Blue AOD products have 10 km resolution, while the MAIAC (Multi-Angle Implementation of Atmospheric Correction) algorithm produces 1 km AOD retrievals, enabling finer-scale urban air quality assessment.",
  },
  {
    id: "sdg11-q15",
    sdgNumber: 11,
    question:
      "The ratio of Land Surface Temperature in urban areas versus surrounding rural areas defines what?",
    options: [
      "Albedo differential",
      "Surface Urban Heat Island Intensity (SUHII)",
      "Urban emissivity index",
      "Thermal conductivity ratio",
    ],
    correctIndex: 1,
    explanation:
      "Surface Urban Heat Island Intensity (SUHII) is typically defined as the LST difference between urban and surrounding rural reference areas (SUHII = LST_urban - LST_rural). It quantifies the magnitude of the heat island effect and is derived from thermal satellite data.",
  },
  {
    id: "sdg11-q16",
    sdgNumber: 11,
    question:
      "Which SDG has the strongest cross-linkage with SDG 11 regarding air quality?",
    options: [
      "SDG 3 (Good Health and Well-Being)",
      "SDG 5 (Gender Equality)",
      "SDG 14 (Life Below Water)",
      "SDG 17 (Partnerships for the Goals)",
    ],
    correctIndex: 0,
    explanation:
      "SDG 3 (Good Health and Well-Being) is directly linked to SDG 11 through urban air quality. PM2.5 pollution causes an estimated 4.2 million premature deaths annually (SDG 3 indicator), and cities are major hotspots of poor air quality (SDG 11).",
  },
  {
    id: "sdg11-q17",
    sdgNumber: 11,
    question: "SDG Indicator 11.3.1 measures the ratio of what two rates?",
    options: [
      "Water consumption rate to water supply rate",
      "Land consumption rate to population growth rate",
      "GDP growth rate to employment rate",
      "Building construction rate to demolition rate",
    ],
    correctIndex: 1,
    explanation:
      "Indicator 11.3.1 tracks the ratio of land consumption rate to population growth rate. A ratio greater than 1 indicates urban sprawl (land expanding faster than population), which is associated with inefficient resource use and higher infrastructure costs.",
  },
  {
    id: "sdg11-q18",
    sdgNumber: 11,
    question: "Which factor most contributes to the Urban Heat Island effect?",
    options: [
      "Higher elevation of urban areas",
      "Replacement of vegetation with impervious surfaces (concrete, asphalt) that absorb and re-emit heat",
      "Urban areas being closer to the equator",
      "Increased cloud cover above cities",
    ],
    correctIndex: 1,
    explanation:
      "The UHI effect primarily results from replacing natural vegetation and soil with impervious surfaces that have higher heat capacity and lower albedo, reduced evapotranspiration due to less vegetation, waste heat from buildings and vehicles, and altered wind patterns from urban geometry.",
  },
  {
    id: "sdg11-q19",
    sdgNumber: 11,
    question:
      "SDG Target 11.a promotes positive economic, social, and environmental links between urban, peri-urban, and rural areas through what?",
    options: [
      "Building walls between zones",
      "National and regional development planning",
      "Eliminating rural settlements",
      "Centralizing all services in capital cities",
    ],
    correctIndex: 1,
    explanation:
      "Target 11.a supports positive links between urban, peri-urban, and rural areas by strengthening national and regional development planning, recognizing that sustainable urbanization requires integrated approaches that connect cities with their surrounding regions.",
  },
  {
    id: "sdg11-q20",
    sdgNumber: 11,
    question:
      "An NDVI value close to 0 in an urban context typically indicates what type of surface?",
    options: [
      "Dense forest canopy",
      "Bare soil, concrete, asphalt, or water",
      "Healthy grassland",
      "Irrigated cropland",
    ],
    correctIndex: 1,
    explanation:
      "NDVI values near 0 indicate non-vegetated surfaces. In urban areas, this corresponds to impervious surfaces (roads, buildings, parking lots), bare soil, or water bodies. Healthy vegetation typically shows NDVI values of 0.3-0.8.",
  },
  {
    id: "sdg11-q21",
    sdgNumber: 11,
    question:
      "How do Sentinel-2 and Landsat data complement each other for urban expansion monitoring?",
    options: [
      "They use the same exact spectral bands so are redundant",
      "Sentinel-2 provides higher spatial/temporal resolution while Landsat provides the long historical record",
      "Landsat has higher resolution than Sentinel-2",
      "Sentinel-2 only works over oceans",
    ],
    correctIndex: 1,
    explanation:
      "Sentinel-2 offers 10 m resolution and 5-day revisit (vs Landsat's 30 m and 16-day revisit), enabling more detailed and frequent urban monitoring. However, Landsat's archive extends back to 1972, providing essential historical context that Sentinel-2 (since 2015) cannot.",
  },
  {
    id: "sdg11-q22",
    sdgNumber: 11,
    question:
      "What percentage of global greenhouse gas emissions are attributed to cities (approximate)?",
    options: ["About 20%", "About 40%", "About 70%", "About 90%"],
    correctIndex: 2,
    explanation:
      "Cities are responsible for approximately 70% of global CO2 emissions, primarily from energy use in buildings, transportation, and industry. This makes sustainable urban planning (SDG 11) critical for climate action (SDG 13).",
  },
];

// Stores the questions used when the quiz draws from the SDG 12 responsible consumption and production topic set.
const sdg12Questions: QuizQuestion[] = [
  {
    id: "sdg12-q1",
    sdgNumber: 12,
    question: "What is the full title of SDG 12?",
    options: [
      "Responsible Consumption and Production",
      "Life on Land",
      "Decent Work and Economic Growth",
      "No Poverty",
    ],
    correctIndex: 0,
    explanation:
      "SDG 12 is officially titled 'Ensure sustainable consumption and production patterns,' commonly shortened to Responsible Consumption and Production.",
  },
  {
    id: "sdg12-q2",
    sdgNumber: 12,
    question:
      "Which satellite index is used to monitor agricultural efficiency, a key indicator for responsible production?",
    options: [
      "NDWI",
      "EVI (Enhanced Vegetation Index)",
      "Aerosol Optical Depth",
      "Brightness Temperature",
    ],
    correctIndex: 1,
    explanation:
      "The EVI from MODIS is widely used to monitor crop health and agricultural productivity. Unlike NDVI, EVI corrects for atmospheric and soil background influences and remains sensitive in high-biomass areas, making it more suitable for agricultural efficiency assessment.",
  },
  {
    id: "sdg12-q3",
    sdgNumber: 12,
    question:
      "The Hansen Global Forest Change (GFC) dataset tracks deforestation. What is its primary satellite data source?",
    options: ["Sentinel-2", "MODIS", "Landsat", "SPOT"],
    correctIndex: 2,
    explanation:
      "The Hansen GFC dataset, produced by the University of Maryland, uses Landsat imagery (primarily Landsat 7 ETM+ and Landsat 8 OLI) at 30 m resolution to map global tree cover extent, loss, and gain annually since 2000.",
  },
  {
    id: "sdg12-q4",
    sdgNumber: 12,
    question:
      "Sentinel-2 can be used to detect illegal waste dumping sites. What visual and spectral characteristics help identify them?",
    options: [
      "Uniform green coloring identical to vegetation",
      "Anomalous spectral signatures, irregular shapes, bare soil in unexpected areas, and proximity to urban zones",
      "Perfect rectangular geometry",
      "Deep ocean blue coloring",
    ],
    correctIndex: 1,
    explanation:
      "Waste sites show distinctive spectral anomalies (mixed materials produce unusual reflectance), irregular spatial patterns, co-occurrence with bare/disturbed soil, and often appear near urban or industrial areas. Change detection can flag new unauthorized sites.",
  },
  {
    id: "sdg12-q5",
    sdgNumber: 12,
    question:
      "SDG Target 12.3 aims to halve per capita global food waste by 2030 at which levels?",
    options: [
      "Production level only",
      "Retail and consumer levels",
      "Export and import levels",
      "Processing and packaging levels only",
    ],
    correctIndex: 1,
    explanation:
      "Target 12.3 aims to halve per capita global food waste at the retail and consumer levels and reduce food losses along production and supply chains, including post-harvest losses, by 2030.",
  },
  {
    id: "sdg12-q6",
    sdgNumber: 12,
    question: "How does the EVI formula differ from NDVI?",
    options: [
      "EVI uses only red and NIR bands like NDVI",
      "EVI incorporates the blue band and soil/atmospheric correction coefficients in addition to red and NIR",
      "EVI uses thermal infrared bands instead of visible bands",
      "EVI is identical to NDVI but with a different name",
    ],
    correctIndex: 1,
    explanation:
      "EVI = G * (NIR - Red) / (NIR + C1*Red - C2*Blue + L), where G is a gain factor, C1 and C2 are aerosol correction coefficients, and L is a canopy background adjustment. The blue band and additional parameters reduce atmospheric and soil background noise.",
  },
  {
    id: "sdg12-q7",
    sdgNumber: 12,
    question:
      "Mining impact monitoring using Sentinel-1 SAR and Sentinel-2 optical imagery can detect what changes?",
    options: [
      "Changes in underground mineral composition",
      "Surface disturbance, land subsidence, tailings pond extent, and vegetation loss around mine sites",
      "Gold and diamond purity levels",
      "Worker safety conditions inside mines",
    ],
    correctIndex: 1,
    explanation:
      "Satellite monitoring of mining sites can track surface land disturbance expansion, subsidence using InSAR, growth of tailings ponds (which can pose environmental hazards), and progressive vegetation loss in the surrounding landscape.",
  },
  {
    id: "sdg12-q8",
    sdgNumber: 12,
    question:
      "SDG Target 12.4 addresses the environmentally sound management of what throughout their life cycle?",
    options: [
      "Renewable energy sources",
      "Chemicals and all wastes",
      "Consumer electronics only",
      "Agricultural seeds",
    ],
    correctIndex: 1,
    explanation:
      "Target 12.4 calls for achieving environmentally sound management of chemicals and all wastes throughout their life cycle, and significantly reducing their release to air, water, and soil to minimize adverse impacts on human health and the environment.",
  },
  {
    id: "sdg12-q9",
    sdgNumber: 12,
    question: "The Hansen GFC dataset defines 'tree cover loss' as what?",
    options: [
      "Any decrease in canopy height",
      "Stand-replacement disturbance or complete removal of tree cover canopy at 30 m resolution",
      "Seasonal leaf drop in deciduous forests",
      "Reduction in tree species diversity",
    ],
    correctIndex: 1,
    explanation:
      "In the Hansen GFC dataset, tree cover loss is defined as a stand-replacement disturbance, or a change from a forested to non-forested state, at the Landsat pixel scale (30 m). Seasonal variations and partial canopy degradation are generally not captured as 'loss.'",
  },
  {
    id: "sdg12-q10",
    sdgNumber: 12,
    question:
      "Which global agreement is closely linked to SDG 12 and focuses on a 10-Year Framework of Programmes on Sustainable Consumption and Production?",
    options: [
      "Paris Agreement",
      "10YFP (adopted at Rio+20 in 2012)",
      "Montreal Protocol",
      "Kyoto Protocol",
    ],
    correctIndex: 1,
    explanation:
      "The 10-Year Framework of Programmes on Sustainable Consumption and Production Patterns (10YFP), adopted at the Rio+20 Conference in 2012, is the key international framework supporting SDG 12. Target 12.1 specifically references it.",
  },
  {
    id: "sdg12-q11",
    sdgNumber: 12,
    question:
      "MODIS EVI data from the Terra satellite has been available since approximately what year?",
    options: ["1992", "2000", "2010", "2015"],
    correctIndex: 1,
    explanation:
      "The Terra satellite launched in December 1999, with MODIS data products (including EVI) consistently available from February 2000 onward. This 25+ year record enables long-term agricultural efficiency trend analysis.",
  },
  {
    id: "sdg12-q12",
    sdgNumber: 12,
    question:
      "How does deforestation monitoring (Hansen GFC) relate to responsible consumption (SDG 12)?",
    options: [
      "Deforestation is unrelated to consumption patterns",
      "Commodity-driven deforestation for palm oil, soy, beef, and timber links forest loss directly to global supply chains and consumption",
      "Deforestation only occurs naturally",
      "SDG 12 only covers industrial waste, not land use",
    ],
    correctIndex: 1,
    explanation:
      "Approximately 80% of tropical deforestation is driven by agricultural expansion for commodities like palm oil, soy, beef, and timber. Tracking deforestation via satellite directly supports SDG 12 by revealing the environmental cost of global consumption patterns and supply chains.",
  },
  {
    id: "sdg12-q13",
    sdgNumber: 12,
    question:
      "SDG Target 12.5 aims to substantially reduce waste generation through what approaches?",
    options: [
      "Increased landfill capacity",
      "Prevention, reduction, recycling, and reuse",
      "Exporting waste to other countries",
      "Incineration without energy recovery",
    ],
    correctIndex: 1,
    explanation:
      "Target 12.5 emphasizes the waste hierarchy: prevention (reducing waste creation), reduction (minimizing waste volume), recycling (converting waste to new materials), and reuse (extending product life), collectively aiming to substantially reduce waste generation by 2030.",
  },
  {
    id: "sdg12-q14",
    sdgNumber: 12,
    question:
      "Sentinel-1 SAR coherence analysis can detect mining-related ground subsidence. What does 'coherence' measure in this context?",
    options: [
      "The color similarity between two images",
      "The phase stability between two SAR acquisitions over the same area",
      "The total radar signal strength",
      "The number of scattering objects per pixel",
    ],
    correctIndex: 1,
    explanation:
      "InSAR coherence measures the degree of phase correlation between two SAR images acquired at different times. High coherence indicates stable ground, while loss of coherence (decorrelation) can indicate surface disturbance, and phase differences reveal millimetric ground displacement.",
  },
  {
    id: "sdg12-q15",
    sdgNumber: 12,
    question:
      "Approximately how much food produced globally is lost or wasted each year?",
    options: ["About 5%", "About 15%", "About one-third", "About 75%"],
    correctIndex: 2,
    explanation:
      "According to the FAO, approximately one-third of all food produced globally (about 1.3 billion tonnes per year) is lost or wasted. This represents a massive inefficiency in the food system with enormous environmental, economic, and social costs.",
  },
  {
    id: "sdg12-q16",
    sdgNumber: 12,
    question: "How does SDG 12 link to SDG 15 (Life on Land)?",
    options: [
      "They are completely independent goals",
      "Unsustainable consumption drives deforestation, mining, and land degradation that threaten terrestrial ecosystems",
      "SDG 15 replaces SDG 12 for rural areas",
      "SDG 12 only applies to ocean resources",
    ],
    correctIndex: 1,
    explanation:
      "SDG 12 and SDG 15 are tightly linked: unsustainable consumption patterns drive demand for commodities that cause deforestation, mining, and agricultural expansion (all monitored by satellites), which directly threaten the terrestrial ecosystems SDG 15 seeks to protect.",
  },
  {
    id: "sdg12-q17",
    sdgNumber: 12,
    question:
      "What spectral region does Sentinel-2 use that is particularly useful for distinguishing bare soil from vegetation near waste sites?",
    options: [
      "Thermal infrared",
      "Microwave",
      "Short-wave infrared (SWIR, bands 11 and 12)",
      "Ultraviolet",
    ],
    correctIndex: 2,
    explanation:
      "Sentinel-2's SWIR bands (Band 11 at 1610 nm and Band 12 at 2190 nm) are sensitive to soil moisture, mineral composition, and dry vegetation. These bands help distinguish disturbed bare soil around waste sites and mining operations from surrounding healthy vegetation.",
  },
  {
    id: "sdg12-q18",
    sdgNumber: 12,
    question: "SDG Target 12.6 encourages companies to adopt what?",
    options: [
      "Mandatory government pricing",
      "Sustainable practices and sustainability reporting in their reporting cycle",
      "Complete automation of factories",
      "Relocation to developing countries",
    ],
    correctIndex: 1,
    explanation:
      "Target 12.6 encourages companies, especially large and transnational companies, to adopt sustainable practices and to integrate sustainability information into their reporting cycle, increasing transparency about environmental and social impacts.",
  },
  {
    id: "sdg12-q19",
    sdgNumber: 12,
    question:
      "What is the spatial resolution of the Hansen GFC tree cover loss product?",
    options: ["10 m", "30 m", "250 m", "1 km"],
    correctIndex: 1,
    explanation:
      "The Hansen GFC product uses Landsat imagery at 30 m spatial resolution, providing tree cover loss data at the same resolution. Each pixel represents approximately 900 m\u00B2, sufficient for detecting both large-scale clear-cutting and smaller fragmentation events.",
  },
  {
    id: "sdg12-q20",
    sdgNumber: 12,
    question:
      "SDG Target 12.c calls for rationalizing inefficient fossil-fuel subsidies. Why is this relevant to responsible consumption?",
    options: [
      "Fossil fuel subsidies encourage overconsumption of non-renewable energy, distorting markets and hindering the transition to sustainable alternatives",
      "It is not relevant to SDG 12",
      "Subsidies only affect government budgets, not consumption",
      "Fossil fuels are already sustainable",
    ],
    correctIndex: 0,
    explanation:
      "Fossil-fuel subsidies artificially lower energy prices, encouraging wasteful overconsumption, discouraging energy efficiency, and making renewable alternatives less competitive. Reforming these subsidies is a key lever for shifting consumption toward sustainable patterns.",
  },
  {
    id: "sdg12-q21",
    sdgNumber: 12,
    question:
      "What is the material footprint indicator (SDG 12.2.1) and why does it matter?",
    options: [
      "The physical footprint of warehouses",
      "The total amount of raw materials extracted to meet domestic consumption, including materials embedded in imports",
      "The carbon footprint of transportation only",
      "The weight of packaging materials per product",
    ],
    correctIndex: 1,
    explanation:
      "Material footprint (Indicator 12.2.1) measures the total amount of raw materials extracted globally to meet a country's consumption demand, including materials embedded in imported goods. It reveals the true resource impact of consumption patterns beyond domestic extraction alone.",
  },
  {
    id: "sdg12-q22",
    sdgNumber: 12,
    question:
      "Sentinel-2's red edge bands (B5, B6, B7) are particularly useful for monitoring agricultural crop stress. What are red edge bands?",
    options: [
      "Bands in the ultraviolet spectrum",
      "Narrow bands between the visible red and NIR regions (700-790 nm) sensitive to chlorophyll content and plant health",
      "Thermal infrared bands that detect heat stress",
      "Microwave bands for soil moisture",
    ],
    correctIndex: 1,
    explanation:
      "Sentinel-2's red edge bands (B5: 705 nm, B6: 740 nm, B7: 783 nm) capture the sharp transition in vegetation reflectance between the red (absorption by chlorophyll) and NIR (reflection by leaf structure). Shifts in this edge position indicate changes in chlorophyll concentration and plant health.",
  },
];

// Stores the questions used when the quiz draws from the SDG 13 climate action topic set.
const sdg13Questions: QuizQuestion[] = [
  {
    id: "sdg13-q1",
    sdgNumber: 13,
    question: "What is the full title of SDG 13?",
    options: [
      "Climate Action",
      "Affordable and Clean Energy",
      "Life Below Water",
      "Clean Water and Sanitation",
    ],
    correctIndex: 0,
    explanation:
      "SDG 13 is officially titled 'Take urgent action to combat climate change and its impacts,' commonly shortened to Climate Action.",
  },
  {
    id: "sdg13-q2",
    sdgNumber: 13,
    question:
      "Which satellite mission is specifically designed to measure atmospheric CO\u2082 concentrations from space?",
    options: [
      "Sentinel-2",
      "GRACE-FO",
      "OCO-2 (Orbiting Carbon Observatory-2)",
      "Landsat 9",
    ],
    correctIndex: 2,
    explanation:
      "NASA's OCO-2, launched in 2014, and its successor OCO-3 (installed on the ISS in 2019) are specifically designed to measure atmospheric column-averaged CO\u2082 dry air mole fractions (XCO2) using high-resolution spectrometry of reflected sunlight in the near-infrared.",
  },
  {
    id: "sdg13-q3",
    sdgNumber: 13,
    question:
      "Jason-3 is a satellite altimeter mission used for SDG 13 monitoring. What does it primarily measure?",
    options: [
      "Atmospheric temperature",
      "Sea surface height (sea level)",
      "Ocean color (chlorophyll)",
      "Cloud cover percentage",
    ],
    correctIndex: 1,
    explanation:
      "Jason-3, launched in 2016, continues the sea level measurement record begun by TOPEX/Poseidon (1992). It uses radar altimetry to measure global sea surface height with millimetric precision, tracking one of the most critical indicators of climate change.",
  },
  {
    id: "sdg13-q4",
    sdgNumber: 13,
    question:
      "CryoSat-2 is used to monitor ice coverage for SDG 13. What type of instrument does it carry?",
    options: [
      "Multispectral camera",
      "SAR/Interferometric Radar Altimeter (SIRAL)",
      "Thermal infrared radiometer",
      "GPS receiver only",
    ],
    correctIndex: 1,
    explanation:
      "CryoSat-2 carries SIRAL (SAR/Interferometric Radar Altimeter), which can operate in three modes (low-resolution, SAR, and SAR interferometric) to measure the thickness of sea ice and the elevation of ice sheets with unprecedented precision.",
  },
  {
    id: "sdg13-q5",
    sdgNumber: 13,
    question:
      "ERA5 is a widely used dataset for temperature anomaly monitoring. What is ERA5?",
    options: [
      "A satellite mission launched by ESA",
      "A global atmospheric reanalysis product produced by ECMWF",
      "An ocean buoy network",
      "A ground-based weather station database",
    ],
    correctIndex: 1,
    explanation:
      "ERA5 is the fifth generation global atmospheric reanalysis produced by the European Centre for Medium-Range Weather Forecasts (ECMWF). It assimilates satellite data, weather stations, and other observations using a numerical weather model to produce consistent, gridded climate data from 1940 to present.",
  },
  {
    id: "sdg13-q6",
    sdgNumber: 13,
    question:
      "The Paris Agreement, referenced in SDG 13, aims to limit global temperature rise to well below what level above pre-industrial temperatures?",
    options: [
      "1.0\u00B0C",
      "1.5\u00B0C",
      "2.0\u00B0C, with efforts to limit to 1.5\u00B0C",
      "3.0\u00B0C",
    ],
    correctIndex: 2,
    explanation:
      "The 2015 Paris Agreement aims to hold the increase in global average temperature to well below 2\u00B0C above pre-industrial levels and to pursue efforts to limit the temperature increase to 1.5\u00B0C, recognizing that this would significantly reduce the risks and impacts of climate change.",
  },
  {
    id: "sdg13-q7",
    sdgNumber: 13,
    question:
      "What is the current rate of global mean sea level rise (approximate, as of recent decades)?",
    options: [
      "About 0.5 mm/year",
      "About 3.6 mm/year (accelerating)",
      "About 10 mm/year",
      "Sea level is not rising",
    ],
    correctIndex: 1,
    explanation:
      "Satellite altimetry (TOPEX/Poseidon, Jason series, Sentinel-6) shows that global mean sea level has been rising at approximately 3.6 mm/year in recent years, with the rate accelerating over time. The rate has roughly doubled since the early 1990s.",
  },
  {
    id: "sdg13-q8",
    sdgNumber: 13,
    question:
      "OCO-2 measures CO\u2082 by analyzing absorption in which part of the spectrum?",
    options: [
      "Microwave bands",
      "Near-infrared absorption bands of CO\u2082 (around 1.61 \u03BCm and 2.06 \u03BCm) and the O\u2082 A-band (0.76 \u03BCm)",
      "Thermal infrared emission bands",
      "Visible blue wavelengths",
    ],
    correctIndex: 1,
    explanation:
      "OCO-2 observes sunlight reflected from Earth's surface in three spectral bands: the O\u2082 A-band (0.765 \u03BCm) for surface pressure, and two CO\u2082 absorption bands (1.61 \u03BCm and 2.06 \u03BCm) to retrieve the column-averaged CO\u2082 dry air mole fraction (XCO2).",
  },
  {
    id: "sdg13-q9",
    sdgNumber: 13,
    question:
      "Sentinel-3 carries which instrument for measuring sea surface temperature?",
    options: [
      "MSI (MultiSpectral Instrument)",
      "SLSTR (Sea and Land Surface Temperature Radiometer)",
      "OLI (Operational Land Imager)",
      "SIRAL (SAR/Interferometric Radar Altimeter)",
    ],
    correctIndex: 1,
    explanation:
      "Sentinel-3's SLSTR measures sea and land surface temperature with high accuracy using thermal infrared channels. It provides dual-view (nadir and oblique) observations to improve atmospheric correction, achieving SST accuracy better than 0.3 K.",
  },
  {
    id: "sdg13-q10",
    sdgNumber: 13,
    question:
      "What atmospheric CO\u2082 concentration was reached in 2024 (approximate annual average)?",
    options: ["350 ppm", "380 ppm", "424 ppm", "500 ppm"],
    correctIndex: 2,
    explanation:
      "Global atmospheric CO\u2082 concentrations reached approximately 424 ppm as an annual average in 2024, continuing an upward trend. Pre-industrial levels were about 280 ppm, meaning human activities have increased CO\u2082 by over 50%.",
  },
  {
    id: "sdg13-q11",
    sdgNumber: 13,
    question:
      "SDG Target 13.1 calls for strengthening resilience and adaptive capacity to what?",
    options: [
      "Economic recessions",
      "Climate-related hazards and natural disasters",
      "Pandemic diseases",
      "Cybersecurity threats",
    ],
    correctIndex: 1,
    explanation:
      "Target 13.1 aims to strengthen resilience and adaptive capacity to climate-related hazards and natural disasters in all countries, including both sudden-onset events (floods, storms) and slow-onset processes (sea level rise, desertification).",
  },
  {
    id: "sdg13-q12",
    sdgNumber: 13,
    question: "How does radar altimetry (Jason-3) measure sea level?",
    options: [
      "By photographing coastlines from orbit",
      "By measuring the round-trip time of microwave radar pulses reflected off the ocean surface",
      "By detecting changes in ocean color",
      "By measuring gravitational pull from orbit",
    ],
    correctIndex: 1,
    explanation:
      "Jason-3 transmits microwave radar pulses toward the ocean surface and measures the precise round-trip travel time. Combined with precise orbit determination (GPS, DORIS, laser retroreflectors), this yields sea surface height measurements accurate to a few centimeters.",
  },
  {
    id: "sdg13-q13",
    sdgNumber: 13,
    question:
      "Arctic sea ice extent has declined by approximately what percentage per decade since satellite records began in 1979?",
    options: ["About 1%", "About 5%", "About 13%", "About 30%"],
    correctIndex: 2,
    explanation:
      "September Arctic sea ice extent (annual minimum) has been declining at a rate of approximately 13% per decade since 1979, one of the most dramatic signals of ongoing climate change visible from space.",
  },
  {
    id: "sdg13-q14",
    sdgNumber: 13,
    question: "What is a 'temperature anomaly' in climate monitoring?",
    options: [
      "An unusually cold day",
      "The deviation of temperature from a long-term baseline average (e.g., 1951-1980 mean)",
      "The daily temperature range",
      "The difference between day and night temperatures",
    ],
    correctIndex: 1,
    explanation:
      "A temperature anomaly represents the departure of the observed temperature from a reference (baseline) average, typically a 30-year climatological period. Positive anomalies indicate warmer-than-average conditions; negative anomalies indicate cooler-than-average.",
  },
  {
    id: "sdg13-q15",
    sdgNumber: 13,
    question:
      "The Greenland ice sheet is losing mass at an accelerating rate. GRACE/GRACE-FO data show approximate annual mass loss of what order?",
    options: [
      "About 1 billion tonnes/year",
      "About 50 billion tonnes/year",
      "About 270 billion tonnes/year",
      "About 2 trillion tonnes/year",
    ],
    correctIndex: 2,
    explanation:
      "GRACE/GRACE-FO data indicate that the Greenland ice sheet has been losing approximately 270 billion tonnes of ice per year (with significant year-to-year variability), contributing about 0.7 mm/year to global sea level rise.",
  },
  {
    id: "sdg13-q16",
    sdgNumber: 13,
    question:
      "SDG Target 13.3 focuses on improving what regarding climate change?",
    options: [
      "Military preparedness",
      "Education, awareness-raising, and human and institutional capacity on climate change mitigation, adaptation, impact reduction, and early warning",
      "Fossil fuel production capacity",
      "Space exploration funding",
    ],
    correctIndex: 1,
    explanation:
      "Target 13.3 calls for improving education, awareness-raising, and human and institutional capacity on climate change mitigation, adaptation, impact reduction, and early warning, recognizing that informed populations and strong institutions are essential for effective climate action.",
  },
  {
    id: "sdg13-q17",
    sdgNumber: 13,
    question:
      "OCO-3 differs from OCO-2 in its orbit because it is mounted on what platform?",
    options: [
      "A geostationary satellite",
      "The International Space Station (ISS)",
      "A weather balloon constellation",
      "A polar-orbiting satellite like OCO-2",
    ],
    correctIndex: 1,
    explanation:
      "OCO-3 was installed on the International Space Station in 2019. Unlike OCO-2's sun-synchronous orbit, the ISS's 51.6\u00B0 inclined orbit allows OCO-3 to observe the same locations at different times of day, enabling study of the diurnal cycle of CO\u2082.",
  },
  {
    id: "sdg13-q18",
    sdgNumber: 13,
    question: "How does SDG 13 relate to SDG 6 (Clean Water)?",
    options: [
      "They are unrelated",
      "Climate change alters precipitation patterns, intensifies droughts and floods, and melts glaciers that supply freshwater",
      "SDG 13 only concerns atmospheric issues",
      "SDG 6 addresses climate through desalination",
    ],
    correctIndex: 1,
    explanation:
      "Climate change profoundly impacts the water cycle: it alters precipitation patterns (monitored by GPM), intensifies droughts and floods, accelerates glacier retreat (reducing freshwater reserves), and raises sea levels that contaminate coastal aquifers with saltwater.",
  },
  {
    id: "sdg13-q19",
    sdgNumber: 13,
    question:
      "What two main processes cause global sea level rise, and which can satellites measure?",
    options: [
      "Tidal forces and ocean currents; only tides are measurable",
      "Thermal expansion of warming water and melting of land ice; both are measurable by satellite altimetry and gravimetry",
      "Underwater volcanism and plate tectonics; neither is measurable",
      "Wind patterns and fish migration; only wind is measurable",
    ],
    correctIndex: 1,
    explanation:
      "Sea level rise is driven by thermal expansion (warmer water occupies more volume, measured by Argo floats and satellite altimetry) and addition of water from melting land ice (measured by GRACE-FO gravimetry and CryoSat-2 altimetry). Together, these account for virtually all observed sea level rise.",
  },
  {
    id: "sdg13-q20",
    sdgNumber: 13,
    question:
      "Sentinel-6 Michael Freilich, launched in 2020, continues the sea level record from which predecessor missions?",
    options: [
      "Landsat series",
      "TOPEX/Poseidon, Jason-1, Jason-2, and Jason-3",
      "Sentinel-1 and Sentinel-2",
      "ERS-1 and ERS-2",
    ],
    correctIndex: 1,
    explanation:
      "Sentinel-6 Michael Freilich extends the continuous high-accuracy sea level record started by TOPEX/Poseidon (1992), continued by Jason-1 (2001), Jason-2 (2008), and Jason-3 (2016), ensuring an unbroken 30+ year climate data record.",
  },
  {
    id: "sdg13-q21",
    sdgNumber: 13,
    question: "What is a climate 'tipping point'?",
    options: [
      "A standard temperature measurement technique",
      "A critical threshold beyond which a climate system shifts to a new, often irreversible, state",
      "The warmest day of each year",
      "A voting mechanism in climate negotiations",
    ],
    correctIndex: 1,
    explanation:
      "A climate tipping point is a critical threshold where a small additional change can trigger a large, often irreversible shift in a climate subsystem. Examples include collapse of the West Antarctic Ice Sheet, Amazon rainforest dieback, and Atlantic thermohaline circulation shutdown.",
  },
  {
    id: "sdg13-q22",
    sdgNumber: 13,
    question:
      "CryoSat-2's radar can measure sea ice freeboard. What is freeboard?",
    options: [
      "The total thickness of ice from top to bottom",
      "The height of the ice surface above the local sea level",
      "The temperature of the ice surface",
      "The age of the ice in years",
    ],
    correctIndex: 1,
    explanation:
      "Freeboard is the height of the ice surface above the surrounding water level. CryoSat-2 measures this using radar altimetry. By assuming ice density and applying Archimedes' principle (most of the ice is below water), total sea ice thickness can be estimated from freeboard.",
  },
  {
    id: "sdg13-q23",
    sdgNumber: 13,
    question:
      "Which greenhouse gas has the highest global warming potential per molecule but lower total forcing than CO\u2082?",
    options: [
      "Water vapor (H\u2082O)",
      "Methane (CH\u2084)",
      "Nitrous oxide (N\u2082O)",
      "Sulfur hexafluoride (SF\u2086)",
    ],
    correctIndex: 3,
    explanation:
      "SF\u2086 has a global warming potential approximately 23,500 times that of CO\u2082 over a 100-year period, the highest of any gas assessed by the IPCC. However, its atmospheric concentration is tiny (~10 ppt), so its total radiative forcing is small compared to CO\u2082 or CH\u2084.",
  },
];

// Stores the questions used when the quiz draws from the SDG 15 terrestrial ecosystems and biodiversity topic set.
const sdg15Questions: QuizQuestion[] = [
  {
    id: "sdg15-q1",
    sdgNumber: 15,
    question: "What is the full title of SDG 15?",
    options: [
      "Life on Land",
      "Life Below Water",
      "Climate Action",
      "Zero Hunger",
    ],
    correctIndex: 0,
    explanation:
      "SDG 15 is officially titled 'Protect, restore, and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss,' commonly shortened to Life on Land.",
  },
  {
    id: "sdg15-q2",
    sdgNumber: 15,
    question:
      "NDVI is the most widely used satellite vegetation index. What is its formula?",
    options: [
      "(Blue - Red) / (Blue + Red)",
      "(NIR - Red) / (NIR + Red)",
      "(Green - NIR) / (Green + NIR)",
      "(SWIR - NIR) / (SWIR + NIR)",
    ],
    correctIndex: 1,
    explanation:
      "NDVI = (NIR - Red) / (NIR + Red). Healthy vegetation strongly reflects NIR and absorbs red light (for photosynthesis), producing high NDVI values (0.3-0.8). Bare soil and water produce values near 0 or negative.",
  },
  {
    id: "sdg15-q3",
    sdgNumber: 15,
    question:
      "Which MODIS product provides global NDVI composites at 250 m resolution every 16 days?",
    options: ["MOD13Q1", "MOD11A1", "MOD09GA", "MOD04L2"],
    correctIndex: 0,
    explanation:
      "MOD13Q1 is the MODIS/Terra Vegetation Indices 16-Day L3 Global 250 m product. It provides NDVI and EVI composites using a constrained-view angle maximum value composite (CV-MVC) algorithm to select the best observation in each 16-day period.",
  },
  {
    id: "sdg15-q4",
    sdgNumber: 15,
    question:
      "The Hansen Global Forest Change dataset reports forest loss annually. Since 2001, approximately how many million hectares of tree cover have been lost globally each year?",
    options: [
      "About 1 million hectares",
      "About 5 million hectares",
      "About 10-15 million hectares",
      "About 50 million hectares",
    ],
    correctIndex: 2,
    explanation:
      "The Hansen GFC dataset shows annual tree cover loss has averaged approximately 10-15 million hectares per year since 2001, with significant year-to-year variation. Peak years (2016, 2017) saw losses exceeding 15 million hectares, driven by fires, agriculture, and logging.",
  },
  {
    id: "sdg15-q5",
    sdgNumber: 15,
    question:
      "Sentinel-1 SAR data can contribute to soil degradation monitoring through what measurement?",
    options: [
      "Soil color classification",
      "Surface roughness and soil moisture estimation from backscatter intensity",
      "Soil nutrient chemical analysis",
      "Underground root depth measurement",
    ],
    correctIndex: 1,
    explanation:
      "SAR backscatter intensity is sensitive to surface roughness and dielectric properties, which are strongly influenced by soil moisture. Time-series analysis of Sentinel-1 backscatter can detect changes in soil conditions indicative of degradation, compaction, or erosion.",
  },
  {
    id: "sdg15-q6",
    sdgNumber: 15,
    question:
      "SDG Target 15.1 calls for ensuring conservation, restoration, and sustainable use of terrestrial and inland freshwater ecosystems by what year?",
    options: ["2025", "2030", "2040", "2050"],
    correctIndex: 0,
    explanation:
      "Target 15.1 specifies 2020 as the original target year for ensuring conservation of terrestrial ecosystems in line with international obligations, though the broader SDG framework operates within the 2030 Agenda and many targets have been extended.",
  },
  {
    id: "sdg15-q7",
    sdgNumber: 15,
    question:
      "Multi-sensor biodiversity indices combine data from multiple satellites. Why is multi-sensor fusion important for biodiversity monitoring?",
    options: [
      "A single sensor can measure all aspects of biodiversity directly",
      "Different sensors capture complementary information: optical for vegetation type/health, radar for structure, thermal for microclimate, and lidar for canopy height",
      "Multi-sensor data is cheaper than single-sensor data",
      "It is required by law to use multiple sensors",
    ],
    correctIndex: 1,
    explanation:
      "Biodiversity assessment requires understanding habitat structure, composition, and function. Optical sensors provide spectral diversity (species/community proxy), SAR reveals 3D vegetation structure, thermal data indicates microhabitat conditions, and lidar measures canopy height/complexity. Fusing these gives a more complete picture.",
  },
  {
    id: "sdg15-q8",
    sdgNumber: 15,
    question:
      "What does 'land degradation neutrality' (LDN) mean in the context of SDG 15?",
    options: [
      "Maintaining all land exactly as it was in 1990",
      "A state where the amount and quality of land resources necessary to support ecosystem functions remain stable or increase",
      "Converting all degraded land to urban use",
      "Prohibiting any land use changes",
    ],
    correctIndex: 1,
    explanation:
      "LDN, referenced in Target 15.3, is a state where the amount and quality of land resources remain stable or increase over time. It uses a response hierarchy: avoid degradation, reduce existing degradation, and counterbalance unavoidable degradation by restoring degraded land elsewhere.",
  },
  {
    id: "sdg15-q9",
    sdgNumber: 15,
    question:
      "MODIS NDVI data has been available globally since 2000. What makes this long time series particularly valuable?",
    options: [
      "It has the highest spatial resolution available",
      "It enables detection of long-term vegetation trends, greening/browning patterns, and phenological shifts related to climate change",
      "It provides daily images at 1 m resolution",
      "It is the only vegetation index that exists",
    ],
    correctIndex: 1,
    explanation:
      "The 25+ year MODIS NDVI record enables robust statistical analysis of long-term vegetation trends (greening or browning), phenological shifts (earlier spring green-up, extended growing seasons), and ecosystem responses to climate variability and land use change.",
  },
  {
    id: "sdg15-q10",
    sdgNumber: 15,
    question:
      "SDG Target 15.5 addresses taking urgent action to reduce the degradation of natural habitats and halt the loss of what?",
    options: [
      "Mineral resources",
      "Biodiversity, including threatened species",
      "Agricultural subsidies",
      "Urban parks only",
    ],
    correctIndex: 1,
    explanation:
      "Target 15.5 calls for taking urgent and significant action to reduce the degradation of natural habitats, halt the loss of biodiversity, and by 2020, protect and prevent the extinction of threatened species.",
  },
  {
    id: "sdg15-q11",
    sdgNumber: 15,
    question:
      "What is the Spectral Variation Hypothesis in biodiversity remote sensing?",
    options: [
      "All species reflect light identically",
      "Greater spectral heterogeneity in satellite imagery corresponds to greater habitat heterogeneity and hence greater biodiversity",
      "Biodiversity can only be measured on the ground",
      "Uniform spectral signatures indicate high biodiversity",
    ],
    correctIndex: 1,
    explanation:
      "The Spectral Variation Hypothesis (Palmer et al., 2002) posits that environments with greater spectral variation (measured from satellite imagery) harbor greater biodiversity because spectral heterogeneity reflects the diversity of habitats, substrates, and vegetation types present.",
  },
  {
    id: "sdg15-q12",
    sdgNumber: 15,
    question:
      "Sentinel-2 has specific bands not found on Landsat that are particularly useful for vegetation monitoring. Which are they?",
    options: [
      "Thermal infrared bands",
      "Red edge bands (B5, B6, B7) and a narrow NIR band (B8A)",
      "Panchromatic band",
      "Microwave bands",
    ],
    correctIndex: 1,
    explanation:
      "Sentinel-2 features three red edge bands (705 nm, 740 nm, 783 nm) and a narrow NIR band (865 nm) not found on Landsat. These bands are sensitive to canopy chlorophyll content, leaf area index, and vegetation stress, providing enhanced vegetation characterization.",
  },
  {
    id: "sdg15-q13",
    sdgNumber: 15,
    question:
      "Approximately what percentage of land surface has been significantly degraded globally?",
    options: ["About 5%", "About 15%", "About 25%", "About 40%"],
    correctIndex: 3,
    explanation:
      "According to the UNCCD and various satellite-based assessments, approximately 40% of the world's land surface has been degraded, affecting nearly half the global population and driving species loss, food insecurity, and forced migration.",
  },
  {
    id: "sdg15-q14",
    sdgNumber: 15,
    question:
      "SDG Target 15.2 sets a deadline for halting deforestation. The original target was what year?",
    options: ["2020", "2025", "2030", "2050"],
    correctIndex: 0,
    explanation:
      "Target 15.2 originally aimed to halt deforestation by 2020. Since this target was not met, the Glasgow Leaders' Declaration on Forests and Land Use (2021) recommitted to halting and reversing forest loss by 2030.",
  },
  {
    id: "sdg15-q15",
    sdgNumber: 15,
    question:
      "How does Sentinel-1 SAR complement Sentinel-2 optical data for forest monitoring?",
    options: [
      "SAR provides identical information to optical data",
      "SAR can detect forest disturbances through clouds and during the rainy season when optical data is unavailable",
      "SAR has higher spectral resolution than Sentinel-2",
      "SAR is only useful over oceans",
    ],
    correctIndex: 1,
    explanation:
      "Tropical forests (where most deforestation occurs) are frequently cloud-covered, limiting optical satellite observation. Sentinel-1 SAR penetrates clouds, enabling near-real-time deforestation alerts even during rainy seasons. SAR backscatter also changes when forest structure is altered.",
  },
  {
    id: "sdg15-q16",
    sdgNumber: 15,
    question:
      "The UN Decade on Ecosystem Restoration (2021-2030) aligns with SDG 15. What is its primary goal?",
    options: [
      "To build more cities in forested areas",
      "To prevent, halt, and reverse the degradation of ecosystems worldwide",
      "To increase timber production globally",
      "To relocate endangered species to zoos",
    ],
    correctIndex: 1,
    explanation:
      "The UN Decade on Ecosystem Restoration (2021-2030) aims to prevent, halt, and reverse the degradation of ecosystems on every continent and in every ocean, calling for the restoration of billions of hectares of terrestrial and aquatic ecosystems.",
  },
  {
    id: "sdg15-q17",
    sdgNumber: 15,
    question:
      "What NDVI threshold is commonly used to distinguish between vegetated and non-vegetated surfaces?",
    options: ["NDVI > 0.5", "NDVI > 0.2", "NDVI > 0.0", "NDVI > 0.8"],
    correctIndex: 1,
    explanation:
      "An NDVI threshold of approximately 0.2 is commonly used to separate vegetated from non-vegetated surfaces. Values below 0.2 typically represent bare soil, water, snow, or urban surfaces, while values above 0.2 indicate increasing vegetation density.",
  },
  {
    id: "sdg15-q18",
    sdgNumber: 15,
    question:
      "SDG Target 15.3 specifically calls for combating desertification and restoring degraded land. Which indicator measures progress?",
    options: [
      "Number of national parks",
      "Proportion of land that is degraded over total land area (Indicator 15.3.1)",
      "Total annual rainfall",
      "Number of tree-planting campaigns",
    ],
    correctIndex: 1,
    explanation:
      "Indicator 15.3.1 measures the proportion of land that is degraded over total land area. It uses three sub-indicators: land cover change, land productivity dynamics (from NDVI time series), and carbon stocks (soil organic carbon), all derivable from satellite and ground data.",
  },
  {
    id: "sdg15-q19",
    sdgNumber: 15,
    question: "How does SDG 15 (Life on Land) link to SDG 13 (Climate Action)?",
    options: [
      "They are unrelated goals",
      "Forests and intact ecosystems act as carbon sinks; deforestation and land degradation release stored carbon, accelerating climate change",
      "SDG 15 replaces SDG 13 for land-based activities",
      "Climate has no impact on terrestrial ecosystems",
    ],
    correctIndex: 1,
    explanation:
      "Terrestrial ecosystems (especially forests) absorb roughly 30% of human CO\u2082 emissions. Deforestation releases this stored carbon, contributing approximately 10% of global greenhouse gas emissions. Conversely, climate change threatens ecosystems through heat stress, altered precipitation, and increased wildfire. The goals are deeply intertwined.",
  },
  {
    id: "sdg15-q20",
    sdgNumber: 15,
    question:
      "The Land Productivity Dynamics indicator used for SDG 15.3.1 is derived from what satellite data product?",
    options: [
      "Sea surface temperature",
      "Long-term NDVI time series (typically from MODIS or AVHRR)",
      "Nighttime lights",
      "Radar altimetry",
    ],
    correctIndex: 1,
    explanation:
      "Land Productivity Dynamics is assessed using long-term NDVI time series from MODIS (or the earlier AVHRR for extended records). Statistical trend analysis and trajectory classification of NDVI time series reveal whether land productivity is increasing, stable, or declining.",
  },
  {
    id: "sdg15-q21",
    sdgNumber: 15,
    question:
      "SDG Target 15.8 calls for measures to prevent the introduction and reduce the impact of what?",
    options: [
      "New agricultural technologies",
      "Invasive alien species on land and water ecosystems",
      "Foreign direct investment",
      "International tourists in protected areas",
    ],
    correctIndex: 1,
    explanation:
      "Target 15.8 calls for introducing measures to prevent the introduction and significantly reduce the impact of invasive alien species on land and water ecosystems, and to control or eradicate priority species. Invasive species are a leading cause of biodiversity loss.",
  },
  {
    id: "sdg15-q22",
    sdgNumber: 15,
    question:
      "Which of the following is NOT a sub-indicator of SDG Indicator 15.3.1 (proportion of degraded land)?",
    options: [
      "Land cover change",
      "Land productivity dynamics (from NDVI)",
      "Soil organic carbon stocks",
      "Ocean acidification level",
    ],
    correctIndex: 3,
    explanation:
      "SDG Indicator 15.3.1 uses three sub-indicators: (1) land cover change, (2) land productivity dynamics (from NDVI time series), and (3) soil organic carbon stocks. Ocean acidification is related to SDG 14 (Life Below Water), not SDG 15.",
  },
  {
    id: "sdg15-q23",
    sdgNumber: 15,
    question:
      "What approximate percentage of Earth's terrestrial surface is formally protected (national parks, reserves, etc.)?",
    options: ["About 5%", "About 17%", "About 35%", "About 50%"],
    correctIndex: 1,
    explanation:
      "As of 2024, approximately 17% of terrestrial and inland water areas are protected. The Kunming-Montreal Global Biodiversity Framework (2022) set a target of protecting 30% of land and ocean by 2030 (the '30x30' target).",
  },
];

// Combines every SDG-specific question list into the canonical bank used by quiz selection helpers.
export const allQuestions: QuizQuestion[] = [
  ...sdg6Questions,
  ...sdg9Questions,
  ...sdg11Questions,
  ...sdg12Questions,
  ...sdg13Questions,
  ...sdg15Questions,
];

// Shuffles an array in place with Fisher-Yates so question and option order can be randomized fairly.
function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Exposes the public helpers used to retrieve random quiz slices and bank summary statistics.

/**
 * Returns a randomised subset of quiz questions for the given SDG.
 *
 * 1. Filters by `sdgNumber`.
 * 2. Shuffles the filtered array (Fisher-Yates).
 * 3. For **each** question, shuffles the four options and updates
 *    `correctIndex` so it still points at the correct answer.
 * 4. Returns at most `count` questions (or all available if fewer).
 */
export function getQuizQuestions(
  sdgNumber: number,
  count: number
): QuizQuestion[] {
  // Clones the source questions so shuffling options never mutates the canonical bank.
  const pool: QuizQuestion[] = allQuestions
    .filter((q) => q.sdgNumber === sdgNumber)
    .map((q) => ({
      ...q,
      options: [...q.options] as [string, string, string, string],
    }));

  // Randomizes question order before any subset is selected.
  fisherYatesShuffle(pool);

  // Randomizes the option order for each question while preserving the correct answer mapping.
  for (const q of pool) {
    const correctAnswer = q.options[q.correctIndex];

    // Shuffles a stable index list first, then uses it to reorder the answer options safely.
    const indices = [0, 1, 2, 3];
    fisherYatesShuffle(indices);

    const shuffledOptions: [string, string, string, string] = [
      q.options[indices[0]],
      q.options[indices[1]],
      q.options[indices[2]],
      q.options[indices[3]],
    ];

    q.options = shuffledOptions;
    q.correctIndex = q.options.indexOf(correctAnswer);
  }

  return pool.slice(0, count);
}

/**
 * Returns all SDG numbers that have questions in the bank.
 */
export function getAvailableSDGs(): number[] {
  const sdgs = new Set(allQuestions.map((q) => q.sdgNumber));
  return [...sdgs].sort((a, b) => a - b);
}

/**
 * Returns the total number of questions for a given SDG.
 */
export function getQuestionCount(sdgNumber: number): number {
  return allQuestions.filter((q) => q.sdgNumber === sdgNumber).length;
}

/**
 * Returns the total number of questions across all SDGs.
 */
export function getTotalQuestionCount(): number {
  return allQuestions.length;
}
