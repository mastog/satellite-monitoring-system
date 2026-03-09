import type { WeaponId } from "@/lib/game/weapons";

export interface SkillKnowledge {
  title: string;
  sdg: string;
  satellite: string;
  insight: string;
}

export const SKILL_KNOWLEDGE: Record<WeaponId, SkillKnowledge> = {
  pulse: {
    title: "Nuclear Monitoring Chain",
    sdg: "SDG 16 Peace, Justice and Strong Institutions",
    satellite: "Sentinel-2",
    insight:
      "Multi-stage spectral analysis helps track blast scars and post-event urban surface changes.",
  },
  flak: {
    title: "Dense Urban Hazard Mapping",
    sdg: "SDG 11 Sustainable Cities and Communities",
    satellite: "WorldView-3",
    insight:
      "High-resolution bursts of imagery are essential for block-level damage assessment in dense districts.",
  },
  ricochet: {
    title: "Network Cascade Risk",
    sdg: "SDG 9 Industry, Innovation and Infrastructure",
    satellite: "Landsat 9",
    insight:
      "Infrastructure failures often propagate across connected corridors instead of staying at one point.",
  },
  boomerang: {
    title: "Revisit Orbit Advantage",
    sdg: "SDG 13 Climate Action",
    satellite: "Sentinel-1",
    insight:
      "Repeat-pass observations reveal temporal trends that one-off captures cannot provide.",
  },
  stinger: {
    title: "Rapid Alert Telemetry",
    sdg: "SDG 3 Good Health and Well-being",
    satellite: "NOAA JPSS",
    insight:
      "Fast low-latency streams are crucial for early warning systems during fast-moving hazards.",
  },
  frag: {
    title: "Fragmented Impact Zones",
    sdg: "SDG 15 Life on Land",
    satellite: "MODIS",
    insight:
      "Scattered disturbance signatures can indicate ecosystem stress long before full collapse appears.",
  },
  siege: {
    title: "Shockwave Footprint Detection",
    sdg: "SDG 11 Sustainable Cities and Communities",
    satellite: "Gaofen",
    insight:
      "Large radial disturbance fields are measurable via surface albedo and debris radius changes.",
  },
  orbital: {
    title: "Orbital Debris Shielding",
    sdg: "SDG 12 Responsible Consumption and Production",
    satellite: "ESA Space Debris Trackers",
    insight:
      "Active shielding and debris cataloging reduce long-term orbital pollution risk.",
  },
  laser: {
    title: "Targeted Lidar Profiling",
    sdg: "SDG 6 Clean Water and Sanitation",
    satellite: "ICESat-2",
    insight:
      "Precision beam sampling supports elevation-based water and cryosphere monitoring.",
  },
  missile: {
    title: "Guided Response Routing",
    sdg: "SDG 2 Zero Hunger",
    satellite: "SMAP",
    insight:
      "Adaptive targeting of drought hotspots improves resource delivery efficiency.",
  },
  frost: {
    title: "Cryosphere Stability Tracking",
    sdg: "SDG 13 Climate Action",
    satellite: "CryoSat-2",
    insight:
      "Ice thickness change rates are a leading indicator for regional climate acceleration.",
  },
  drone: {
    title: "Autonomous Swarm Observation",
    sdg: "SDG 9 Industry, Innovation and Infrastructure",
    satellite: "PlanetScope",
    insight:
      "Distributed sensing constellations trade single-platform power for persistent coverage.",
  },
  flame: {
    title: "Wildfire Thermal Fronts",
    sdg: "SDG 15 Life on Land",
    satellite: "VIIRS",
    insight:
      "Persistent thermal signatures map advancing burn fronts and post-fire heat retention.",
  },
  emp: {
    title: "Grid Disruption Mapping",
    sdg: "SDG 7 Affordable and Clean Energy",
    satellite: "Sentinel-5P",
    insight:
      "Atmospheric and night-light anomalies can reveal broad infrastructure outages.",
  },
  gravity: {
    title: "Mass Movement Convergence",
    sdg: "SDG 11 Sustainable Cities and Communities",
    satellite: "InSAR Missions",
    insight:
      "Ground deformation fields identify zones where material flow converges before collapse.",
  },
  lightning: {
    title: "Storm Chain Dynamics",
    sdg: "SDG 13 Climate Action",
    satellite: "GOES",
    insight:
      "Linked convective cells can propagate severe weather across wide regions.",
  },
  nova: {
    title: "Radial Blast Pattern Analytics",
    sdg: "SDG 16 Peace, Justice and Strong Institutions",
    satellite: "Commercial SAR",
    insight:
      "Radial intensity gradients help distinguish impact epicenters from secondary debris fields.",
  },
  harpoon: {
    title: "Orbital Capture and Tug",
    sdg: "SDG 12 Responsible Consumption and Production",
    satellite: "Active Debris Removal Missions",
    insight:
      "Capture-and-retrieve maneuvers are central to long-term sustainable orbit operations.",
  },
  anchor: {
    title: "Temporal Baseline Recovery",
    sdg: "SDG 13 Climate Action",
    satellite: "Copernicus Time-Series",
    insight:
      "Historical baselines are essential for quantifying abnormal change after extreme events.",
  },
  lattice: {
    title: "Sensor Grid Correlation",
    sdg: "SDG 9 Industry, Innovation and Infrastructure",
    satellite: "GNSS + Earth Observation Fusion",
    insight:
      "Cross-linked node networks improve resilience and reduce blind spots in monitoring systems.",
  },
  rebound: {
    title: "Pursuit Field Guidance",
    sdg: "SDG 3 Good Health and Well-being",
    satellite: "Disaster Response Constellations",
    insight:
      "Persistent tracking of moving targets improves follow-up interventions.",
  },
  vortex: {
    title: "Cyclonic Core Mapping",
    sdg: "SDG 13 Climate Action",
    satellite: "Himawari",
    insight:
      "Rotational core behavior is a key proxy for storm intensification risk.",
  },
  beam: {
    title: "Long-Range Precision Transect",
    sdg: "SDG 6 Clean Water and Sanitation",
    satellite: "SWOT",
    insight:
      "Long-baseline measurements reveal basin-scale hydrological continuity.",
  },
  chrono: {
    title: "Time-Dilation Scenario Modeling",
    sdg: "SDG 11 Sustainable Cities and Communities",
    satellite: "Urban Digital Twin Pipelines",
    insight:
      "Scenario playback against archived Earth observation improves emergency planning.",
  },
  prism: {
    title: "Multi-Spectral Refraction Fusion",
    sdg: "SDG 14 Life Below Water",
    satellite: "Hyperspectral Missions",
    insight:
      "Spectral unmixing enables finer discrimination of water quality and marine habitat stress.",
  },
};
