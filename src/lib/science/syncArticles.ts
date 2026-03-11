import { prisma } from "@/lib/prisma";
import { autoTagText } from "@/lib/posts/autoTag";
import type { Article, Paper } from "@/lib/content/data";
import {
  isDailyRefreshDue,
  STATIC_REFRESH_HOUR_UTC,
} from "@/lib/serverRefresh";

const ARTICLE_RETENTION_DAYS = 14;
const ARTICLE_MAX_TOTAL = 18;
const ARTICLE_MAX_PER_CATEGORY = 5;
const ARTICLE_THEME_KEYWORDS = [
  "satellite",
  "space",
  "orbit",
  "orbital",
  "earth observation",
  "observation",
  "remote sensing",
  "sentinel",
  "landsat",
  "modis",
  "viirs",
  "sar",
  "radar",
  "imagery",
  "telemetry",
  "constellation",
  "sdg",
  "sustainable",
  "sustainability",
  "climate",
  "environment",
  "emissions",
  "carbon",
  "biodiversity",
  "water",
  "agriculture",
  "disaster",
  "infrastructure",
  "innovation",
];

// Defines helper utilities used to normalize external article and paper data
// before it is cached for the science views.

/**
 * Truncates text to the requested length while preferring a sentence or word
 * boundary so cached summaries remain readable instead of cutting mid-token.
 */
function truncateWithEllipsis(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  // Prefers a sentence boundary when one exists far enough into the slice.
  const slice = text.slice(0, maxLen);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  if (sentenceEnd > maxLen * 0.5) {
    // Keeps the sentence-ending punctuation before adding an ellipsis.
    return slice.slice(0, sentenceEnd + 1).trimEnd() + "...";
  }
  // Falls back to the last word boundary when no useful sentence break exists.
  const wordEnd = slice.lastIndexOf(" ");
  if (wordEnd > maxLen * 0.5) {
    return slice.slice(0, wordEnd).trimEnd() + "...";
  }
  return slice.trimEnd() + "...";
}

/**
 * Converts HTML fragments into plain text by stripping markup, decoding common
 * entities, and collapsing whitespace.
 */
function stripHtml(html: string): string {
  return (
    html
      // Removes HTML tags before further cleanup.
      .replace(/<[^>]+>/g, " ")
      // Decodes decimal numeric entities such as &#160; or &#8230;.
      .replace(/&#(\d+);/g, (_, code) =>
        String.fromCharCode(parseInt(code, 10))
      )
      // Decodes hexadecimal numeric entities such as &#x00A0;.
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      // Decodes the named entities commonly found in RSS content.
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&hellip;/g, "...")
      .replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–")
      .replace(/&rsquo;/g, "\u2019")
      .replace(/&lsquo;/g, "\u2018")
      .replace(/&rdquo;/g, "\u201D")
      .replace(/&ldquo;/g, "\u201C")
      // Removes bracketed truncation markers left by some feeds.
      .replace(/\[…\]/g, "...")
      .replace(/\[\.\.\.\]/g, "...")
      // Normalizes repeated whitespace into single spaces.
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Cleans paper abstracts by removing LaTeX fragments and presentation noise so
 * cached paper summaries are readable inside the application.
 */
function cleanPaperAbstract(raw: string): string {
  const cleaned = raw
    // Replaces inline LaTeX formulas with a neutral placeholder.
    .replace(/\$[^$]{1,200}\$/g, "[formula]")
    // Removes LaTeX commands that are not useful in plain-text summaries.
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, "")
    // Removes standalone backslash commands such as \alpha or \beta.
    .replace(/\\[a-zA-Z]+/g, "")
    // Removes leftover brace characters after command cleanup.
    .replace(/[{}]/g, "")
    // Collapses repeated placeholders so dense equations do not dominate the text.
    .replace(/(\[formula\]\s*){2,}/g, "[formula] ")
    // Normalizes repeated whitespace after cleanup.
    .replace(/\s+/g, " ")
    .trim();
  return truncateWithEllipsis(cleaned, 500);
}

