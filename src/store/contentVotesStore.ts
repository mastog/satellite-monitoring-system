import { create } from "zustand";

interface ContentVotesState {
  counts: Record<string, { support: number; oppose: number }>;
  userVotes: Record<string, "support" | "oppose">;
  sentimentTrend: number[] | null;
  isLoading: boolean;
  fetched: boolean;
  fetchVotes: () => Promise<void>;
  fetchSentimentTrend: () => Promise<void>;
  castVote: (
    targetId: string,
    targetType: string,
    vote: "support" | "oppose"
  ) => Promise<void>;
  reset: () => void;
}

export const useContentVotesStore = create<ContentVotesState>((set, get) => ({
  counts: {},
  userVotes: {},
  sentimentTrend: null,
  isLoading: false,
  fetched: false,

  fetchSentimentTrend: async () => {
    try {
      const res = await fetch("/api/sentiment-trend");
      if (res.ok) {
        const json = await res.json();
        set({ sentimentTrend: json.data });
      }
    } catch {}
  },

  fetchVotes: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/content-votes");
      if (res.ok) {
        const data = await res.json();
        set({
          counts: data.counts,
          userVotes: data.userVotes,
          isLoading: false,
          fetched: true,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  castVote: async (targetId, targetType, vote) => {
    const { counts, userVotes } = get();
    const prev = userVotes[targetId];
    const prevCounts = counts[targetId] || { support: 0, oppose: 0 };

    // Applies the vote change locally before the request completes so content
    // cards respond without waiting on the network round trip.
    const newCounts = { ...counts };
    const newUserVotes = { ...userVotes };
    const c = { ...prevCounts };

    if (prev === vote) {
      // Clears the current vote when the user repeats the same action.
      c[vote]--;
      delete newUserVotes[targetId];
    } else {
      if (prev) c[prev]--;
      c[vote]++;
      newUserVotes[targetId] = vote;
    }
    newCounts[targetId] = c;
    set({ counts: newCounts, userVotes: newUserVotes });

    try {
      await fetch("/api/content-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, targetType, vote }),
      });
      get().fetchSentimentTrend();
    } catch {
      // Restores the previous counts and vote selection if the request fails.
      set({ counts, userVotes });
    }
  },

  reset: () => {
    set({ userVotes: {}, sentimentTrend: null });
    get().fetchVotes();
    get().fetchSentimentTrend();
  },
}));
