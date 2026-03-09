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

    const comments = await prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, email: true } },
        post: { select: { title: true } },
      },
    });

    const result = await Promise.all(
      comments.map(async (c) => {
        const [supportCount, opposeCount] = await Promise.all([
          prisma.vote.count({ where: { targetId: c.id, vote: "support" } }),
          prisma.vote.count({ where: { targetId: c.id, vote: "oppose" } }),
        ]);

        return {
          id: c.id,
          body: c.body,
          postId: c.postId,
          postTitle: c.post.title,
          authorId: c.authorId,
          authorName: c.authorName,
          authorEmail: c.author.email,
          supportCount,
          opposeCount,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ comments: result });
  } catch (err) {
    console.error("Admin comments GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