/**
 * Estimates a plausible article read time from the abstract length and a
 * deterministic title hash so the same article always receives the same badge.
 */
function estimateReadTime(title: string, abstractText: string): string {
  const abstractWords = abstractText.split(/\s+/).length;
  // Uses abstract length as the baseline signal for a plausible read duration.
  const base =
    abstractWords < 30
      ? 4
      : abstractWords < 60
        ? 6
        : abstractWords < 100
          ? 8
          : 10;
  // Adds stable variation so similar-length abstracts do not all show the same badge.
  let h = 0;
  for (let i = 0; i < title.length; i++)
    h = ((h << 5) - h + title.charCodeAt(i)) | 0;
  const jitter = (Math.abs(h) % 5) - 2; // -2 to +2
  const mins = Math.max(3, Math.min(15, base + jitter));
  return `${mins} min`;
}

/**
 * Shortens long author lists so cached paper cards fit into compact layouts.
 */
function truncateAuthors(authors: string, maxCount: number = 3): string {
  const list = authors.split(", ").filter(Boolean);
  if (list.length <= maxCount) return authors;
  return list.slice(0, maxCount).join(", ") + ", et al.";
}

// Defines the keyword rules used to map synced articles into site categories.

const CATEGORY_RULES: { category: Article["category"]; keywords: string[] }[] =
  [
    {
      category: "climate",
      keywords: [
        "climate",
        "co2",
        "carbon",
        "emission",
        "greenhouse",
        "ice sheet",
        "sea level",
        "ozone",
        "methane",
        "temperature",
        "warming",
        "arctic",
        "antarctic",
        "glacier",
        "drought",
        "heat wave",
        "wildfire",
        "atmospheric",
        "weather pattern",
        "el niño",
        "la niña",
        "polar",
        "cryosphere",
        "permafrost",
        "aerosol",
      ],
    },
    {
      category: "sustainability",
      keywords: [
        "sdg",
        "sustainable",
        "urban planning",
        "agriculture",
        "renewable",
        "fishing",
        "subsidence",
        "energy",
        "crop",
        "food",
        "water resource",
        "pollution",
        "waste",
        "conservation",
        "biodiversity",
        "ecosystem",
        "habitat",
        "species",
        "reforestation",
        "solar",
        "wind power",
        "green",
        "recycling",
      ],
    },
    {
      category: "space-tech",
      keywords: [
        "debris",
        "orbit",
        "constellation",
        "servicing",
        "quantum",
        "launch",
        "rocket",
        "spacecraft",
        "iss",
        "station",
        "telescope",
        "mars",
        "moon",
        "lunar",
        "rover",
        "mission",
        "cubesat",
        "smallsat",
        "deploy",
        "docking",
        "crew",
        "astronaut",
        "starship",
        "artemis",
      ],
    },
    {
      category: "earth-science",
      keywords: [
        "sentinel",
        "landsat",
        "modis",
        "deforestation",
        "flood",
        "fire",
        "coral",
        "ocean",
        "bathymetry",
        "soil",
        "water quality",
        "volcano",
        "earthquake",
        "geology",
        "terrain",
        "reef",
        "island",
        "coast",
        "river",
        "lake",
        "erosion",
        "sediment",
        "topography",
        "mapping",
        "imagery",
        "observation",
        "vegetation",
        "forest",
        "lidar",
        "sar",
        "remote sensing",
      ],
    },
  ];

function classifyCategory(title: string, desc: string): Article["category"] {
  const text = `${title} ${desc}`.toLowerCase();
  let best: Article["category"] = "earth-science";
  let bestScore = 0;
  for (const rule of CATEGORY_RULES) {
    const score = rule.keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = rule.category;
    }
  }
  return best;
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// Keeps only recent article dates so the science feed does not accumulate stale content.
function articleCutoffDate(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - ARTICLE_RETENTION_DAYS);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

