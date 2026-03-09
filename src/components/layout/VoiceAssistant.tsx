"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppStore, SatelliteData } from "@/store/appStore";
import { usePointsStore } from "@/store/pointsStore";
import { usePostsStore } from "@/store/postsStore";
import { useContentVotesStore } from "@/store/contentVotesStore";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { computeMedals, SDG_VOTE_KEYS } from "@/lib/stats/medalComputation";

// Provides the low-level fuzzy matching helpers that turn imperfect speech
// transcripts into actionable commands.

/**
 * Computes Levenshtein edit distance so spoken words can match targets even
 * when speech recognition introduces small transcription errors.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

/**
 * Determines whether a recognized word is close enough to a target keyword to
 * count as a match for voice-command parsing.
 */
function fuzzyMatch(word: string, target: string): boolean {
  if (word === target) return true;
  if (word.length < 3) return false; // Very short words must match exactly to avoid false positives.
  // Allows substring matching only when the overlap is strong enough to avoid
  // accidental matches such as "go" matching "goals".
  if (word.includes(target) && target.length >= 3) return true;
  if (target.includes(word) && word.length >= target.length * 0.6) return true;
  return (
    levenshtein(word, target) <= Math.max(1, Math.floor(target.length / 4))
  );
}

/**
 * Checks whether any transcript token matches any keyword in the supplied set.
 */
function hasAny(words: string[], keywords: string[]): boolean {
  return keywords.some((kw) => words.some((w) => fuzzyMatch(w, kw)));
}

/**
 * Returns the first keyword that is present in the transcript according to the
 * fuzzy matcher.
 */
function extractMatch(words: string[], keywords: string[]): string | null {
  for (const kw of keywords) {
    if (words.some((w) => fuzzyMatch(w, kw))) return kw;
  }
  return null;
}

// Defines the fuzzy navigation targets that can be opened through speech.
interface NavTarget {
  route: string;
  label: string;
  keywords: string[];
}

const NAV_TARGETS: NavTarget[] = [
  {
    route: "/",
    label: "Dashboard",
    keywords: [
      "dashboard",
      "home",
      "main",
      "command",
      "cmd",
      "overview",
      "start",
      "index",
    ],
  },
  {
    route: "/tracking",
    label: "Tracking",
    keywords: [
      "tracking",
      "track",
      "orbit",
      "3d",
      "globe",
      "earth",
      "map",
      "satellite",
      "radar",
    ],
  },
  {
    route: "/sdg",
    label: "SDG Analysis",
    keywords: [
      "sdg",
      "goals",
      "sustainable",
      "development",
      "sustainability",
      "indicators",
      "analysis",
    ],
  },
  {
    route: "/community",
    label: "Community Hub",
    keywords: [
      "community",
      "posts",
      "forum",
      "discussion",
      "hub",
      "social",
      "chat",
      "talk",
      "sentiment",
    ],
  },
  {
    route: "/science",
    label: "Science Lab",
    keywords: [
      "science",
      "lab",
      "research",
      "articles",
      "papers",
      "library",
      "study",
      "academic",
      "journal",
    ],
  },
  {
    route: "/about",
    label: "About",
    keywords: ["about", "info", "information", "credits", "team"],
  },
  {
    route: "/profile",
    label: "Profile",
    keywords: [
      "profile",
      "settings",
      "account",
      "preference",
      "medals",
      "achievements",
      "character",
      "avatar",
    ],
  },
  {
    route: "/admin",
    label: "Admin",
    keywords: ["admin", "administration", "manage", "moderate", "moderation"],
  },
];

const NAV_VERBS = [
  "go",
  "open",
  "show",
  "navigate",
  "switch",
  "take",
  "bring",
  "visit",
  "view",
  "see",
  "display",
  "load",
  "launch",
  "enter",
];

function matchNavigation(
  transcript: string
): { route: string; label: string } | null {
  const t = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = t.split(/\s+/).filter(Boolean);

  // Allows a direct page keyword such as "tracking" to trigger navigation
  // even when the transcript does not include an explicit navigation verb.
  for (const target of NAV_TARGETS) {
    if (target.keywords.some((kw) => words.some((w) => fuzzyMatch(w, kw)))) {
      // Avoids misclassifying generic data-query words as navigation commands
      // unless the transcript also contains a navigation verb or a strongly
      // page-specific keyword.
      const hasVerb = hasAny(words, NAV_VERBS);
      const isPageKeyword = [
        "dashboard",
        "home",
        "tracking",
        "sdg",
        "community",
        "science",
        "lab",
        "about",
        "profile",
        "settings",
        "forum",
        "posts",
      ].some((pk) => words.some((w) => fuzzyMatch(w, pk)));
      if (hasVerb || isPageKeyword) {
        return { route: target.route, label: target.label };
      }
    }
  }

  return null;
}

