import { SDG_KEYWORDS, DOMAIN_TAGS } from "@/lib/posts/autoTag";
import { segmentChinese } from "./zhDictionary";
import type { Article, Paper } from "@/lib/content/data";

// Defines the scored wrapper returned by the ranking functions.

export interface ScoredResult<T> {
  item: T;
  score: number;
}

// Lists low-information English terms that should be discarded during query parsing.

const SEARCH_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "out",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "about",
  "and",
  "but",
  "or",
  "if",
  "because",
  "until",
  "while",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "it",
  "its",
  "they",
  "them",
  "their",
  "us",
  // Includes common question words so natural-language queries reduce to their meaningful search terms.
  "does",
  "do",
  "can",
  "how",
  "what",
  "which",
  "where",
]);

// Tunes BM25 for the short titles, abstracts, tags, and author fields in this corpus.

const K1 = 1.2;
const B = 0.5;

// Weights the document fields so stronger evidence, such as titles and tags, ranks higher.

const WEIGHT_TITLE = 3.0;
const WEIGHT_TAGS = 2.5;
const WEIGHT_ABSTRACT = 1.0;
const WEIGHT_AUTHORS = 0.5;
const WEIGHT_EXPANSION = 0.3;

// Parses raw search text into normalized tokens.

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

export function parseQuery(raw: string): string[] {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return [];

  if (hasChinese(trimmed)) {
    return segmentChinese(trimmed);
  }

  // Tokenizes Latin-script queries on whitespace and removes stopwords before scoring.
  return trimmed
    .split(/\s+/)
    .filter((w) => w.length > 0 && !SEARCH_STOPWORDS.has(w));
}

// Expands direct query tokens through SDG and domain taxonomies to improve recall.

// Builds reverse indexes so one matched keyword can recover the broader SDG or domain family around it.
const sdgReverseIndex = new Map<string, string[]>();
for (const [sdg, keywords] of Object.entries(SDG_KEYWORDS)) {
  for (const kw of keywords) {
    const key = kw.toLowerCase();
    if (!sdgReverseIndex.has(key)) sdgReverseIndex.set(key, []);
    sdgReverseIndex.get(key)!.push(sdg);
  }
}

const domainReverseIndex = new Map<string, string[]>();
for (const [tag, keywords] of Object.entries(DOMAIN_TAGS)) {
  for (const kw of keywords) {
    const key = kw.toLowerCase();
    if (!domainReverseIndex.has(key)) domainReverseIndex.set(key, []);
    domainReverseIndex.get(key)!.push(tag);
  }
}

export function expandTokens(tokens: string[]): {
  direct: string[];
  expanded: string[];
} {
  const direct = [...tokens];
  const expandedSet = new Set<string>();

  for (const token of tokens) {
    // Pulls sibling SDG keywords when the token matches one SDG keyword directly.
    const matchedSdgs = sdgReverseIndex.get(token);
    if (matchedSdgs) {
      for (const sdg of matchedSdgs) {
        for (const kw of SDG_KEYWORDS[sdg]) {
          const lk = kw.toLowerCase();
          if (!tokens.includes(lk)) expandedSet.add(lk);
        }
      }
    }

    // Pulls sibling domain keywords when the token matches one domain keyword directly.
    const matchedDomains = domainReverseIndex.get(token);
    if (matchedDomains) {
      for (const domain of matchedDomains) {
        for (const kw of DOMAIN_TAGS[domain]) {
          const lk = kw.toLowerCase();
          if (!tokens.includes(lk)) expandedSet.add(lk);
        }
      }
    }
  }

  // Expands explicit "SDG N" queries into the keywords attached to that SDG bucket.
  const joined = tokens.join(" ");
  const sdgMatch = joined.match(/sdg\s*(\d+)/);
  if (sdgMatch) {
    const sdgKey = `SDG ${sdgMatch[1]}`;
    if (SDG_KEYWORDS[sdgKey]) {
      for (const kw of SDG_KEYWORDS[sdgKey]) {
        const lk = kw.toLowerCase();
        if (!tokens.includes(lk)) expandedSet.add(lk);
      }
    }
  }

  return { direct, expanded: [...expandedSet] };
}

// Provides the token and BM25 helpers used by the ranking pipeline.

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

function termFrequency(term: string, words: string[]): number {
  let count = 0;
  for (const w of words) {
    if (w === term) count++;
  }
  return count;
}

