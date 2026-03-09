import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, email: true } },
        _count: { select: { comments: true } },
      },
    });

    const result = await Promise.all(
      posts.map(async (p) => {
        const [supportCount, opposeCount] = await Promise.all([
          prisma.vote.count({ where: { targetId: p.id, vote: "support" } }),
          prisma.vote.count({ where: { targetId: p.id, vote: "oppose" } }),
        ]);

        let tags: string[] = [];
        try {
          tags = JSON.parse(p.tags);
        } catch {
          /* empty */
        }

        return {
          id: p.id,
          title: p.title,
          body: p.body,
          tags,
          authorId: p.authorId,
          authorName: p.authorName,
          authorEmail: p.author.email,
          supportCount,
          opposeCount,
          commentCount: p._count.comments,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ posts: result });
  } catch (err) {
    console.error("Admin posts GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
