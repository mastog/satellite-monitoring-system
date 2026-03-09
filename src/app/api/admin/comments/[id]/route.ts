import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";

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
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const { body } = await req.json();
    if (!body) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { body, updatedAt: new Date() },
    });

    return NextResponse.json({
      comment: {
        id: comment.id,
        body: comment.body,
        postId: comment.postId,
        authorId: comment.authorId,
        authorName: comment.authorName,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Admin comments [id] PUT error:", err);
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
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.vote.deleteMany({
        where: { targetId: id, targetType: "comment" },
      }),
      prisma.comment.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin comments [id] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