// Parses YYYY-MM-DD article dates into UTC midnight values for consistent recency checks.
function parseArticleDate(date: string): Date | null {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Scores how strongly an article matches the site's satellite and SDG mission themes.
function scoreArticleRelevance(
  article: Pick<Article, "title" | "abstract" | "tags" | "source" | "category">
): number {
  const haystack = [
    article.title,
    article.abstract,
    article.source,
    ...article.tags,
    article.category,
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  for (const keyword of ARTICLE_THEME_KEYWORDS) {
    if (haystack.includes(keyword)) score += 2;
  }

  if (
    article.category === "earth-science" ||
    article.category === "space-tech"
  ) {
    score += 4;
  } else {
    score += 3;
  }

  if (
    haystack.includes("nasa") ||
    haystack.includes("esa") ||
    haystack.includes("noaa") ||
    haystack.includes("copernicus")
  ) {
    score += 2;
  }

  return score;
}

// Enforces the science-lab feed policy: only recent, mission-relevant articles with a capped total volume.
export function filterVisibleArticles(
  articles: Article[],
  now: Date = new Date()
): Article[] {
  const cutoff = articleCutoffDate(now);
  const categoryCounts = new Map<Article["category"], number>();

  return articles
    .map((article) => {
      const publishedAt = parseArticleDate(article.date);
      const relevanceScore = scoreArticleRelevance(article);
      return { article, publishedAt, relevanceScore };
    })
    .filter(
      ({ publishedAt, relevanceScore }) =>
        publishedAt !== null && publishedAt >= cutoff && relevanceScore > 0
    )
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return (
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
      );
    })
    .filter(({ article }) => {
      const count = categoryCounts.get(article.category) ?? 0;
      if (count >= ARTICLE_MAX_PER_CATEGORY) return false;
      categoryCounts.set(article.category, count + 1);
      return true;
    })
    .slice(0, ARTICLE_MAX_TOTAL)
    .map(({ article }) => article);
}

// Removes expired and low-priority rows from the persisted article cache so the DB mirrors the visible feed policy.
async function pruneArticleCache(now: Date): Promise<void> {
  const cutoffIso = articleCutoffDate(now).toISOString().slice(0, 10);

  await prisma.articleCache.deleteMany({
    where: { date: { lt: cutoffIso } },
  });

  const cached = await prisma.articleCache.findMany({
    orderBy: [{ date: "desc" }, { fetchedAt: "desc" }],
  });

  const visibleIds = new Set(
    filterVisibleArticles(
      cached.map((row) => ({
        id: row.id,
        title: row.title,
        abstract: row.abstract,
        tags: JSON.parse(row.tags) as string[],
        source: row.source,
        date: row.date,
        readTime: row.readTime,
        category: row.category as Article["category"],
        url: row.url,
      })),
      now
    ).map((article) => article.id)
  );

  const staleIds = cached
    .filter((row) => !visibleIds.has(row.id))
    .map((row) => row.id);

  if (staleIds.length > 0) {
    await prisma.articleCache.deleteMany({
      where: { id: { in: staleIds } },
    });
  }
}

// Reads the most recent article or paper refresh timestamp from the cache.
async function getLatestScienceFetchTime(
  table: "article" | "paper"
): Promise<Date | null> {
  if (table === "article") {
    const latest = await prisma.articleCache.findFirst({
      orderBy: { fetchedAt: "desc" },
      select: { fetchedAt: true },
    });
    return latest?.fetchedAt ?? null;
  }

  const latest = await prisma.paperCache.findFirst({
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });
  return latest?.fetchedAt ?? null;
}

// Fetches and normalizes article data from multiple RSS feeds.

function extractCDATA(raw: string): string {
  const match = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  const content = match ? match[1] : raw;
  return stripHtml(content);
}

