import { NextRequest, NextResponse } from "next/server";
import {
  getPosts,
  createPost,
  getUserPostVotes,
  getVoteCounts,
  getAllCommentsGrouped,
  getRecentVoteCount,
} from "@/lib/posts/db";
import { getAuthUser } from "@/lib/auth/middleware";
import { autoTagText } from "@/lib/posts/autoTag";
import { awardPoints, POINTS_POST } from "@/lib/points/economy";

export async function GET(req: NextRequest) {
  try {
    const rawPosts = await getPosts();
    const user = await getAuthUser(req);
    const userVotes = user ? await getUserPostVotes(user.id) : {};
    // Preload all comments with computed vote counts
    const grouped = await getAllCommentsGrouped();
    const commentsByPost: Record<string, unknown[]> = {};
    for (const [postId, comments] of Object.entries(grouped)) {
      commentsByPost[postId] = await Promise.all(
        comments.map(async (c) => {
          const cc = await getVoteCounts(c.id);
          return { ...c, supportCount: cc.support, opposeCount: cc.oppose };
        })
      );
    }

    // Enrich posts with vote counts, comment stats, and hotness
    const posts = await Promise.all(
      rawPosts.map(async (p) => {
        const counts = await getVoteCounts(p.id);
        const comments = grouped[p.id] || [];
        const commentIds = comments.map((c) => c.id);

        // Last comment timestamp
        const lastCommentAt =
          comments.length > 0 ? comments[comments.length - 1].createdAt : null;

        // Total hotness = all votes on post + all votes on its comments
        const commentVoteCounts = await Promise.all(
          commentIds.map((id) => getVoteCounts(id))
        );
        const totalCommentVotes = commentVoteCounts.reduce(
          (sum, c) => sum + c.support + c.oppose,
          0
        );
        const totalHotness = counts.support + counts.oppose + totalCommentVotes;

        // Weekly hotness = votes from last 7 days on post + its comments
        const allTargetIds = [p.id, ...commentIds];
        const weeklyHotness = await getRecentVoteCount(allTargetIds, 7);

        return {
          ...p,
          supportCount: counts.support,
          opposeCount: counts.oppose,
          lastCommentAt,
          commentCount: comments.length,
          weeklyHotness,
          totalHotness,
        };
      })
    );

    return NextResponse.json({ posts, userVotes, commentsByPost });
  } catch (err) {
    console.error("Posts API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { title, body } = await req.json();
    if (!title || !body) {
      return NextResponse.json(
        { error: "Title and body are required" },
        { status: 400 }
      );
    }

    const tags = autoTagText(title, body);
    const now = new Date().toISOString();
    const post = await createPost({
      id: crypto.randomUUID(),
      authorId: user.id,
      authorName: user.name,
      title,
      body,
      tags,
      createdAt: now,
      updatedAt: now,
      supportCount: 0,
      opposeCount: 0,
      lastCommentAt: null,
      commentCount: 0,
      weeklyHotness: 0,
      totalHotness: 0,
    });

    awardPoints(user.id, POINTS_POST, "post").catch((e) =>
      console.error("award points error:", e)
    );
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error("Posts API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
