import { MOCK_ARTICLES, type Article } from "@/lib/content/data";

export interface FeaturedArticle {
  id: string;
  title: string;
  abstract: string;
  readTime: string;
  tag: string;
  accentColor: string;
  category: Article["category"];
  source: string;
  date: string;
  tags: string[];
}

export const CATEGORY_MAP: Record<
  Article["category"],
  { tag: string; accentColor: string }
> = {
  "earth-science": { tag: "EARTH SCI", accentColor: "var(--neon-cyan)" },
  sustainability: { tag: "SDG", accentColor: "var(--neon-green)" },
  "space-tech": { tag: "SPACE TECH", accentColor: "var(--holo-purple)" },
  climate: { tag: "CLIMATE", accentColor: "var(--neon-orange)" },
};

export function getFeaturedArticles(
  voteCounts: Record<string, { support: number; oppose: number }>,
  articles?: Article[],
  count = 3
): FeaturedArticle[] {
  const pool = articles && articles.length > 0 ? articles : MOCK_ARTICLES;

  const scored = pool.map((article) => {
    const key = `article-${article.id}`;
    const votes = voteCounts[key];
    let approval = 0.5;
    let engagement = 0;

    if (votes) {
      const total = votes.support + votes.oppose;
      if (total > 0) {
        approval = votes.support / total;
        engagement = total * 0.01;
      }
    }

    // Gives newer articles extra weight so fresh content can surface even before votes accumulate.
    const daysSince =
      (Date.now() - new Date(article.date).getTime()) / 86400000;
    const recencyBoost = daysSince < 14 ? 0.2 * (1 - daysSince / 14) : 0;

    return { article, score: approval + engagement + recencyBoost };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, count).map(({ article }) => {
    const mapping = CATEGORY_MAP[article.category];
    return {
      id: article.id,
      title: article.title,
      abstract: article.abstract,
      readTime: article.readTime,
      tag: mapping.tag,
      accentColor: mapping.accentColor,
      category: article.category,
      source: article.source,
      date: article.date,
      tags: article.tags,
    };
  });
}
