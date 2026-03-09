import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, email: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true, email: true } } },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let tags: string[] = [];
    try {
      tags = JSON.parse(post.tags);
    } catch {
      /* empty */
    }

    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        body: post.body,
        tags,
        authorId: post.authorId,
        authorName: post.authorName,
        authorEmail: post.author.email,
        comments: post.comments.map((c) => ({
          id: c.id,
          body: c.body,
          authorId: c.authorId,
          authorName: c.authorName,
          authorEmail: c.author.email,
          createdAt: c.createdAt.toISOString(),
        })),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Admin posts [id] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const { title, body, tags } = await req.json();
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (title) data.title = title;
    if (body) data.body = body;
    if (tags) data.tags = JSON.stringify(tags);

    const post = await prisma.post.update({ where: { id }, data });

    let parsedTags: string[] = [];
    try {
      parsedTags = JSON.parse(post.tags);
    } catch {
      /* empty */
    }

    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        body: post.body,
        tags: parsedTags,
        authorId: post.authorId,
        authorName: post.authorName,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Admin posts [id] PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const commentIds = (
      await prisma.comment.findMany({
        where: { postId: id },
        select: { id: true },
      })
    ).map((c) => c.id);

    await prisma.$transaction([
      prisma.vote.deleteMany({
        where: {
          OR: [
            { targetId: id, targetType: "post" },
            ...(commentIds.length > 0
              ? [{ targetId: { in: commentIds }, targetType: "comment" }]
              : []),
          ],
        },
      }),
      prisma.comment.deleteMany({ where: { postId: id } }),
      prisma.post.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin posts [id] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
