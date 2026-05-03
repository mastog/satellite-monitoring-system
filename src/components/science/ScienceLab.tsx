"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GlassPanel from "@/components/ui/GlassPanel";
import VoteButtons from "@/components/ui/VoteButtons";
import SvgIcon from "@/components/ui/SvgIcon";
import ScienceStreamMode from "@/components/science/ScienceStreamMode";
import { rankArticles, rankPapers } from "@/lib/search/semanticSearch";
import type { Article, Paper } from "@/lib/content/data";

interface SyncedPaper extends Paper {
  apiSource?: string;
}

const CATEGORIES = [
  { id: "all", label: "ALL" },
  { id: "earth-science", label: "EARTH SCI" },
  { id: "sustainability", label: "SDG" },
  { id: "space-tech", label: "SPACE TECH" },
  { id: "climate", label: "CLIMATE" },
];

function formatTimeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function SkeletonCard() {
  return (
    <div className="glass-panel p-4 space-y-3 animate-pulse">
      <div
        className="h-3 rounded w-1/4"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />
      <div
        className="h-4 rounded w-3/4"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
      <div
        className="h-3 rounded w-full"
        style={{ background: "rgba(255,255,255,0.05)" }}
      />
      <div
        className="h-3 rounded w-5/6"
        style={{ background: "rgba(255,255,255,0.04)" }}
      />
      <div className="flex gap-2 mt-2">
        <div
          className="h-5 w-14 rounded"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
        <div
          className="h-5 w-16 rounded"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
        <div
          className="h-5 w-12 rounded"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
      </div>
    </div>
  );
}