interface RSSFeed {
  url: string;
  fallbackSource: string;
}

const RSS_FEEDS: RSSFeed[] = [
  // Pulls NASA's Earth-focused feed.
  {
    url: "https://earthobservatory.nasa.gov/feeds/earth-observatory.rss",
    fallbackSource: "NASA Earth Observatory",
  },
  // Pulls ESA's space and Earth-observation news feed.
  {
    url: "https://www.esa.int/rssfeed/Our_Activities/Observing_the_Earth",
    fallbackSource: "ESA Earth Observation",
  },
  // Pulls NOAA's climate and weather news feed.
  {
    url: "https://www.climate.gov/feeds/all.rss",
    fallbackSource: "NOAA Climate.gov",
  },
  // Pulls the Phys.org Earth science feed.
  {
    url: "https://phys.org/rss-feed/earth-news/",
    fallbackSource: "Phys.org Earth Science",
  },
  // Pulls the Phys.org space feed to broaden space-technology coverage.
  {
    url: "https://phys.org/rss-feed/space-news/",
    fallbackSource: "Phys.org Space",
  },
];

async function fetchArticlesFromFeeds(): Promise<void> {
  const now = new Date();

  // Fetches all configured RSS feeds concurrently so one slow source does not block the rest.
  await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const response = await fetch(feed.url, {
          headers: { "User-Agent": "SatelliteMonitoringSystem/1.0" },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
          console.error(`RSS ${feed.fallbackSource}: ${response.status}`);
          return;
        }
        const xml = await response.text();
        await parseAndStoreRSSItems(xml, now, feed.fallbackSource);
      } catch (err) {
        console.error(
          `RSS ${feed.fallbackSource} failed:`,
          err instanceof Error ? err.message : err
        );
      }
    })
  );

  await pruneArticleCache(now);
}

// Refreshes the article cache once per server refresh window instead of making
// remote users wait for upstream RSS requests during page loads.
export async function refreshArticlesCache(force: boolean = false): Promise<void> {
  const latest = await getLatestScienceFetchTime("article");
  if (!force && !isDailyRefreshDue(latest, STATIC_REFRESH_HOUR_UTC)) return;
  await fetchArticlesFromFeeds();
}

async function parseAndStoreRSSItems(
  xml: string,
  now: Date,
  fallbackSource: string
): Promise<void> {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

  // Infers a display source label from the feed metadata when possible.
  const channelTitle = xml.match(
    /<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/i
  );
  const feedSource = channelTitle ? stripHtml(channelTitle[1]) : fallbackSource;
  // Chooses the shorter source label so article cards stay compact.
  const source = feedSource.length > 40 ? fallbackSource : feedSource;

  for (const item of items.slice(0, 15)) {
    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/i);
    const descMatch = item.match(/<description>([\s\S]*?)<\/description>/i);
    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
    const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    // Reads the richer encoded content field when the feed provides one.
    const contentMatch = item.match(
      /<content:encoded>([\s\S]*?)<\/content:encoded>/i
    );

    const title = titleMatch ? extractCDATA(titleMatch[1]) : "";
    // Prefers richer encoded content and falls back to the plain description when needed.
    const rawDesc = contentMatch
      ? extractCDATA(contentMatch[1])
      : descMatch
        ? extractCDATA(descMatch[1])
        : "";
    // Removes CMS boilerplate and media prefixes before excerpt cleanup.
    const cleaned = rawDesc
      .replace(
        /^(?:Video|Audio|Podcast|Media)\s*:\s*\d{1,2}:\d{2}(?::\d{2})?\s*/i,
        ""
      )
      .replace(/^\d{1,2}:\d{2}(?::\d{2})?\s+/, "")
      .replace(/The post\s+.*?appeared first on.*$/i, "")
      .replace(/Continue reading.*$/i, "")
      .replace(/Read more\.?$/i, "")
      .trim();
    const abstract = truncateWithEllipsis(cleaned, 500);
    const url = linkMatch ? extractCDATA(linkMatch[1]) : "";
    let pubDate: string;
    try {
      pubDate = dateMatch
        ? new Date(extractCDATA(dateMatch[1])).toISOString().slice(0, 10)
        : now.toISOString().slice(0, 10);
    } catch {
      pubDate = now.toISOString().slice(0, 10);
    }

    if (!title || abstract.length < 30) continue;

    const sourceId = `rss-${hashString(title + source)}`;
    const tags = autoTagText(title, abstract);
    const category = classifyCategory(title, abstract);
    const article: Article = {
      id: sourceId,
      title,
      abstract,
      tags,
      source,
      date: pubDate,
      readTime: estimateReadTime(title, abstract),
      category,
      url,
    };

    if (scoreArticleRelevance(article) <= 0) continue;

    await prisma.articleCache.upsert({
      where: { sourceId },
      update: {
        title,
        abstract,
        tags: JSON.stringify(tags),
        source,
        date: pubDate,
        readTime: article.readTime,
        category,
        url,
        fetchedAt: now,
      },
      create: {
        sourceId,
        title,
        abstract,
        tags: JSON.stringify(tags),
        source,
        date: pubDate,
        readTime: article.readTime,
        category,
        url,
        fetchedAt: now,
      },
    });
  }
}

