export const ECO_ROLES = [
  "monitoring",
  "policy",
  "funding",
] as const;

export type EcoRole = (typeof ECO_ROLES)[number];

export interface EnvironmentState {
  treasury: number;
  publicTrust: number;
  airQuality: number;
  waterSecurity: number;
  biodiversity: number;
  heatRisk: number;
}

export interface MonitoringAction {
  dossierId: string;
  focus: "air" | "water" | "forest" | "heat";
  scanIntensity: 1 | 2 | 3;
  verificationDepth: 1 | 2 | 3;
  evidenceTone: "cautious" | "assertive";
  releaseWindow: "immediate" | "staged";
  fieldRelay: boolean;
}

export interface PolicyAction {
  policyId: string;
  emphasis: "compliance" | "incentive" | "emergency";
  intensity: 1 | 2 | 3;
  publicMessage: "transparent" | "urgent";
  coalitionTarget: "industry" | "municipal" | "public";
  rollout: "pilot" | "regional" | "national";
  legalShield: boolean;
}

export interface FundingAction {
  rapid: number;
  resilience: number;
  science: number;
  community: number;
  reserveRelease: boolean;
  releaseMode: "frontload" | "balanced" | "guarded";
  oversight: "tight" | "balanced" | "fast";
  externalMatch: boolean;
}

export interface RoundActionBundle {
  monitoring?: MonitoringAction;
  policy?: PolicyAction;
  funding?: FundingAction;
}

export interface ScenarioCard {
  id: string;
  title: string;
  summary: string;
  dossierPrompt: string;
  primaryVector: "air" | "water" | "forest" | "heat";
  policyTrack: "emissions" | "watershed" | "habitat" | "heat";
  fundingTrack: "rapid" | "resilience" | "science" | "community";
  backdrop: {
    skyTop: string;
    skyBottom: string;
    haze: string;
    ground: string;
  };
}

export interface RoundResolution {
  nextState: EnvironmentState;
  log: string[];
  dossierMomentum: number;
  roundGrade: "fragile" | "stabilizing" | "surge";
  finished: boolean;
  winner: string | null;
}

// Lists the rotating crisis cards used by each resolved quarter.
export const SCENARIOS: ScenarioCard[] = [
  {
    id: "delta-flood",
    title: "Delta Floodplain Surge",
    summary:
      "Seasonal rainfall has crossed containment lines and the river delta is forcing contaminants into drinking infrastructure.",
    dossierPrompt:
      "Triangulate flood spread, contamination drift, and settlement exposure before the river authority closes the gates.",
    primaryVector: "water",
    policyTrack: "watershed",
    fundingTrack: "rapid",
    backdrop: {
      skyTop: "#7898ad",
      skyBottom: "#d4e0e5",
      haze: "rgba(180, 208, 222, 0.42)",
      ground: "#4f6771",
    },
  },
  {
    id: "summer-heat",
    title: "Urban Heat Cascade",
    summary:
      "A stagnant upper-air dome is stacking heat across dense districts, with hospitals requesting grid protection and cooling relief.",
    dossierPrompt:
      "Trace thermal spikes, identify cooling shadows, and verify which districts will breach emergency thresholds first.",
    primaryVector: "heat",
    policyTrack: "heat",
    fundingTrack: "community",
    backdrop: {
      skyTop: "#b7755d",
      skyBottom: "#f6d3a5",
      haze: "rgba(247, 182, 112, 0.34)",
      ground: "#806348",
    },
  },
  {
    id: "forest-breach",
    title: "Protected Forest Breach",
    summary:
      "Illegal clearing is accelerating at the edge of a protected corridor while supply-chain monitors and local councils disagree on the extent.",
    dossierPrompt:
      "Lock the active clearings, confirm access roads, and determine whether the corridor is still contiguous this round.",
    primaryVector: "forest",
    policyTrack: "habitat",
    fundingTrack: "science",
    backdrop: {
      skyTop: "#4d5b4c",
      skyBottom: "#a7b98f",
      haze: "rgba(146, 186, 118, 0.24)",
      ground: "#45513d",
    },
  },
  {
    id: "industrial-plume",
    title: "Industrial Plume Event",
    summary:
      "A cluster of plants is venting beyond permit estimates after a maintenance shutdown, and the air corridor is drifting toward schools.",
    dossierPrompt:
      "Verify plume persistence, downwind spread, and whether the industrial coalition has understated particulate concentration.",
    primaryVector: "air",
    policyTrack: "emissions",
    fundingTrack: "resilience",
    backdrop: {
      skyTop: "#60646f",
      skyBottom: "#c8ced7",
      haze: "rgba(145, 153, 164, 0.35)",
      ground: "#5f5b5a",
    },
  },
];

