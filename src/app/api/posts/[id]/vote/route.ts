import { NextRequest, NextResponse } from "next/server";
import { getPostById, toggleVote, getVoteCounts } from "@/lib/posts/db";
import { getAuthUser } from "@/lib/auth/middleware";

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

    const { vote } = await req.json();
    if (vote !== "support" && vote !== "oppose") {
      return NextResponse.json(
        { error: "Vote must be 'support' or 'oppose'" },
        { status: 400 }
      );
    }

    const result = await toggleVote(user.id, id, "post", vote);
    const counts = await getVoteCounts(id);

    return NextResponse.json({ ...result, counts });
  } catch (err) {
    console.error("Post vote API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