export default function ScienceLab() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") ?? ""
  );
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"articles" | "papers">("articles");
  const [viewMode, setViewMode] = useState<"lab" | "stream">("lab");
  const [isListening, setIsListening] = useState(false);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  const [debouncedQuery, setDebouncedQuery] = useState(
    () => searchParams.get("q") ?? ""
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [articles, setArticles] = useState<Article[]>([]);
  const [papers, setPapers] = useState<SyncedPaper[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [isLoadingPapers, setIsLoadingPapers] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>("loading");

  // Loads synced science articles on mount and falls back to local mock content when the API is unavailable.
  useEffect(() => {
    fetch("/api/science/articles")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.articles) && json.articles.length > 0) {
          setArticles(json.articles);
          setLastSyncTime(json.fetchedAt);
          setDataSource(json.source);
          return;
        }

        return import("@/lib/content/data").then((m) => {
          setArticles(m.MOCK_ARTICLES);
          setDataSource("mock");
        });
      })
      .catch(() => {
        import("@/lib/content/data").then((m) => {
          setArticles(m.MOCK_ARTICLES);
          setDataSource("mock");
        });
      })
      .finally(() => setIsLoadingArticles(false));
  }, []);

  // Loads synced paper records on mount and falls back to local mock content when the API is unavailable.
  useEffect(() => {
    fetch("/api/science/papers")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.papers) && json.papers.length > 0) {
          setPapers(json.papers);
          if (!lastSyncTime && json.fetchedAt) setLastSyncTime(json.fetchedAt);
          return;
        }

        return import("@/lib/content/data").then((m) => {
          setPapers(m.MOCK_PAPERS.map((p) => ({ ...p, apiSource: "mock" })));
        });
      })
      .catch(() => {
        import("@/lib/content/data").then((m) => {
          setPapers(m.MOCK_PAPERS.map((p) => ({ ...p, apiSource: "mock" })));
        });
      })
      .finally(() => setIsLoadingPapers(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounces free-text search input so ranking work only runs after the user pauses typing.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const filteredArticles = useMemo(() => {
    const pool =
      activeCategory === "all"
        ? articles
        : articles.filter((a) => a.category === activeCategory);
    if (!debouncedQuery) return pool.map((item) => ({ item, score: 0 }));
    return rankArticles(debouncedQuery, pool);
  }, [articles, debouncedQuery, activeCategory]);

  const maxArticleScore = useMemo(
    () => filteredArticles.reduce((m, r) => Math.max(m, r.score), 0),
    [filteredArticles]
  );

  const filteredPapers = useMemo(() => {
    if (!debouncedQuery) return papers.map((item) => ({ item, score: 0 }));
    return rankPapers(debouncedQuery, papers);
  }, [papers, debouncedQuery]);

  const maxPaperScore = useMemo(
    () => filteredPapers.reduce((m, r) => Math.max(m, r.score), 0),
    [filteredPapers]
  );

  const handleVoiceSearch = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognitionCtor =
      win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Voice search is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: {
      results: { 0: { 0: { transcript: string } } };
    }) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  }, []);

  const categoryColors: Record<string, string> = {
    "earth-science": "var(--neon-cyan)",
    sustainability: "var(--neon-green)",
    "space-tech": "var(--holo-purple)",
    climate: "var(--neon-orange)",
  };

  const apiSourceColors: Record<
    string,
    { bg: string; color: string; border: string }
  > = {
    "semantic-scholar": {
      bg: "rgba(0,229,255,0.08)",
      color: "var(--neon-cyan)",
      border: "rgba(0,229,255,0.2)",
    },
    arxiv: {
      bg: "rgba(255,107,44,0.08)",
      color: "var(--neon-orange)",
      border: "rgba(255,107,44,0.2)",
    },
    mock: {
      bg: "rgba(180,74,255,0.08)",
      color: "var(--holo-purple)",
      border: "rgba(180,74,255,0.2)",
    },
  };

  const isStreamMode = viewMode === "stream";

  return (
    <div
      className={
        isStreamMode
          ? "flex h-full min-h-0 flex-col gap-4 overflow-hidden px-6 pb-4 pt-5"
          : "min-h-full space-y-6 p-6 pb-8"
      }
    >
      {/* Introduces the science workspace and summarizes the content sources available on the page. */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h2
            className="text-lg font-bold tracking-[0.15em] text-glow-cyan"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            SCIENCE LAB
          </h2>
          <p
            className="mt-1 text-[15px] tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            Earth science popularization, automated paper sync, and intelligent
            search
          </p>
        </div>
        <div className="flex gap-1">
          {(["lab", "stream"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                if (mode === "stream") {
                  setActiveTab("articles");
                }
              }}
              className="rounded-xl px-4 py-2 text-[13px] font-bold tracking-[0.16em] uppercase transition-all"
              style={{
                background:
                  viewMode === mode
                    ? "linear-gradient(135deg, rgba(180,74,255,0.18), rgba(0,229,255,0.12))"
                    : "rgba(255,255,255,0.02)",
                color:
                  viewMode === mode ? "var(--text-primary)" : "var(--text-dim)",
                border:
                  viewMode === mode
                    ? "1px solid rgba(180,74,255,0.26)"
                    : "1px solid rgba(255,255,255,0.05)",
                boxShadow:
                  viewMode === mode
                    ? "0 10px 34px rgba(0,0,0,0.2)"
                    : "none",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Collects typed or spoken search queries used to rank both article and paper results. */}
      {!isStreamMode && (
        <GlassPanel delay={0.1} noPadding>
        <div className="flex items-center gap-3 p-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-dim)"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask in English or Chinese... (e.g., 'How do satellites track deforestation?')"
            className="flex-1 bg-transparent border-none outline-none text-[14px]"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-exo2)",
              caretColor: "var(--neon-cyan)",
            }}
          />
          <button
            onClick={handleVoiceSearch}
            className="p-2 rounded-lg transition-all"
            style={{
              background: isListening
                ? "var(--neon-red-dim)"
                : "rgba(0,0,0,0.3)",
              border: isListening
                ? "1px solid rgba(255,58,92,0.3)"
                : "1px solid var(--border-subtle)",
              color: isListening ? "var(--neon-red)" : "var(--text-dim)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
          {isListening && (
            <motion.span
              className="text-[13px] font-bold tracking-wider"
              style={{ color: "var(--neon-red)" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              LISTENING...
            </motion.span>
          )}
        </div>
        </GlassPanel>
      )}

      {/* Switches between article and paper results and narrows article content by category. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isStreamMode && (
          <div className="flex gap-1">
          {(["articles", "papers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-[14px] font-bold tracking-[0.12em] uppercase transition-all"
              style={{
                background:
                  activeTab === tab ? "var(--neon-cyan-dim)" : "transparent",
                color:
                  activeTab === tab ? "var(--neon-cyan)" : "var(--text-dim)",
                border:
                  activeTab === tab
                    ? "1px solid rgba(0,229,255,0.2)"
                    : "1px solid transparent",
              }}
            >
              {tab}
            </button>
          ))}
          </div>
        )}
        {activeTab === "articles" && !isStreamMode && (
          <div className="flex gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="px-2.5 py-1 rounded text-[13px] font-bold tracking-wider uppercase transition-all"
                style={{
                  background:
                    activeCategory === cat.id
                      ? "rgba(0,229,255,0.1)"
                      : "transparent",
                  color:
                    activeCategory === cat.id
                      ? "var(--neon-cyan)"
                      : "var(--text-dim)",
                  border:
                    activeCategory === cat.id
                      ? "1px solid rgba(0,229,255,0.15)"
                      : "1px solid transparent",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Renders the active results view, including loading, empty, and expanded-card states. */}
      <AnimatePresence mode="wait">
        {isStreamMode ? (
          <motion.div
            key="stream"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-0 flex-1 overflow-hidden"
          >
            <ScienceStreamMode
              articles={articles}
              activeCategory={activeCategory}
              searchQuery={debouncedQuery}
            />
          </motion.div>
        ) : activeTab === "articles" ? (
          <motion.div
            key="articles"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {isLoadingArticles ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                {filteredArticles.map(({ item: article, score }, i) => {
                  const isExpanded = expandedArticle === article.id;
                  return (
                    <motion.div
                      key={article.id}
                      className="glass-panel holo-shimmer cursor-pointer overflow-hidden"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileHover={{ borderColor: "rgba(0,229,255,0.2)" }}
                      onClick={() =>
                        setExpandedArticle(
                          expandedArticle === article.id ? null : article.id
                        )
                      }
                    >
                      {/* Displays a thin color accent that reflects the article's category. */}
                      <div
                        className="absolute top-0 left-0 w-1 h-full"
                        style={{
                          background:
                            categoryColors[article.category] ||
                            "var(--neon-cyan)",
                        }}
                      />

                      <div className="p-4 pl-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className="text-[13px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase"
                                style={{
                                  background: `${categoryColors[article.category]}15`,
                                  color: categoryColors[article.category],
                                  border: `1px solid ${categoryColors[article.category]}30`,
                                }}
                              >
                                {article.category.replace("-", " ")}
                              </span>
                              <span
                                className="text-[13px] tracking-wider"
                                style={{ color: "var(--text-dim)" }}
                              >
                                {article.date}
                              </span>
                              <span
                                className="text-[13px] tracking-wider"
                                style={{ color: "var(--text-dim)" }}
                              >
                                {article.readTime}
                              </span>
                              {debouncedQuery &&
                                score > 0 &&
                                maxArticleScore > 0 && (
                                  <span
                                    className="text-[12px] px-1.5 py-0.5 rounded font-bold tracking-wider"
                                    style={{
                                      background: "rgba(57,255,127,0.08)",
                                      color: "var(--neon-green)",
                                      border: "1px solid rgba(57,255,127,0.15)",
                                      fontFamily: "var(--font-fira-code)",
                                    }}
                                  >
                                    {Math.round(
                                      (score / maxArticleScore) * 100
                                    )}
                                    % match
                                  </span>
                                )}
                            </div>
                            <h3
                              className="text-[15px] font-semibold mb-1"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {article.title}
                            </h3>
                            <motion.div
                              initial={false}
                              animate={{
                                height: isExpanded ? "auto" : 0,
                                opacity: isExpanded ? 1 : 0,
                                marginTop: isExpanded ? 8 : 0,
                              }}
                              transition={{
                                height: {
                                  duration: 0.34,
                                  ease: [0.22, 1, 0.36, 1],
                                },
                                opacity: { duration: 0.2, ease: "easeOut" },
                                marginTop: {
                                  duration: 0.28,
                                  ease: [0.22, 1, 0.36, 1],
                                },
                              }}
                              style={{ overflow: "hidden" }}
                              aria-hidden={!isExpanded}
                            >
                              <p
                                className="text-[15px] leading-relaxed"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {article.abstract}
                              </p>
                              <motion.div
                                className="mt-3"
                                initial={false}
                                animate={{
                                  opacity: isExpanded ? 1 : 0,
                                  y: isExpanded ? 0 : -4,
                                }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                              >
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  tabIndex={isExpanded ? 0 : -1}
                                  style={{
                                    pointerEvents: isExpanded ? "auto" : "none",
                                  }}
                                  className="cyber-btn inline-flex items-center gap-1.5 !text-[14px]"
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                  </svg>
                                  READ ARTICLE
                                </a>
                              </motion.div>
                            </motion.div>
                          </div>
                        </div>

                        {/* Lists the auto-generated tags attached to the article for quick topic scanning. */}
                        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                          <span
                            className="text-[13px] tracking-wider uppercase"
                            style={{ color: "var(--text-dim)" }}
                          >
                            AUTO-TAGS:
                          </span>
                          {article.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[13px] px-1.5 py-0.5 rounded font-semibold"
                              style={{
                                background: "rgba(180,74,255,0.08)",
                                color: "var(--holo-purple)",
                                border: "1px solid rgba(180,74,255,0.15)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Lets the user react to the article without leaving the current result card. */}
                        <VoteButtons
                          voteKey={`article-${article.id}`}
                          targetType="article"
                        />
                      </div>
                    </motion.div>
                  );
                })}
                {filteredArticles.length === 0 && (
                  <div
                    className="text-center py-12"
                    style={{ color: "var(--text-dim)" }}
                  >
                    <div className="mb-2" style={{ color: "var(--text-dim)" }}>
                      <SvgIcon name="search-lens" size={28} />
                    </div>
                    <div className="text-[15px] tracking-wider">
                      No articles match your search criteria
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="papers"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div
              className="text-[14px] p-3 rounded-lg flex items-center gap-2"
              style={{
                background: "var(--holo-purple-dim)",
                border: "1px solid rgba(180,74,255,0.2)",
                color: "var(--holo-purple)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
              </svg>
              <span>
                Auto-synced from Semantic Scholar &amp; arXiv
                {dataSource === "mock" ? " (using cached data)" : ""}
                {" — "}Last sync: {formatTimeAgo(lastSyncTime)}
              </span>
            </div>

            {isLoadingPapers ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                {filteredPapers.map(({ item: paper, score }, i) => {
                  const srcStyle =
                    apiSourceColors[
                      (paper as SyncedPaper).apiSource || "mock"
                    ] || apiSourceColors.mock;
                  return (
                    <motion.div
                      key={paper.id}
                      className="glass-panel p-4"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3
                          className="text-[14px] font-semibold flex-1"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {paper.title}
                        </h3>
                        {(paper as SyncedPaper).apiSource &&
                          (paper as SyncedPaper).apiSource !== "mock" && (
                            <span
                              className="text-[12px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase shrink-0"
                              style={{
                                background: srcStyle.bg,
                                color: srcStyle.color,
                                border: `1px solid ${srcStyle.border}`,
                              }}
                            >
                              {(paper as SyncedPaper).apiSource ===
                              "semantic-scholar"
                                ? "S2"
                                : "arXiv"}
                            </span>
                          )}
                        {debouncedQuery && score > 0 && maxPaperScore > 0 && (
                          <span
                            className="text-[12px] px-1.5 py-0.5 rounded font-bold tracking-wider shrink-0"
                            style={{
                              background: "rgba(57,255,127,0.08)",
                              color: "var(--neon-green)",
                              border: "1px solid rgba(57,255,127,0.15)",
                              fontFamily: "var(--font-fira-code)",
                            }}
                          >
                            {Math.round((score / maxPaperScore) * 100)}% match
                          </span>
                        )}
                      </div>
                      <div
                        className="text-[14px] mb-2"
                        style={{
                          color: "var(--neon-cyan)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {paper.authors}
                      </div>
                      <p
                        className="text-[14px] leading-relaxed mb-3"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {paper.abstract}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[13px] px-1.5 py-0.5 rounded font-bold"
                            style={{
                              background: "rgba(0,0,0,0.3)",
                              color: "var(--text-dim)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            {paper.journal} ({paper.year})
                          </span>
                        </div>
                        {paper.doi && (
                          <a
                            href={`https://doi.org/${paper.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-mono transition-colors"
                            style={{
                              color: "var(--text-dim)",
                              fontFamily: "var(--font-fira-code)",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.color = "var(--neon-cyan)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.color = "var(--text-dim)")
                            }
                          >
                            DOI: {paper.doi}
                          </a>
                        )}
                      </div>

                      {/* Lets the user react to the paper directly from the compact result card. */}
                      <VoteButtons
                        voteKey={`paper-${paper.id}`}
                        targetType="paper"
                      />
                    </motion.div>
                  );
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