// Describes the store data bundled into a single context object for command evaluation.
interface DataCtx {
  satellites: SatelliteData[];
  trackedSatellites: string[];
  userLocation: { lat: number; lng: number } | null;
  points: number;
  totalEarned: number;
  level: { level: number; name: string; nextThreshold: number | null };
  posts: {
    id: string;
    title: string;
    authorName: string;
    supportCount: number;
    opposeCount: number;
    commentCount: number;
    totalHotness: number;
    weeklyHotness: number;
    createdAt: string;
  }[];
  contentVoteCounts: Record<string, { support: number; oppose: number }>;
  userContentVotes: Record<string, "support" | "oppose">;
  sentimentTrend: number[] | null;
  isAuthenticated: boolean;
  userName: string | null;
  unreadNotifications: number;
  medals: {
    id: string;
    name: string;
    earned: boolean;
    progress: number;
    description: string;
  }[];
}

interface QueryResult {
  label: string;
  lines: string[];
}

type QueryMatcher = (
  words: string[],
  raw: string,
  ctx: DataCtx
) => QueryResult | null;

/* Matches questions about satellite inventory, identity, altitude, speed, and tracking state. */

const querySatelliteCount: QueryMatcher = (words, _raw, ctx) => {
  if (!hasAny(words, ["satellite", "satellites", "count", "total", "number"]))
    return null;
  if (hasAny(words, ["how", "many", "count", "number", "total"])) {
    const byType: Record<string, number> = {};
    ctx.satellites.forEach((s) => {
      byType[s.type] = (byType[s.type] || 0) + 1;
    });
    return {
      label: "Satellite Overview",
      lines: [
        `${ctx.satellites.length} satellites loaded`,
        ...Object.entries(byType).map(([type, count]) => `  ${type}: ${count}`),
      ],
    };
  }
  return null;
};

const queryTracked: QueryMatcher = (words, _raw, ctx) => {
  if (
    !hasAny(words, [
      "tracked",
      "tracking",
      "watch",
      "watching",
      "following",
      "followed",
      "monitored",
    ])
  )
    return null;
  if (ctx.trackedSatellites.length === 0) {
    return {
      label: "Tracked Satellites",
      lines: ["No satellites tracked yet", "Go to Tracking page to start"],
    };
  }
  const names = ctx.trackedSatellites
    .map((id) => ctx.satellites.find((s) => s.id === id)?.name)
    .filter(Boolean)
    .slice(0, 8);
  return {
    label: `Tracked (${ctx.trackedSatellites.length})`,
    lines: [
      `${ctx.trackedSatellites.length} satellite${ctx.trackedSatellites.length !== 1 ? "s" : ""} tracked`,
      ...names.map((n) => `  ${n}`),
      ...(ctx.trackedSatellites.length > 8
        ? [`  ...and ${ctx.trackedSatellites.length - 8} more`]
        : []),
    ],
  };
};

const queryDebris: QueryMatcher = (words, _raw, ctx) => {
  if (!hasAny(words, ["debris", "junk", "trash", "garbage", "waste"]))
    return null;
  const debris = ctx.satellites.filter((s) => s.type === "debris");
  return {
    label: "Space Debris",
    lines: [
      `${debris.length} debris objects tracked`,
      debris.length > 0
        ? `Average altitude: ${Math.round(debris.reduce((s, d) => s + d.alt, 0) / debris.length)} km`
        : "",
    ].filter(Boolean),
  };
};

const queryWeather: QueryMatcher = (words, _raw, ctx) => {
  if (!hasAny(words, ["weather", "meteorological", "meteo"])) return null;
  const weather = ctx.satellites.filter((s) => s.type === "weather");
  return {
    label: "Weather Satellites",
    lines: [
      `${weather.length} weather satellite${weather.length !== 1 ? "s" : ""}`,
      ...weather
        .slice(0, 5)
        .map((s) => `  ${s.name} — Alt: ${s.alt.toFixed(0)} km`),
      ...(weather.length > 5 ? [`  ...and ${weather.length - 5} more`] : []),
    ],
  };
};