// Defines the evidence files available to the monitoring role.
export const MONITORING_DOSSIERS = [
  {
    id: "spectral-scan",
    title: "Spectral Scan",
    detail: "Pull a wide-angle multispectral sweep and prioritize confident anomaly verification.",
  },
  {
    id: "thermal-pass",
    title: "Thermal Pass",
    detail: "Focus on active hotspots, heat signatures, and late-phase spillover into populated blocks.",
  },
  {
    id: "field-brief",
    title: "Field Brief",
    detail: "Blend satellites with local spot checks to turn raw detections into reliable evidence packs.",
  },
] as const;

// Defines the policy instruments available to the policy role.
export const POLICY_FILES = [
  {
    id: "compliance-order",
    title: "Compliance Order",
    detail: "Immediate directives with hard enforcement. Strong impact, stronger political backlash.",
  },
  {
    id: "incentive-bundle",
    title: "Incentive Bundle",
    detail: "Carrots before sticks. Slower to bite, safer for trust and coalition-building.",
  },
  {
    id: "emergency-powers",
    title: "Emergency Powers",
    detail: "Fast emergency authority. Powerful in crisis, expensive in public trust if misused.",
  },
] as const;

// Defines the budget tracks available to the funding role.
export const FUNDING_FILES = [
  {
    id: "rapid",
    title: "Rapid Response",
    detail: "Short-horizon emergency action, logistics, and local containment.",
  },
  {
    id: "resilience",
    title: "Resilience Works",
    detail: "Infrastructure upgrades, flood barriers, cooling corridors, and restoration hardening.",
  },
  {
    id: "science",
    title: "Science Programs",
    detail: "Monitoring systems, sensor maintenance, analysis staff, and evidence quality.",
  },
  {
    id: "community",
    title: "Community Relief",
    detail: "Household relief, relocation support, public-health campaigns, and citizen trust repair.",
  },
] as const;