// Fetches and normalizes papers from Semantic Scholar.

const SS_QUERIES = [
  "satellite earth observation remote sensing",
  "SDG sustainable development goals satellite monitoring",
  "space debris tracking orbit",
];

async function fetchSemanticScholarPapers(): Promise<void> {
  const now = new Date();

  for (let qi = 0; qi < SS_QUERIES.length; qi++) {
    if (qi > 0) await new Promise((r) => setTimeout(r, 1000));

    const query = encodeURIComponent(SS_QUERIES[qi]);
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${query}&limit=10&fields=paperId,title,authors,year,abstract,externalIds,journal`;

    const response = await fetch(url, {
      headers: { "User-Agent": "SatelliteMonitoringSystem/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error(
        `Semantic Scholar query "${SS_QUERIES[qi]}": ${response.status}`
      );
      continue;
    }

    const json = await response.json();
    const papers = json.data || [];

    for (const p of papers) {
      if (!p.title || !p.abstract) continue;
      const sourceId = `ss-${p.paperId}`;
      const rawAuthors =
        (p.authors || []).map((a: { name: string }) => a.name).join(", ") ||
        "Unknown";
      const authors = truncateAuthors(rawAuthors);
      const journal = p.journal?.name || "Preprint";
      const doi = p.externalIds?.DOI || "";
      const abstract = cleanPaperAbstract(p.abstract);

      await prisma.paperCache.upsert({
        where: { sourceId },
        update: {
          title: p.title,
          authors,
          journal,
          year: p.year || new Date().getFullYear(),
          abstract,
          doi,
          apiSource: "semantic-scholar",
          fetchedAt: now,
        },
        create: {
          sourceId,
          title: p.title,
          authors,
          journal,
          year: p.year || new Date().getFullYear(),
          abstract,
          doi,
          apiSource: "semantic-scholar",
          fetchedAt: now,
        },
      });
    }
  }
}

// Fetches and normalizes papers from arXiv.

const ARXIV_QUERIES = [
  "cat:physics.geo-ph+AND+all:satellite",
  "cat:eess.IV+AND+all:earth+observation",
];

async function fetchArxivPapers(): Promise<void> {
  const now = new Date();

  for (let qi = 0; qi < ARXIV_QUERIES.length; qi++) {
    if (qi > 0) await new Promise((r) => setTimeout(r, 3000));

    const url = `https://export.arxiv.org/api/query?search_query=${ARXIV_QUERIES[qi]}&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending`;

    const response = await fetch(url, {
      headers: { "User-Agent": "SatelliteMonitoringSystem/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error(`arXiv query "${ARXIV_QUERIES[qi]}": ${response.status}`);
      continue;
    }

    const xml = await response.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];

    for (const entry of entries) {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/i);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/i);
      const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/i);
      const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/i);

      const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
      const rawAbstract = summaryMatch
        ? summaryMatch[1].replace(/\s+/g, " ").trim()
        : "";
      const abstract = cleanPaperAbstract(rawAbstract);
      const arxivUrl = idMatch ? idMatch[1].trim() : "";
      const arxivId = arxivUrl.split("/abs/").pop() || arxivUrl;

      if (!title || abstract.length < 30) continue;

      // Formats the author list into a compact string suitable for UI display.
      const authorMatches = entry.match(/<name>([\s\S]*?)<\/name>/gi) || [];
      const rawAuthors =
        authorMatches
          .map((m) => {
            const n = m.match(/<name>([\s\S]*?)<\/name>/i);
            return n ? n[1].trim() : "";
          })
          .filter(Boolean)
          .join(", ") || "Unknown";
      const authors = truncateAuthors(rawAuthors);

      const year = publishedMatch
        ? parseInt(publishedMatch[1].trim().slice(0, 4), 10)
        : new Date().getFullYear();

      const sourceId = `arxiv-${hashString(arxivId)}`;
      const doi = arxivId ? `10.48550/arXiv.${arxivId}` : "";

      await prisma.paperCache.upsert({
        where: { sourceId },
        update: {
          title,
          authors,
          journal: "arXiv",
          year,
          abstract,
          doi,
          apiSource: "arxiv",
          fetchedAt: now,
        },
        create: {
          sourceId,
          title,
          authors,
          journal: "arXiv",
          year,
          abstract,
          doi,
          apiSource: "arxiv",
          fetchedAt: now,
        },
      });
    }
  }
}