const queryStation: QueryMatcher = (words, _raw, ctx) => {
  if (
    !hasAny(words, ["station", "stations", "iss", "zarya", "tiangong", "space"])
  )
    return null;
  if (!hasAny(words, ["station", "iss", "zarya", "tiangong"])) return null;
  const stations = ctx.satellites.filter((s) => s.type === "station");
  if (stations.length === 0) {
    return {
      label: "Space Stations",
      lines: ["No space stations in current data"],
    };
  }
  return {
    label: "Space Stations",
    lines: stations.map(
      (s) =>
        `${s.name} — Alt: ${s.alt.toFixed(0)} km, Lat: ${s.lat.toFixed(1)}°, Lng: ${s.lng.toFixed(1)}°, Speed: ${s.velocity.toFixed(1)} km/s`
    ),
  };
};

const querySatelliteByName: QueryMatcher = (words, raw, ctx) => {
  if (
    !hasAny(words, [
      "find",
      "search",
      "locate",
      "where",
      "position",
      "lookup",
      "look",
    ])
  )
    return null;
  // Removes generic search words so the remaining text can be matched against known satellite names.
  const cleaned = raw
    .toLowerCase()
    .replace(
      /\b(find|search|locate|where|is|the|satellite|position|of|lookup|look|up|for)\b/g,
      ""
    )
    .trim();
  if (!cleaned) return null;
  const match = ctx.satellites.find(
    (s) =>
      s.name.toLowerCase().includes(cleaned) ||
      cleaned.includes(s.name.toLowerCase())
  );
  if (match) {
    const isTracked = ctx.trackedSatellites.includes(match.id);
    return {
      label: match.name,
      lines: [
        `Type: ${match.type} | NORAD: ${match.noradId}`,
        `Alt: ${match.alt.toFixed(0)} km | Speed: ${match.velocity.toFixed(1)} km/s`,
        `Lat: ${match.lat.toFixed(2)}° | Lng: ${match.lng.toFixed(2)}°`,
        isTracked ? "Status: Tracked" : "Status: Not tracked",
      ],
    };
  }
  return {
    label: "Search",
    lines: [`No satellite found matching "${cleaned}"`],
  };
};

const queryHighestLowest: QueryMatcher = (words, _raw, ctx) => {
  if (ctx.satellites.length === 0) return null;
  if (hasAny(words, ["highest", "tallest", "farthest", "top"])) {
    const sorted = [...ctx.satellites].sort((a, b) => b.alt - a.alt);
    const top = sorted.slice(0, 3);
    return {
      label: "Highest Altitude",
      lines: top.map((s, i) => `${i + 1}. ${s.name} — ${s.alt.toFixed(0)} km`),
    };
  }
  if (hasAny(words, ["lowest", "closest", "nearest", "bottom"])) {
    if (
      hasAny(words, ["altitude", "orbit", "satellite", "satellites", "alt"])
    ) {
      const sorted = [...ctx.satellites]
        .filter((s) => s.alt > 0)
        .sort((a, b) => a.alt - b.alt);
      const bottom = sorted.slice(0, 3);
      return {
        label: "Lowest Altitude",
        lines: bottom.map(
          (s, i) => `${i + 1}. ${s.name} — ${s.alt.toFixed(0)} km`
        ),
      };
    }
  }
  if (hasAny(words, ["fastest", "speed", "fast", "velocity"])) {
    const sorted = [...ctx.satellites].sort((a, b) => b.velocity - a.velocity);
    const top = sorted.slice(0, 3);
    return {
      label: "Fastest Satellites",
      lines: top.map(
        (s, i) => `${i + 1}. ${s.name} — ${s.velocity.toFixed(2)} km/s`
      ),
    };
  }
  return null;
};

/* Answers progression questions about points, levels, and medal unlock progress. */

const queryPoints: QueryMatcher = (words, _raw, ctx) => {
  if (
    !hasAny(words, ["point", "points", "score", "balance", "currency", "coins"])
  )
    return null;
  return {
    label: "Points",
    lines: [
      `Current: ${ctx.points} pts`,
      `Total earned: ${ctx.totalEarned} pts`,
      `Level ${ctx.level.level}: ${ctx.level.name}`,
      ctx.level.nextThreshold
        ? `Next level at ${ctx.level.nextThreshold} pts (${ctx.level.nextThreshold - ctx.totalEarned} to go)`
        : "Max level reached!",
    ],
  };
};

const queryLevel: QueryMatcher = (words, _raw, ctx) => {
  if (
    !hasAny(words, ["level", "rank", "tier", "grade", "status", "progression"])
  )
    return null;
  if (hasAny(words, ["point", "points"])) return null; // defer to queryPoints
  const pct = ctx.level.nextThreshold
    ? Math.round((ctx.totalEarned / ctx.level.nextThreshold) * 100)
    : 100;
  return {
    label: `Level ${ctx.level.level} — ${ctx.level.name}`,
    lines: [
      `${ctx.totalEarned} total experience earned`,
      ctx.level.nextThreshold
        ? `Progress: ${pct}% toward Level ${ctx.level.level + 1}`
        : "You've reached the highest level!",
      `Current balance: ${ctx.points} pts`,
    ],
  };
};