export function clampMetric(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

export function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function scenarioForRound(seed: number, round: number) {
  return SCENARIOS[(seed + round - 1) % SCENARIOS.length];
}

function trackBonus<T extends string>(match: T, expected: T, base: number) {
  return match === expected ? base : 0;
}

// Resolves one simultaneous-action quarter into updated room metrics.
export function resolveRound(
  state: EnvironmentState,
  scenario: ScenarioCard,
  actions: RoundActionBundle,
  currentRound: number,
  maxRounds: number
): RoundResolution {
  const next = { ...state };
  const log: string[] = [];

  const monitoring = actions.monitoring;
  const policy = actions.policy;
  const funding = actions.funding;

  const evidenceScore =
    (monitoring?.scanIntensity ?? 1) * 10 +
    (monitoring?.verificationDepth ?? 1) * 5 +
    trackBonus(monitoring?.focus ?? "air", scenario.primaryVector, 14) +
    (monitoring?.evidenceTone === "assertive" ? 3 : 0) +
    (monitoring?.fieldRelay ? 4 : 0) +
    (monitoring?.releaseWindow === "immediate" ? 2 : 0);

  const policyScore =
    (policy?.intensity ?? 1) * 9 +
    trackBonus(
      policy?.policyId ?? "compliance-order",
      scenario.policyTrack === "emissions"
        ? "compliance-order"
        : scenario.policyTrack === "watershed"
          ? "emergency-powers"
          : scenario.policyTrack === "habitat"
            ? "incentive-bundle"
            : "emergency-powers",
      11
    ) +
    trackBonus(
      policy?.emphasis ?? "compliance",
      scenario.policyTrack === "heat" ? "emergency" : "compliance",
      7
    ) +
    (policy?.legalShield ? 5 : 0) +
    (policy?.rollout === "national" ? 4 : policy?.rollout === "regional" ? 2 : 0) +
    (policy?.coalitionTarget === "public" && policy?.publicMessage === "transparent" ? 3 : 0);

  const fundingTotal =
    (funding?.rapid ?? 25) +
    (funding?.resilience ?? 25) +
    (funding?.science ?? 25) +
    (funding?.community ?? 25);

  const normalizedFunding =
    fundingTotal > 0
      ? {
          rapid: (funding?.rapid ?? 25) / fundingTotal,
          resilience: (funding?.resilience ?? 25) / fundingTotal,
          science: (funding?.science ?? 25) / fundingTotal,
          community: (funding?.community ?? 25) / fundingTotal,
        }
      : { rapid: 0.25, resilience: 0.25, science: 0.25, community: 0.25 };

  const fundingScore =
    Math.round(normalizedFunding[scenario.fundingTrack] * 48) +
    ((funding?.reserveRelease ?? false) ? 5 : 0) +
    (funding?.releaseMode === "frontload" ? 4 : funding?.releaseMode === "guarded" ? -1 : 2) +
    (funding?.oversight === "tight" ? 2 : funding?.oversight === "fast" ? 1 : 3) +
    (funding?.externalMatch ? 4 : 0);

  const coordination = Math.round((evidenceScore + policyScore + fundingScore) / 3);
  const dossierMomentum = Math.max(
    -18,
    Math.min(24, Math.round((coordination - 26) / 2))
  );

  next.treasury = clampMetric(
    next.treasury -
      Math.round(policyScore * 0.18) -
      Math.round(fundingTotal * 0.22) +
      (funding?.reserveRelease ? -8 : 0) +
      (funding?.externalMatch ? 3 : 0)
  );

  next.publicTrust = clampMetric(
    next.publicTrust +
      Math.round(coordination * 0.08) +
      (policy?.publicMessage === "transparent" ? 4 : -2) +
      (monitoring?.evidenceTone === "assertive" ? -1 : 2) +
      (policy?.coalitionTarget === "public" ? 2 : 0) +
      (policy?.rollout === "national" && policy?.publicMessage === "urgent" ? -3 : 0)
  );

  next.airQuality = clampMetric(
    next.airQuality +
      (scenario.primaryVector === "air" ? dossierMomentum : Math.round(policyScore * 0.06))
  );
  next.waterSecurity = clampMetric(
    next.waterSecurity +
      (scenario.primaryVector === "water" ? dossierMomentum : Math.round(fundingScore * 0.04))
  );
  next.biodiversity = clampMetric(
    next.biodiversity +
      (scenario.primaryVector === "forest" ? dossierMomentum : Math.round(normalizedFunding.resilience * 10))
  );
  next.heatRisk = clampMetric(
    next.heatRisk -
      (scenario.primaryVector === "heat" ? dossierMomentum : Math.round(policyScore * 0.05))
  );

  log.push(
    `${scenario.title} was addressed with a coordination score of ${coordination}.`
  );
  log.push(
    `Monitoring assembled ${monitoring?.focus ?? "air"} evidence at intensity ${monitoring?.scanIntensity ?? 1} with verification depth ${monitoring?.verificationDepth ?? 1}.`
  );
  log.push(
    `Policy deployed ${policy?.policyId ?? "compliance-order"} with ${policy?.emphasis ?? "compliance"} emphasis and ${policy?.rollout ?? "regional"} rollout.`
  );
  log.push(
    `Funding weighted ${scenario.fundingTrack} spending at ${Math.round(
      normalizedFunding[scenario.fundingTrack] * 100
    )}% of the round package under ${funding?.releaseMode ?? "balanced"} release mode.`
  );

  const stabilityAverage = Math.round(
    (next.airQuality +
      next.waterSecurity +
      next.biodiversity +
      next.publicTrust +
      next.treasury +
      (100 - next.heatRisk)) /
      6
  );

  const finished =
    currentRound >= maxRounds ||
    next.publicTrust <= 8 ||
    next.treasury <= 6 ||
    next.airQuality <= 8 ||
    next.waterSecurity <= 8 ||
    next.biodiversity <= 8 ||
    next.heatRisk >= 94;

  const winner = finished
    ? stabilityAverage >= 62
      ? "stabilized"
      : "strained"
    : null;

  return {
    nextState: next,
    log,
    dossierMomentum,
    roundGrade:
      coordination >= 44 ? "surge" : coordination >= 28 ? "stabilizing" : "fragile",
    finished,
    winner,
  };
}
