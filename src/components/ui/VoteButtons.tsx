"use client";

import { useContentVotesStore } from "@/store/contentVotesStore";
import { useAuthStore } from "@/store/authStore";
import { useAppStore } from "@/store/appStore";

interface VoteButtonsProps {
  voteKey: string;
  targetType: "sdg" | "article" | "paper" | "indicator";
}

export default function VoteButtons({ voteKey, targetType }: VoteButtonsProps) {
  const { counts, userVotes, castVote } = useContentVotesStore();
  const { isAuthenticated } = useAuthStore();
  const { setShowAuthModal } = useAppStore();
  const current = userVotes[voteKey];
  const c = counts[voteKey] || { support: 0, oppose: 0 };

  const handleVote = (e: React.MouseEvent, vote: "support" | "oppose") => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    castVote(voteKey, targetType, vote);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        onClick={(e) => handleVote(e, "support")}
        className="inline-flex items-center gap-1 px-2 rounded text-[14px] font-bold tracking-wider transition-all"
        style={{
          height: "24px",
          background:
            current === "support" ? "var(--neon-green-dim)" : "transparent",
          color:
            current === "support" ? "var(--neon-green)" : "var(--text-dim)",
          border:
            current === "support"
              ? "1px solid rgba(57,255,127,0.3)"
              : "1px solid var(--border-subtle)",
        }}
      >
        <span style={{ fontSize: "12px", lineHeight: 1 }}>{"\u25B2"}</span>
        <span style={{ lineHeight: 1 }}>SUPPORT</span>
        <span
          style={{
            fontFamily: "var(--font-fira-code)",
            opacity: 0.8,
            fontSize: "13px",
            lineHeight: 1,
          }}
        >
          ({c.support})
        </span>
      </button>
      <button
        onClick={(e) => handleVote(e, "oppose")}
        className="inline-flex items-center gap-1 px-2 rounded text-[14px] font-bold tracking-wider transition-all"
        style={{
          height: "24px",
          background:
            current === "oppose" ? "var(--neon-red-dim)" : "transparent",
          color: current === "oppose" ? "var(--neon-red)" : "var(--text-dim)",
          border:
            current === "oppose"
              ? "1px solid rgba(255,58,92,0.3)"
              : "1px solid var(--border-subtle)",
        }}
      >
        <span style={{ fontSize: "12px", lineHeight: 1 }}>{"\u25BC"}</span>
        <span style={{ lineHeight: 1 }}>OPPOSE</span>
        <span
          style={{
            fontFamily: "var(--font-fira-code)",
            opacity: 0.8,
            fontSize: "13px",
            lineHeight: 1,
          }}
        >
          ({c.oppose})
        </span>
      </button>
    </div>
  );
}