const queryMedals: QueryMatcher = (words, _raw, ctx) => {
  if (
    !hasAny(words, [
      "medal",
      "medals",
      "achievement",
      "achievements",
      "badge",
      "badges",
      "award",
      "awards",
      "trophy",
    ])
  )
    return null;
  const earned = ctx.medals.filter((m) => m.earned);
  const inProgress = ctx.medals
    .filter((m) => !m.earned && m.progress > 0)
    .sort((a, b) => b.progress - a.progress);
  const lines = [`${earned.length}/${ctx.medals.length} medals earned`];
  if (earned.length > 0) {
    lines.push("Earned:");
    earned.forEach((m) => lines.push(`  ${m.name} — ${m.description}`));
  }
  if (inProgress.length > 0) {
    lines.push("In progress:");
    inProgress
      .slice(0, 3)
      .forEach((m) => lines.push(`  ${m.name} — ${m.progress}%`));
  }
  return { label: "Achievements", lines };
};

/* Answers questions about community activity, post counts, and trending discussions. */

const queryPosts: QueryMatcher = (words, _raw, ctx) => {
  if (
    !hasAny(words, [
      "post",
      "posts",
      "discussion",
      "discussions",
      "thread",
      "threads",
      "topic",
      "topics",
    ])
  )
    return null;
  if (ctx.posts.length === 0) {
    return {
      label: "Community Posts",
      lines: ["No posts yet — be the first!"],
    };
  }
  const totalComments = ctx.posts.reduce((s, p) => s + p.commentCount, 0);
  const totalVotes = ctx.posts.reduce(
    (s, p) => s + p.supportCount + p.opposeCount,
    0
  );
  return {
    label: "Community Posts",
    lines: [
      `${ctx.posts.length} post${ctx.posts.length !== 1 ? "s" : ""} total`,
      `${totalComments} comment${totalComments !== 1 ? "s" : ""}, ${totalVotes} vote${totalVotes !== 1 ? "s" : ""}`,
      "Hottest post:",
      `  "${ctx.posts.sort((a, b) => b.totalHotness - a.totalHotness)[0]?.title}"`,
      `  by ${ctx.posts.sort((a, b) => b.totalHotness - a.totalHotness)[0]?.authorName}`,
    ],
  };
};

const queryHottestPost: QueryMatcher = (words, _raw, ctx) => {
  if (!hasAny(words, ["hot", "hottest", "popular", "trending", "top", "best"]))
    return null;
  if (!hasAny(words, ["post", "posts", "thread", "discussion"])) return null;
  if (ctx.posts.length === 0) return null;

  const sorted = [...ctx.posts].sort((a, b) => b.totalHotness - a.totalHotness);
  const top3 = sorted.slice(0, 3);
  return {
    label: "Hottest Posts",
    lines: top3.map(
      (p, i) =>
        `${i + 1}. "${p.title}" — ${p.totalHotness} engagement (${p.supportCount}↑ ${p.opposeCount}↓ ${p.commentCount} replies)`
    ),
  };
};

/* Reports voting totals and sentiment trends derived from community reactions. */

const queryVotes: QueryMatcher = (words, _raw, ctx) => {
  if (
    !hasAny(words, ["vote", "votes", "voted", "voting", "opinion", "opinions"])
  )
    return null;
  const myVotes = Object.keys(ctx.userContentVotes).length;
  const allVotes = Object.values(ctx.contentVoteCounts).reduce(
    (s, c) => s + c.support + c.oppose,
    0
  );
  return {
    label: "Voting Stats",
    lines: [
      `Your votes: ${myVotes}`,
      `Total community votes: ${allVotes}`,
      ctx.sentimentTrend
        ? `Current sentiment: ${ctx.sentimentTrend[ctx.sentimentTrend.length - 1]?.toFixed(0) ?? "?"}% support`
        : "Sentiment trend not loaded",
    ],
  };
};

