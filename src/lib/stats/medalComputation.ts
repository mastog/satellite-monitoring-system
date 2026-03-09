// Defines the medal record as stored in the medal catalog.
export interface MedalDef {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// Defines the computed medal record returned to the profile and dashboard UIs.
export interface Medal extends MedalDef {
  earned: boolean;
  progress: number;
}

// Stores the static medal catalog used when computing progress and earned states.
export const MEDAL_DEFS: MedalDef[] = [
  {
    id: "1",
    name: "First Contact",
    icon: "◎",
    description: "Track your first satellite",
  },
  {
    id: "2",
    name: "Night Watcher",
    icon: "☽",
    description: "Track 5 satellites",
  },
  {
    id: "7",
    name: "Constellation",
    icon: "✦",
    description: "Track 10 satellites simultaneously",
  },
  {
    id: "8",
    name: "Orbital Fleet",
    icon: "▲",
    description: "Track 20 satellites simultaneously",
  },
  { id: "4", name: "ISS Spotter", icon: "⌖", description: "Track the ISS" },
  {
    id: "9",
    name: "Storm Watcher",
    icon: "⚡",
    description: "Track a weather satellite",
  },
  {
    id: "10",
    name: "Navigator",
    icon: "◇",
    description: "Track a navigation satellite",
  },
  {
    id: "5",
    name: "SDG Champion",
    icon: "⊕",
    description: "Vote on all 6 SDG topics",
  },
  {
    id: "3",
    name: "Data Scholar",
    icon: "▦",
    description: "Vote on 10 articles or papers",
  },
  {
    id: "6",
    name: "Community Voice",
    icon: "⟐",
    description: "Cast 20 community votes",
  },
  {
    id: "11",
    name: "Indicator Analyst",
    icon: "⊙",
    description: "Vote on 5 SDG indicators",
  },
  {
    id: "12",
    name: "Megaphone",
    icon: "◈",
    description: "Cast 50 votes total",
  },
];

// Lists the six SDG topic vote keys required for the SDG Champion medal.
const SDG_VOTE_KEYS = [
  "sdg-6",
  "sdg-9",
  "sdg-11",
  "sdg-12",
  "sdg-13",
  "sdg-15",
];

// Computes earned state and progress percentage for every medal based on the
// user's current tracking and voting activity.
export function computeMedals(
  trackedCount: number,
  trackedSatelliteNames: string[],
  contentVoteKeys: string[],
  sdgVoteCount: number
): Medal[] {
  const articleOrPaperVotes = contentVoteKeys.filter(
    (k) => k.startsWith("article-") || k.startsWith("paper-")
  ).length;

  const hasISS = trackedSatelliteNames.some(
    (name) =>
      name.toUpperCase().includes("ISS") || name.toUpperCase().includes("ZARYA")
  );

  const hasWeatherSat = trackedSatelliteNames.some((name) =>
    /NOAA|GOES|METOP|FENGYUN|HIMAWARI/i.test(name)
  );

  const hasGPS = trackedSatelliteNames.some((name) =>
    /GPS|NAVSTAR|GLONASS|GALILEO|BEIDOU/i.test(name)
  );

  const totalVotes = contentVoteKeys.length;

  // Counts indicator votes by distinguishing them from top-level SDG topic
  // votes based on the presence of the extra indicator segment.
  const indicatorVotes = contentVoteKeys.filter((k) => {
    if (!k.startsWith("sdg-")) return false;
    // Topic votes are "sdg-{N}", while indicator votes append an extra identifier.
    const afterPrefix = k.slice(4); // remove "sdg-"
    return afterPrefix.includes("-"); // has another dash = indicator
  }).length;

  return [
    // Computes medals tied to the user's tracked-satellite activity.
    {
      id: "1",
      name: "First Contact",
      icon: "◎",
      description: "Track your first satellite",
      earned: trackedCount >= 1,
      progress: Math.min(100, trackedCount >= 1 ? 100 : 0),
    },
    {
      id: "2",
      name: "Night Watcher",
      icon: "☽",
      description: "Track 5 satellites",
      earned: trackedCount >= 5,
      progress: Math.min(100, Math.round((trackedCount / 5) * 100)),
    },
    {
      id: "7",
      name: "Constellation",
      icon: "✦",
      description: "Track 10 satellites simultaneously",
      earned: trackedCount >= 10,
      progress: Math.min(100, Math.round((trackedCount / 10) * 100)),
    },
    {
      id: "8",
      name: "Orbital Fleet",
      icon: "▲",
      description: "Track 20 satellites simultaneously",
      earned: trackedCount >= 20,
      progress: Math.min(100, Math.round((trackedCount / 20) * 100)),
    },

    // Computes medals tied to tracking notable classes of satellites.
    {
      id: "4",
      name: "ISS Spotter",
      icon: "⌖",
      description: "Track the ISS",
      earned: hasISS,
      progress: hasISS ? 100 : 0,
    },
    {
      id: "9",
      name: "Storm Watcher",
      icon: "⚡",
      description: "Track a weather satellite",
      earned: hasWeatherSat,
      progress: hasWeatherSat ? 100 : 0,
    },
    {
      id: "10",
      name: "Navigator",
      icon: "◇",
      description: "Track a navigation satellite",
      earned: hasGPS,
      progress: hasGPS ? 100 : 0,
    },

    // Computes medals tied to voting breadth and total participation.
    {
      id: "5",
      name: "SDG Champion",
      icon: "⊕",
      description: "Vote on all 6 SDG topics",
      earned: sdgVoteCount >= 6,
      progress: Math.min(100, Math.round((sdgVoteCount / 6) * 100)),
    },
    {
      id: "3",
      name: "Data Scholar",
      icon: "▦",
      description: "Vote on 10 articles or papers",
      earned: articleOrPaperVotes >= 10,
      progress: Math.min(100, Math.round((articleOrPaperVotes / 10) * 100)),
    },
    {
      id: "6",
      name: "Community Voice",
      icon: "⟐",
      description: "Cast 20 community votes",
      earned: totalVotes >= 20,
      progress: Math.min(100, Math.round((totalVotes / 20) * 100)),
    },
    {
      id: "11",
      name: "Indicator Analyst",
      icon: "⊙",
      description: "Vote on 5 SDG indicators",
      earned: indicatorVotes >= 5,
      progress: Math.min(100, Math.round((indicatorVotes / 5) * 100)),
    },
    {
      id: "12",
      name: "Megaphone",
      icon: "◈",
      description: "Cast 50 votes total",
      earned: totalVotes >= 50,
      progress: Math.min(100, Math.round((totalVotes / 50) * 100)),
    },
  ];
}

export { SDG_VOTE_KEYS };
