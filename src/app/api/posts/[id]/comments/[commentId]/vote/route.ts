import { NextRequest, NextResponse } from "next/server";
import { getCommentById, toggleVote, getVoteCounts } from "@/lib/posts/db";
import { getAuthUser } from "@/lib/auth/middleware";

export async function POST(
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
    const comment = await getCommentById(commentId);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const { vote } = await req.json();
    if (vote !== "support" && vote !== "oppose") {
      return NextResponse.json(
        { error: "Vote must be 'support' or 'oppose'" },
        { status: 400 }
      );
    }

    const result = await toggleVote(user.id, commentId, "comment", vote);
    const counts = await getVoteCounts(commentId);

    return NextResponse.json({ ...result, counts });
  } catch (err) {
    console.error("Comment vote API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