const querySentiment: QueryMatcher = (words, _raw, ctx) => {
  if (
    !hasAny(words, [
      "sentiment",
      "mood",
      "feeling",
      "approval",
      "support",
      "trend",
      "opinion",
    ])
  )
    return null;
  if (hasAny(words, ["vote", "voted"])) return null; // defer to queryVotes
  if (!ctx.sentimentTrend || ctx.sentimentTrend.length === 0) {
    return { label: "Sentiment", lines: ["Sentiment data not loaded yet"] };
  }
  const latest = ctx.sentimentTrend[ctx.sentimentTrend.length - 1];
  const oldest = ctx.sentimentTrend[0];
  const change = latest - oldest;
  const direction =
    change > 1 ? "trending up" : change < -1 ? "trending down" : "stable";
  return {
    label: "Community Sentiment",
    lines: [
      `Current support: ${latest.toFixed(1)}%`,
      `30-day start: ${oldest.toFixed(1)}%`,
      `Trend: ${direction} (${change >= 0 ? "+" : ""}${change.toFixed(1)}%)`,
    ],
  };
};

/* Interprets SDG-specific questions and maps them to the tracked sustainability topics. */

const querySDG: QueryMatcher = (words, raw, ctx) => {
  if (
    !hasAny(words, [
      "sdg",
      "sustainable",
      "development",
      "goal",
      "goals",
      "clean",
      "water",
      "climate",
      "forest",
      "city",
      "cities",
      "consumption",
      "production",
      "infrastructure",
    ])
  )
    return null;

  // Prefers a direct SDG number mention when the transcript includes one explicitly.
  const numMatch = raw.match(/\b(?:sdg\s*)?(\d{1,2})\b/i);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    const sdgMap: Record<number, string> = {
      6: "Clean Water & Sanitation",
      9: "Industry, Innovation & Infrastructure",
      11: "Sustainable Cities & Communities",
      12: "Responsible Consumption & Production",
      13: "Climate Action",
      15: "Life on Land",
    };
    if (sdgMap[num]) {
      const key = `sdg-${num}`;
      const votes = ctx.contentVoteCounts[key] || { support: 0, oppose: 0 };
      const total = votes.support + votes.oppose;
      const pct = total > 0 ? ((votes.support / total) * 100).toFixed(0) : "50";
      return {
        label: `SDG ${num}: ${sdgMap[num]}`,
        lines: [
          `Approval: ${pct}%`,
          `Votes: ${votes.support} support, ${votes.oppose} oppose (${total} total)`,
          "Go to SDG Analysis for detailed indicators",
        ],
      };
    }
  }

  // Falls back to a compact overview of all tracked SDGs when no specific goal number is requested.
  const sdgNumbers = [6, 9, 11, 12, 13, 15];
  const sdgNames: Record<number, string> = {
    6: "Clean Water",
    9: "Infrastructure",
    11: "Cities",
    12: "Consumption",
    13: "Climate",
    15: "Life on Land",
  };
  const lines: string[] = ["6 SDGs tracked via satellite data:"];
  sdgNumbers.forEach((n) => {
    const key = `sdg-${n}`;
    const votes = ctx.contentVoteCounts[key] || { support: 0, oppose: 0 };
    const total = votes.support + votes.oppose;
    const pct = total > 0 ? ((votes.support / total) * 100).toFixed(0) : "—";
    lines.push(`  SDG ${n} ${sdgNames[n]}: ${pct}% (${total} votes)`);
  });
  return { label: "SDG Overview", lines };
};

/* Answers inbox-style questions about unread notifications. */

const queryNotifications: QueryMatcher = (words, _raw, ctx) => {
  if (
    !hasAny(words, [
      "notification",
      "notifications",
      "alert",
      "alerts",
      "unread",
      "messages",
      "inbox",
      "bell",
    ])
  )
    return null;
  return {
    label: "Notifications",
    lines: [
      ctx.unreadNotifications > 0
        ? `${ctx.unreadNotifications} unread notification${ctx.unreadNotifications !== 1 ? "s" : ""}`
        : "No unread notifications",
    ],
  };
};

/* Handles identity and profile-related questions about the signed-in user. */

const queryWhoAmI: QueryMatcher = (words, _raw, ctx) => {
  if (!hasAny(words, ["who", "me", "my", "am"])) return null;
  if (!hasAny(words, ["am", "who", "name", "identity", "user"])) return null;
  if (!ctx.isAuthenticated) {
    return {
      label: "Identity",
      lines: ["Not signed in", "Sign in to access your profile"],
    };
  }
  return {
    label: "Your Profile",
    lines: [
      `Name: ${ctx.userName || "Observer"}`,
      `Level ${ctx.level.level}: ${ctx.level.name}`,
      `${ctx.points} pts | ${ctx.trackedSatellites.length} tracked | ${ctx.medals.filter((m) => m.earned).length} medals`,
    ],
  };
};

