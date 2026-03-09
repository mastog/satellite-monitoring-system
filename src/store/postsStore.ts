import { create } from "zustand";
import type { Post, Comment } from "@/lib/posts/types";

interface PostsState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  commentsByPost: Record<string, Comment[]>;
  userVotes: Record<string, "support" | "oppose">;

  fetchPosts: () => Promise<void>;
  createPost: (title: string, body: string) => Promise<Post | null>;
  updatePost: (id: string, title: string, body: string) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;
  fetchComments: (postId: string) => Promise<void>;
  createComment: (postId: string, body: string) => Promise<Comment | null>;
  updateComment: (
    postId: string,
    commentId: string,
    body: string
  ) => Promise<boolean>;
  deleteComment: (postId: string, commentId: string) => Promise<boolean>;
  votePost: (postId: string, vote: "support" | "oppose") => Promise<void>;
  voteComment: (
    postId: string,
    commentId: string,
    vote: "support" | "oppose"
  ) => Promise<void>;
  resetUserState: () => void;
}

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,
  commentsByPost: {},
  userVotes: {},

  fetchPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      set({
        posts: data.posts,
        userVotes: data.userVotes || {},
        commentsByPost: data.commentsByPost || {},
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, error: "Failed to load posts" });
    }
  },

  createPost: async (title, body) => {
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) {
        const err = await res.json();
        set({ error: err.error || "Failed to create post" });
        return null;
      }
      const data = await res.json();
      set((s) => ({ posts: [data.post, ...s.posts], error: null }));
      return data.post;
    } catch {
      set({ error: "Network error" });
      return null;
    }
  },

  updatePost: async (id, title, body) => {
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      set((s) => ({
        posts: s.posts.map((p) => (p.id === id ? data.post : p)),
      }));
      return true;
    } catch {
      return false;
    }
  },

  deletePost: async (id) => {
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (!res.ok) return false;
      set((s) => ({
        posts: s.posts.filter((p) => p.id !== id),
        commentsByPost: { ...s.commentsByPost, [id]: [] },
      }));
      return true;
    } catch {
      return false;
    }
  },

  fetchComments: async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      set((s) => ({
        commentsByPost: { ...s.commentsByPost, [postId]: data.comments },
      }));
    } catch {}
  },

  createComment: async (postId, body) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      set((s) => ({
        commentsByPost: {
          ...s.commentsByPost,
          [postId]: [...(s.commentsByPost[postId] || []), data.comment],
        },
      }));
      return data.comment;
    } catch {
      return null;
    }
  },

  updateComment: async (postId, commentId, body) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      set((s) => ({
        commentsByPost: {
          ...s.commentsByPost,
          [postId]: (s.commentsByPost[postId] || []).map((c) =>
            c.id === commentId ? data.comment : c
          ),
        },
      }));
      return true;
    } catch {
      return false;
    }
  },

  deleteComment: async (postId, commentId) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) return false;
      set((s) => ({
        commentsByPost: {
          ...s.commentsByPost,
          [postId]: (s.commentsByPost[postId] || []).filter(
            (c) => c.id !== commentId
          ),
        },
      }));
      return true;
    } catch {
      return false;
    }
  },

  votePost: async (postId, vote) => {
    const prev = { posts: get().posts, userVotes: get().userVotes };
    // Updates local vote state immediately so the interface responds before
    // the vote request has finished.
    set((s) => {
      const existingVote = s.userVotes[postId];
      const newVotes = { ...s.userVotes };
      let supportDelta = 0;
      let opposeDelta = 0;
      if (existingVote === vote) {
        // Removes the vote when the user clicks the same choice again.
        delete newVotes[postId];
        if (vote === "support") supportDelta = -1;
        else opposeDelta = -1;
      } else {
        newVotes[postId] = vote;
        if (vote === "support") {
          supportDelta = 1;
          if (existingVote === "oppose") opposeDelta = -1;
        } else {
          opposeDelta = 1;
          if (existingVote === "support") supportDelta = -1;
        }
      }
      return {
        posts: s.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                supportCount: p.supportCount + supportDelta,
                opposeCount: p.opposeCount + opposeDelta,
              }
            : p
        ),
        userVotes: newVotes,
      };
    });
    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) {
        set({ posts: prev.posts, userVotes: prev.userVotes });
        return;
      }
      const data = await res.json();
      // Replaces optimistic counters with the authoritative values returned
      // by the server so local state stays aligned with persisted data.
      set((s) => {
        const newVotes = { ...s.userVotes };
        if (data.action === "removed") delete newVotes[postId];
        else newVotes[postId] = vote;
        return {
          posts: s.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  supportCount: data.counts.support,
                  opposeCount: data.counts.oppose,
                }
              : p
          ),
          userVotes: newVotes,
        };
      });
    } catch {
      set({ posts: prev.posts, userVotes: prev.userVotes });
    }
  },

  voteComment: async (postId, commentId, vote) => {
    const prev = {
      commentsByPost: get().commentsByPost,
      userVotes: get().userVotes,
    };
    // Applies the same optimistic strategy to comment votes so discussion
    // threads update immediately.
    set((s) => {
      const existingVote = s.userVotes[commentId];
      const newVotes = { ...s.userVotes };
      let supportDelta = 0;
      let opposeDelta = 0;
      if (existingVote === vote) {
        delete newVotes[commentId];
        if (vote === "support") supportDelta = -1;
        else opposeDelta = -1;
      } else {
        newVotes[commentId] = vote;
        if (vote === "support") {
          supportDelta = 1;
          if (existingVote === "oppose") opposeDelta = -1;
        } else {
          opposeDelta = 1;
          if (existingVote === "support") supportDelta = -1;
        }
      }
      return {
        commentsByPost: {
          ...s.commentsByPost,
          [postId]: (s.commentsByPost[postId] || []).map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  supportCount: c.supportCount + supportDelta,
                  opposeCount: c.opposeCount + opposeDelta,
                }
              : c
          ),
        },
        userVotes: newVotes,
      };
    });
    try {
      const res = await fetch(
        `/api/posts/${postId}/comments/${commentId}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vote }),
        }
      );
      if (!res.ok) {
        set({ commentsByPost: prev.commentsByPost, userVotes: prev.userVotes });
        return;
      }
      const data = await res.json();
      set((s) => {
        const newVotes = { ...s.userVotes };
        if (data.action === "removed") delete newVotes[commentId];
        else newVotes[commentId] = vote;
        return {
          commentsByPost: {
            ...s.commentsByPost,
            [postId]: (s.commentsByPost[postId] || []).map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    supportCount: data.counts.support,
                    opposeCount: data.counts.oppose,
                  }
                : c
            ),
          },
          userVotes: newVotes,
        };
      });
    } catch {
      set({ commentsByPost: prev.commentsByPost, userVotes: prev.userVotes });
    }
  },

  resetUserState: () => set({ userVotes: {} }),
}));
