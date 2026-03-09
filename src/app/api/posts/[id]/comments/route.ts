import { NextRequest, NextResponse } from "next/server";
import {
  getPostById,
  getCommentsByPostId,
  createComment,
  getVoteCounts,
} from "@/lib/posts/db";
import { getAuthUser } from "@/lib/auth/middleware";
import { createCommentReplyNotification } from "@/lib/notifications/create";
import { awardPoints, POINTS_COMMENT } from "@/lib/points/economy";

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

    const rawComments = await getCommentsByPostId(id);
    const comments = await Promise.all(
      rawComments.map(async (c) => {
        const counts = await getVoteCounts(c.id);
        return {
          ...c,
          supportCount: counts.support,
          opposeCount: counts.oppose,
        };
      })
    );

    return NextResponse.json({ comments });
  } catch (err) {
    console.error("Comments API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const { body } = await req.json();
    if (!body) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const comment = await createComment({
      id: crypto.randomUUID(),
      postId: id,
      authorId: user.id,
      authorName: user.name,
      body,
      createdAt: now,
      updatedAt: now,
      supportCount: 0,
      opposeCount: 0,
    });

    awardPoints(user.id, POINTS_COMMENT, "comment").catch((e) =>
      console.error("award points error:", e)
    );

    // Create notification for post author if commenter is different
    if (post.authorId !== user.id) {
      createCommentReplyNotification(
        post.authorId,
        user.name,
        id,
        post.title
      ).catch((err) =>
        console.error("Failed to create comment notification:", err)
      );
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) {
    console.error("Comments API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
