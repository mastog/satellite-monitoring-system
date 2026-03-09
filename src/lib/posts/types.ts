export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  supportCount: number;
  opposeCount: number;
  lastCommentAt: string | null;
  commentCount: number;
  weeklyHotness: number;
  totalHotness: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  supportCount: number;
  opposeCount: number;
}

export interface PostVote {
  id: string;
  userId: string;
  targetId: string;
  targetType: "post" | "comment" | "sdg" | "article" | "paper" | "indicator";
  vote: "support" | "oppose";
  createdAt: string;
}
