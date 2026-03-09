import { NextRequest, NextResponse } from "next/server";
import { getPapers } from "@/lib/science/syncArticles";
import { MOCK_PAPERS } from "@/lib/content/data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase();

    const { papers, fetchedAt } = await getPapers();

    // Fallback to mock data if DB is empty
    if (papers.length === 0) {
      const mockFiltered = query
        ? MOCK_PAPERS.filter(
            (p) =>
              p.title.toLowerCase().includes(query) ||
              p.authors.toLowerCase().includes(query)
          )
        : MOCK_PAPERS;

      return NextResponse.json({
        papers: mockFiltered.map((p) => ({ ...p, apiSource: "mock" })),
        count: mockFiltered.length,
        fetchedAt: null,
        source: "mock",
      });
    }

    const filtered = query
      ? papers.filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.authors.toLowerCase().includes(query)
        )
      : papers;

    return NextResponse.json({
      papers: filtered,
      count: filtered.length,
      fetchedAt: fetchedAt?.toISOString() || null,
      source: "api",
    });
  } catch (err) {
    console.error("Science papers API error:", err);
    return NextResponse.json({
      papers: MOCK_PAPERS.map((p) => ({ ...p, apiSource: "mock" })),
      count: MOCK_PAPERS.length,
      fetchedAt: null,
      source: "mock",
    });
  }
}
