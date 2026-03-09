import { NextRequest, NextResponse } from "next/server";
import { getCommentById, updateComment, deleteComment } from "@/lib/posts/db";
import { getAuthUser } from "@/lib/auth/middleware";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { commentId } = await params;
    const existing = await getCommentById(commentId);
    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { body } = await req.json();
    const updated = await updateComment(commentId, {
      ...(body && { body }),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ comment: updated });
  } catch (err) {
    console.error("Comment [id] API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { commentId } = await params;
    const existing = await getCommentById(commentId);
    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await deleteComment(commentId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Comment [id] API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