/** Multi-word term match: checks if all words of a multi-word term appear in the word list */
function multiWordMatch(term: string, words: string[]): number {
  const parts = term.split(/\s+/);
  if (parts.length <= 1) return termFrequency(term, words);
  // Requires every part of the phrase so partial matches do not count as a full multi-word hit.
  const allPresent = parts.every((p) => words.includes(p));
  return allPresent ? 1 : 0;
}

function phraseMatch(text: string, queryTokens: string[]): boolean {
  if (queryTokens.length < 2) return false;
  const phrase = queryTokens.join(" ");
  return text.toLowerCase().includes(phrase);
}

interface DocFields {
  title: string;
  abstract: string;
  tags?: string[];
  authors?: string;
  source?: string;
}

function scoreDocument(
  directTokens: string[],
  expandedTokens: string[],
  doc: DocFields,
  avgDocLen: number
): number {
  const titleWords = tokenize(doc.title);
  const abstractWords = tokenize(doc.abstract);
  const tagWords = doc.tags ? doc.tags.flatMap((t) => tokenize(t)) : [];
  const authorWords = doc.authors ? tokenize(doc.authors) : [];
  const sourceWords = doc.source ? tokenize(doc.source) : [];

  const docLen =
    titleWords.length +
    abstractWords.length +
    tagWords.length +
    authorWords.length;

  let score = 0;

  const bm25Norm = (tf: number, weight: number) => {
    if (tf === 0) return 0;
    const norm =
      (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (docLen / avgDocLen)));
    return norm * weight;
  };

  // Scores the exact query tokens with full BM25 weight.
  for (const token of directTokens) {
    const tfTitle = termFrequency(token, titleWords);
    const tfAbstract = termFrequency(token, abstractWords);
    const tfTags = termFrequency(token, tagWords);
    const tfAuthors = termFrequency(token, [...authorWords, ...sourceWords]);

    score += bm25Norm(tfTitle, WEIGHT_TITLE);
    score += bm25Norm(tfAbstract, WEIGHT_ABSTRACT);
    score += bm25Norm(tfTags, WEIGHT_TAGS);
    score += bm25Norm(tfAuthors, WEIGHT_AUTHORS);
  }

  // Scores taxonomy-expanded tokens at reduced weight so they improve recall without overpowering exact matches.
  for (const token of expandedTokens) {
    const tfTitle = multiWordMatch(token, titleWords);
    const tfAbstract = multiWordMatch(token, abstractWords);
    const tfTags = multiWordMatch(token, tagWords);

    score += bm25Norm(tfTitle, WEIGHT_TITLE) * WEIGHT_EXPANSION;
    score += bm25Norm(tfAbstract, WEIGHT_ABSTRACT) * WEIGHT_EXPANSION;
    score += bm25Norm(tfTags, WEIGHT_TAGS) * WEIGHT_EXPANSION;
  }

  // Adds a phrase bonus when the original multi-word query appears exactly in the document text.
  if (directTokens.length >= 2) {
    const fullText = `${doc.title} ${doc.abstract} ${(doc.tags || []).join(" ")}`;
    if (phraseMatch(fullText, directTokens)) {
      score *= 2.0;
    }
  }

  return score;
}

// Exposes the public ranking functions used by article and paper search.

export function rankArticles(
  query: string,
  articles: Article[]
): ScoredResult<Article>[] {
  const tokens = parseQuery(query);
  if (tokens.length === 0) return articles.map((item) => ({ item, score: 0 }));

  const { direct, expanded } = expandTokens(tokens);

  // Computes the average article length once so BM25 normalization can compare results fairly.
  const avgDocLen =
    articles.reduce((sum, a) => {
      return (
        sum +
        tokenize(a.title).length +
        tokenize(a.abstract).length +
        a.tags.length
      );
    }, 0) / Math.max(articles.length, 1);

  const scored = articles.map((article) => ({
    item: article,
    score: scoreDocument(
      direct,
      expanded,
      {
        title: article.title,
        abstract: article.abstract,
        tags: article.tags,
        source: article.source,
      },
      avgDocLen
    ),
  }));

  return scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}

export function rankPapers(
  query: string,
  papers: Paper[]
): ScoredResult<Paper>[] {
  const tokens = parseQuery(query);
  if (tokens.length === 0) return papers.map((item) => ({ item, score: 0 }));

  const { direct, expanded } = expandTokens(tokens);

  const avgDocLen =
    papers.reduce((sum, p) => {
      return sum + tokenize(p.title).length + tokenize(p.abstract).length;
    }, 0) / Math.max(papers.length, 1);

  const scored = papers.map((paper) => ({
    item: paper,
    score: scoreDocument(
      direct,
      expanded,
      {
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
      },
      avgDocLen
    ),
  }));

  return scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
}