/* Handles questions about the viewer's current geolocation context. */

const queryLocation: QueryMatcher = (words, _raw, ctx) => {
  if (
    !hasAny(words, [
      "location",
      "gps",
      "coordinates",
      "coordinate",
      "position",
      "latitude",
      "longitude",
      "where",
    ])
  )
    return null;
  if (hasAny(words, ["satellite", "iss", "station", "find"])) return null; // Defers orbital position questions to the satellite-specific matchers above.
  if (!ctx.userLocation) {
    return {
      label: "Location",
      lines: ["Location not available", "Enable geolocation in your browser"],
    };
  }
  return {
    label: "Your Location",
    lines: [
      `Lat: ${ctx.userLocation.lat.toFixed(4)}°`,
      `Lng: ${ctx.userLocation.lng.toFixed(4)}°`,
    ],
  };
};

/* Handles general time and date requests without depending on application data. */

const queryTime: QueryMatcher = (words, _raw, _ctx) => {
  if (!hasAny(words, ["time", "clock", "utc", "date", "today", "now"]))
    return null;
  const now = new Date();
  return {
    label: "Current Time",
    lines: [
      `UTC: ${now.toISOString().substring(0, 19).replace("T", " ")}`,
      `Local: ${now.toLocaleTimeString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
      `Date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    ],
  };
};

/* Lists example phrases when the user asks what the assistant can do. */

const queryHelp: QueryMatcher = (words) => {
  if (
    !hasAny(words, [
      "help",
      "commands",
      "what",
      "can",
      "usage",
      "manual",
      "guide",
      "how",
    ])
  )
    return null;
  if (hasAny(words, ["many", "much", "fast", "high", "low"])) return null; // "how many" is a data query
  return {
    label: "Voice Commands",
    lines: [
      'Navigation: "go to tracking"',
      'Satellites: "how many satellites"',
      'Search: "find ISS"',
      'Stats: "highest altitude"',
      'Tracked: "what am I tracking"',
      'Points: "my points" / "my level"',
      'Medals: "my achievements"',
      'Posts: "hottest posts"',
      'SDG: "SDG 13 info"',
      'Votes: "my votes"',
      'Sentiment: "community sentiment"',
      'Time: "what time is it"',
    ],
  };
};

/* Orders the query matchers so more specific intents run before broader fallbacks. */
const ALL_MATCHERS: QueryMatcher[] = [
  queryHelp,
  queryWhoAmI,
  querySatelliteByName,
  queryHighestLowest,
  querySatelliteCount,
  queryTracked,
  queryDebris,
  queryWeather,
  queryStation,
  queryPoints,
  queryLevel,
  queryMedals,
  queryHottestPost,
  queryPosts,
  querySentiment,
  queryVotes,
  querySDG,
  queryNotifications,
  queryLocation,
  queryTime,
];

/* Renders the animated waveform bars that indicate active listening. */

