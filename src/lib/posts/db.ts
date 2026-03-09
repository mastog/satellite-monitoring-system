import { prisma } from "@/lib/prisma";
import { Post, Comment, PostVote } from "./types";

// Normalizes the stored JSON/string tag format into the array shape used by the app.
function parseTags(tags: string | string[]): string[] {
  if (Array.isArray(tags)) return tags;
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

// Maps a Prisma post record into the application's serializable Post shape.
function mapPost(p: {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  tags: string | string[];
  createdAt: Date;
  updatedAt: Date;
}): Post {
  return {
    id: p.id,
    authorId: p.authorId,
    authorName: p.authorName,
    title: p.title,
    body: p.body,
    tags: parseTags(p.tags),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    supportCount: 0,
    opposeCount: 0,
    lastCommentAt: null,
    commentCount: 0,
    weeklyHotness: 0,
    totalHotness: 0,
  };
}

// Maps a Prisma comment record into the application's serializable Comment shape.
function mapComment(c: {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}): Comment {
  return {
    id: c.id,
    postId: c.postId,
    authorId: c.authorId,
    authorName: c.authorName,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    supportCount: 0,
    opposeCount: 0,
  };
}

// Maps a Prisma vote record into the application's serializable PostVote shape.
function mapVote(v: {
  id: string;
  userId: string;
  targetId: string;
  targetType: string;
  vote: string;
  createdAt: Date;
}): PostVote {
  return {
    id: v.id,
    userId: v.userId,
    targetId: v.targetId,
    targetType: v.targetType as PostVote["targetType"],
    vote: v.vote as "support" | "oppose",
    createdAt: v.createdAt.toISOString(),
  };
}

// Reads all posts ordered by newest first for the community feed.
export async function getPosts(): Promise<Post[]> {
  const rows = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(mapPost);
}

// Loads one post by ID and returns it in application shape.
export async function getPostById(id: string): Promise<Post | undefined> {
  const row = await prisma.post.findUnique({ where: { id } });
  if (!row) return undefined;
  return mapPost(row);
}

// Creates a new post using the application's serializable Post payload.
export async function createPost(post: Post): Promise<Post> {
  const row = await prisma.post.create({
    data: {
      id: post.id,
      authorId: post.authorId,
      authorName: post.authorName,
      title: post.title,
      body: post.body,
      tags: JSON.stringify(post.tags),
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt),
    },
  });
  return mapPost(row);
}

// Applies partial post updates and returns the updated post when it exists.
export async function updatePost(
  id: string,
  updates: Partial<Pick<Post, "title" | "body" | "tags" | "updatedAt">>
): Promise<Post | null> {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.post.update({
    where: { id },
    data: {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.body !== undefined && { body: updates.body }),
      ...(updates.tags !== undefined && { tags: JSON.stringify(updates.tags) }),
      ...(updates.updatedAt !== undefined && {
        updatedAt: new Date(updates.updatedAt),
      }),
    },
  });
  return mapPost(row);
}

// Deletes a post together with the votes attached to the post and its comments.
export async function deletePost(id: string): Promise<boolean> {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return false;

  await prisma.$transaction([
    // Removes votes attached to the post itself and to comments that belong to the post.
    prisma.vote.deleteMany({
      where: {
        OR: [
          { targetId: id, targetType: "post" },
          {
            targetId: {
              in: (
                await prisma.comment.findMany({
                  where: { postId: id },
                  select: { id: true },
                })
              ).map((c) => c.id),
            },
            targetType: "comment",
          },
        ],
      },
    }),
    // Deletes the post after related votes have been cleaned up.
    prisma.post.delete({ where: { id } }),
  ]);
  return true;
}

// Loads every comment and groups them by post ID for feed hydration.
export async function getAllCommentsGrouped(): Promise<
  Record<string, Comment[]>