// Refreshes the paper cache once per server refresh window so the public API
// can serve stored paper records without contacting external services.
export async function refreshPapersCache(force: boolean = false): Promise<void> {
  const latest = await getLatestScienceFetchTime("paper");
  if (!force && !isDailyRefreshDue(latest, STATIC_REFRESH_HOUR_UTC)) return;
  await Promise.all([fetchSemanticScholarPapers(), fetchArxivPapers()]);
}

// Exposes the public sync functions used by routes and scheduled refresh jobs.

export interface SyncedPaper extends Paper {
  apiSource: "semantic-scholar" | "arxiv";
}

export async function getArticles(): Promise<{
  articles: Article[];
  fetchedAt: Date | null;
}> {
  const cached = await prisma.articleCache.findMany({
    orderBy: { date: "desc" },
  });

  if (cached.length === 0) {
    return { articles: [], fetchedAt: null };
  }

  const fetchedAt = cached[0].fetchedAt;

  const articles: Article[] = cached.map((r) => ({
    id: r.id,
    title: r.title,
    abstract: r.abstract,
    tags: JSON.parse(r.tags) as string[],
    source: r.source,
    date: r.date,
    readTime: r.readTime,
    category: r.category as Article["category"],
    url: r.url,
  }));

  return { articles: filterVisibleArticles(articles), fetchedAt };
}

export async function getPapers(): Promise<{
  papers: SyncedPaper[];
  fetchedAt: Date | null;
}> {
  const cached = await prisma.paperCache.findMany({
    orderBy: { year: "desc" },
  });

  if (cached.length === 0) {
    return { papers: [], fetchedAt: null };
  }

  const fetchedAt = cached[0].fetchedAt;

  const papers: SyncedPaper[] = cached.map((r) => ({
    id: r.id,
    title: r.title,
    authors: r.authors,
    journal: r.journal,
    year: r.year,
    abstract: r.abstract,
    doi: r.doi,
    apiSource: r.apiSource as SyncedPaper["apiSource"],
  }));

  return { papers, fetchedAt };
}