function WaveformBars() {
  return (
    <div className="flex items-center gap-[3px] h-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: "var(--neon-cyan)" }}
          animate={{ height: [6, 16, 8, 18, 6] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* Renders the voice-assistant widget and wires transcript handling into navigation and query responses. */

export default function VoiceAssistant() {
  const router = useRouter();

  /* Reads the application state that voice queries can report back to the user. */
  const { satellites, trackedSatellites, userLocation } = useAppStore();
  const { points, totalEarned, level, fetchPoints } = usePointsStore();
  const { posts, fetchPosts } = usePostsStore();
  const {
    counts: contentVoteCounts,
    userVotes: userContentVotes,
    sentimentTrend,
    fetchVotes,
    fetchSentimentTrend,
  } = useContentVotesStore();
  const { isAuthenticated, user } = useAuthStore();
  const { unreadCount: unreadNotifications, fetchNotifications } =
    useNotificationStore();

  /* Refreshes user-specific datasets on mount so spoken answers are based on current store values. */
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPoints();
    fetchPosts();
    fetchVotes();
    fetchSentimentTrend();
    fetchNotifications();
  }, [
    isAuthenticated,
    fetchPoints,
    fetchPosts,
    fetchVotes,
    fetchSentimentTrend,
    fetchNotifications,
  ]);

  /* Computes derived medal progress so achievement-related voice queries can answer from current state. */
  const voteKeys = Object.keys(userContentVotes);
  const sdgVoteCount = SDG_VOTE_KEYS.filter((k) => voteKeys.includes(k)).length;
  const trackedNames = trackedSatellites
    .map((id) => satellites.find((s) => s.id === id)?.name ?? "")
    .filter(Boolean);
  const medals = computeMedals(
    trackedSatellites.length,
    trackedNames,
    voteKeys,
    sdgVoteCount
  );

  /* Tracks panel visibility, listening state, transcript text, and the latest assistant response. */
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<{
    type: "nav" | "data" | "error" | "idle";
    message: string;
    lines?: string[];
  } | null>(null);

  const recognitionRef = useRef<ReturnType<typeof Object> | null>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any).stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  /* Bundles current store state into one context object consumed by the query matchers. */
  const buildCtx = useCallback(
    (): DataCtx => ({
      satellites,
      trackedSatellites,
      userLocation,
      points,
      totalEarned,
      level,
      posts,
      contentVoteCounts,
      userContentVotes: userContentVotes,
      sentimentTrend,
      isAuthenticated,
      userName: user?.name ?? null,
      unreadNotifications,
      medals,
    }),
    [
      satellites,
      trackedSatellites,
      userLocation,
      points,
      totalEarned,
      level,
      posts,
      contentVoteCounts,
      userContentVotes,
      sentimentTrend,
      isAuthenticated,
      user,
      unreadNotifications,
      medals,
    ]
  );

  const processTranscript = useCallback(
    (text: string) => {
      setTranscript(text);
      const raw = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
      const words = raw.split(/\s+/).filter(Boolean);

      // Tries navigation intents first so page-opening commands are not mistaken for data queries.
      const nav = matchNavigation(text);
      if (nav) {
        setResult({
          type: "nav",
          message: `Navigating to ${nav.label}`,
          lines: [`Opening ${nav.label} page...`],
        });
        setTimeout(() => {
          router.push(nav.route);
          setTimeout(() => setOpen(false), 600);
        }, 400);
        return;
      }

      // Falls back to data queries when the transcript does not map to a navigation command.
      const ctx = buildCtx();
      for (const matcher of ALL_MATCHERS) {
        const qr = matcher(words, raw, ctx);
        if (qr) {
          setResult({ type: "data", message: qr.label, lines: qr.lines });
          return;
        }
      }

      // Returns a fallback message when no supported command pattern matches the transcript.
      setResult({
        type: "error",
        message: "Command not recognized",
        lines: [
          `Heard: "${text}"`,
          'Try: "go to tracking", "how many satellites",',
          '"my points", "find ISS", or "help"',
        ],
      });
    },
    [router, buildCtx]
  );

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognitionCtor =
      win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setResult({
        type: "error",
        message: "Not supported",
        lines: ["Voice recognition is not available in this browser"],
      });
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript;
      setTranscript(text);
      if (last.isFinal) {
        setListening(false);
        processTranscript(text);
      }
    };

    recognition.onerror = () => {
      setListening(false);
      setResult({
        type: "error",
        message: "Recognition failed",
        lines: ["Could not understand audio. Please try again."],
      });
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setTranscript("");
    setResult(null);
    setListening(true);
    recognition.start();
  }, [processTranscript]);

  useEffect(() => () => stopListening(), [stopListening]);

  const toggleOpen = () => {
    if (open) {
      stopListening();
      setOpen(false);
      setTranscript("");
      setResult(null);
    } else {
      setOpen(true);
    }
  };

  const resultColor =
    result?.type === "nav"
      ? "var(--neon-green)"
      : result?.type === "data"
        ? "var(--neon-cyan)"
        : result?.type === "error"
          ? "var(--neon-red)"
          : "var(--text-dim)";

  return (
    <div className="relative">
      {/* Opens the assistant panel and reflects whether listening is currently active. */}
      <button
        onClick={toggleOpen}
        className="relative w-7 h-7 rounded-full flex items-center justify-center transition-all"
        style={{
          background: open
            ? "var(--neon-cyan-dim)"
            : listening
              ? "rgba(255,58,92,0.15)"
              : "transparent",
          border: open
            ? "1px solid rgba(0,229,255,0.3)"
            : "1px solid transparent",
          color: open ? "var(--neon-cyan)" : "var(--text-dim)",
        }}
        title="Voice Assistant"
      >
        {listening ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </motion.div>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
        {open && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "1px solid var(--neon-cyan)" }}
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </button>

      {/* Hosts the full assistant interface, including controls, transcript, result, and hints. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] w-80 rounded-xl overflow-hidden z-50"
            style={{
              background:
                "linear-gradient(180deg, rgba(6,8,13,0.97) 0%, rgba(10,14,24,0.97) 100%)",
              border: "1px solid rgba(0,229,255,0.15)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.6), 0 0 1px rgba(0,229,255,0.3)",
            }}
          >
            {/* Displays the assistant title, status indicator, and close control. */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: listening
                      ? "var(--neon-green)"
                      : "var(--neon-cyan)",
                    boxShadow: listening
                      ? "0 0 6px var(--neon-green)"
                      : "0 0 6px var(--neon-cyan-glow)",
                  }}
                />
                <span
                  className="text-[13px] font-bold tracking-[0.15em] uppercase"
                  style={{
                    fontFamily: "var(--font-orbitron)",
                    color: "var(--text-primary)",
                  }}
                >
                  VOICE ASSISTANT
                </span>
              </div>
              <button
                onClick={toggleOpen}
                className="text-[12px] p-0.5 transition-colors"
                style={{ color: "var(--text-dim)" }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Contains the action button, live transcript, generated result, and example prompts. */}
            <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
              {/* Starts or stops speech recognition depending on the current listening state. */}
              <button
                onClick={listening ? stopListening : startListening}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-[12px] font-bold tracking-[0.12em] transition-all"
                style={{
                  background: listening
                    ? "rgba(255,58,92,0.1)"
                    : "var(--neon-cyan-dim)",
                  color: listening ? "var(--neon-red)" : "var(--neon-cyan)",
                  border: listening
                    ? "1px solid rgba(255,58,92,0.25)"
                    : "1px solid rgba(0,229,255,0.2)",
                }}
              >
                {listening ? (
                  <>
                    <WaveformBars />
                    <span>LISTENING...</span>
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    <span>TAP TO SPEAK</span>
                  </>
                )}
              </button>

              {/* Shows the latest recognized phrase so the user can verify what was heard. */}
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    className="text-[12px] font-bold tracking-[0.1em] uppercase mb-1"
                    style={{ color: "var(--text-dim)" }}
                  >
                    HEARD
                  </div>
                  <div
                    className="text-[13px]"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-fira-code)",
                    }}
                  >
                    &quot;{transcript}&quot;
                  </div>
                </motion.div>
              )}

              {/* Shows the interpreted command result or query answer. */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-3 py-2.5 rounded-lg"
                    style={{
                      background: `${resultColor}08`,
                      border: `1px solid ${resultColor}25`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {result.type === "nav" && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={resultColor}
                          strokeWidth="2"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      )}
                      {result.type === "data" && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={resultColor}
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      )}
                      {result.type === "error" && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={resultColor}
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      )}
                      <span
                        className="text-[12px] font-bold tracking-[0.1em] uppercase"
                        style={{
                          color: resultColor,
                          fontFamily: "var(--font-orbitron)",
                        }}
                      >
                        {result.message}
                      </span>
                    </div>
                    {result.lines && result.lines.length > 0 && (
                      <div className="space-y-0.5">
                        {result.lines.map((line, i) => (
                          <div
                            key={i}
                            className="text-[12px] leading-relaxed"
                            style={{
                              color: line.startsWith("  ")
                                ? "var(--text-secondary)"
                                : "var(--text-primary)",
                              fontFamily: "var(--font-fira-code)",
                              paddingLeft: line.startsWith("  ") ? "8px" : 0,
                              borderLeft: line.startsWith("  ")
                                ? "1px solid var(--border-subtle)"
                                : "none",
                            }}
                          >
                            {line.trimStart()}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Lists example commands when the assistant is idle. */}
              {!listening && !result && (
                <div className="space-y-2">
                  <div
                    className="text-[12px] font-bold tracking-[0.1em] uppercase"
                    style={{ color: "var(--text-dim)" }}
                  >
                    EXAMPLE COMMANDS
                  </div>
                  {[
                    {
                      cat: "NAV",
                      items: ['"Go to tracking"', '"Open science lab"'],
                    },
                    {
                      cat: "DATA",
                      items: ['"How many satellites"', '"Find ISS"'],
                    },
                    {
                      cat: "STATUS",
                      items: ['"My points"', '"My achievements"'],
                    },
                    {
                      cat: "INFO",
                      items: ['"Hottest posts"', '"SDG 13"', '"Help"'],
                    },
                  ].map((group) => (
                    <div key={group.cat}>
                      <div
                        className="text-[11px] font-bold tracking-[0.15em] uppercase mb-0.5"
                        style={{
                          color: "var(--neon-cyan)",
                          fontFamily: "var(--font-orbitron)",
                        }}
                      >
                        {group.cat}
                      </div>
                      {group.items.map((cmd) => (
                        <div
                          key={cmd}
                          className="text-[12px] pl-2"
                          style={{
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {cmd}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