> {
  const all = await prisma.comment.findMany({ orderBy: { createdAt: "asc" } });
  const grouped: Record<string, Comment[]> = {};
  for (const c of all) {
    const mapped = mapComment(c);
    if (!grouped[c.postId]) grouped[c.postId] = [];
    grouped[c.postId].push(mapped);
  }
  return grouped;
}

// Loads the comments for one post in chronological order.
export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  const rows = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapComment);
}

// Loads a single comment by ID when it exists.
export async function getCommentById(id: string): Promise<Comment | undefined> {
  const row = await prisma.comment.findUnique({ where: { id } });
  if (!row) return undefined;
  return mapComment(row);
}

// Creates a new comment using the application's serializable Comment payload.
export async function createComment(comment: Comment): Promise<Comment> {
  const row = await prisma.comment.create({
    data: {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      authorName: comment.authorName,
      body: comment.body,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
    },
  });
  return mapComment(row);
}

// Applies partial updates to a comment when it exists.
export async function updateComment(
  id: string,
  updates: Partial<Pick<Comment, "body" | "updatedAt">>
): Promise<Comment | null> {
  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await prisma.comment.update({
    where: { id },
    data: {
      ...(updates.body !== undefined && { body: updates.body }),
      ...(updates.updatedAt !== undefined && {
        updatedAt: new Date(updates.updatedAt),
      }),
    },
  });
  return mapComment(row);
}

// Deletes a comment after removing any votes attached to it.
export async function deleteComment(id: string): Promise<boolean> {
  const existing = await prisma.comment.findUnique({ where: { id } });
  if (!existing) return false;
  await prisma.vote.deleteMany({
    where: { targetId: id, targetType: "comment" },
  });
  await prisma.comment.delete({ where: { id } });
  return true;
}

// Loads every vote attached to a specific target.
export async function getVotesByTarget(targetId: string): Promise<PostVote[]> {
  const rows = await prisma.vote.findMany({ where: { targetId } });
  return rows.map(mapVote);
}

// Loads the current user's vote for a specific target if one exists.
export async function getUserVote(
  userId: string,
  targetId: string
): Promise<PostVote | undefined> {
  const row = await prisma.vote.findUnique({
    where: { userId_targetId: { userId, targetId } },
  });
  if (!row) return undefined;
  return mapVote(row);
}

export async function toggleVote(
  userId: string,
  targetId: string,
  targetType: PostVote["targetType"],
  vote: "support" | "oppose"
): Promise<{
  action: "added" | "removed" | "changed";
  vote: "support" | "oppose";
}> {
  const existing = await prisma.vote.findUnique({
    where: { userId_targetId: { userId, targetId } },
  });

  if (existing) {
    if (existing.vote === vote) {
      await prisma.vote.delete({ where: { id: existing.id } });
      return { action: "removed", vote };
    }
    await prisma.vote.update({ where: { id: existing.id }, data: { vote } });
    return { action: "changed", vote };
  }

  await prisma.vote.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      targetId,
      targetType,
      vote,
    },
  });
  return { action: "added", vote };
}

export async function getVoteCounts(
  targetId: string
): Promise<{ support: number; oppose: number }> {
  const [support, oppose] = await Promise.all([
    prisma.vote.count({ where: { targetId, vote: "support" } }),
    prisma.vote.count({ where: { targetId, vote: "oppose" } }),
  ]);
  return { support, oppose };
}

/**
 * Count votes on a set of target IDs that were cast within the last N days.
 */
export async function getRecentVoteCount(
  targetIds: string[],
  days: number
): Promise<number> {
  if (targetIds.length === 0) return 0;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.vote.count({
    where: {
      targetId: { in: targetIds },
      createdAt: { gte: since },
    },
  });
}

export async function getUserPostVotes(
  userId: string
): Promise<Record<string, "support" | "oppose">> {
  const votes = await prisma.vote.findMany({
    where: {
      userId,
      targetType: { in: ["post", "comment"] },
    },
  });
  const map: Record<string, "support" | "oppose"> = {};
  for (const v of votes) {
    map[v.targetId] = v.vote as "support" | "oppose";
  }
  return map;
}
