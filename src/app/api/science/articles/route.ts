import { NextRequest, NextResponse } from "next/server";
import { getArticles } from "@/lib/science/syncArticles";
import { MOCK_ARTICLES } from "@/lib/content/data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const { articles, fetchedAt } = await getArticles();

    // Fallback to mock data if DB is empty
    const data = articles.length > 0 ? articles : MOCK_ARTICLES;
    const source = articles.length > 0 ? "api" : "mock";

    const filtered = category
      ? data.filter((a) => a.category === category)
      : data;

    return NextResponse.json({
      articles: filtered,
      count: filtered.length,
      fetchedAt: fetchedAt?.toISOString() || null,
      source,
    });
  } catch (err) {
    console.error("Science articles API error:", err);
    return NextResponse.json({
      articles: MOCK_ARTICLES,
      count: MOCK_ARTICLES.length,
      fetchedAt: null,
      source: "mock",
    });
  }
}
