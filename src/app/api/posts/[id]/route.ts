import { NextRequest, NextResponse } from "next/server";
import {
  getPostById,
  updatePost,
  deletePost,
  getVoteCounts,
} from "@/lib/posts/db";
import { getAuthUser } from "@/lib/auth/middleware";
import { autoTagText } from "@/lib/posts/autoTag";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    const votes = await getVoteCounts(id);
    return NextResponse.json({
      post: { ...post, supportCount: votes.support, opposeCount: votes.oppose },
    });
  } catch (err) {
    console.error("Post [id] API error:", err);
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
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const existing = await getPostById(id);
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { title, body } = await req.json();
    const tags = autoTagText(title || existing.title, body || existing.body);
    const updated = await updatePost(id, {
      ...(title && { title }),
      ...(body && { body }),
      tags,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ post: updated });
  } catch (err) {
    console.error("Post [id] API error:", err);
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
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const existing = await getPostById(id);
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    if (existing.authorId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await deletePost(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Post [id] API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
