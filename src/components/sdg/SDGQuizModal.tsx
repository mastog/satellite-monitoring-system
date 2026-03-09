"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SDG_DEFINITIONS } from "@/lib/sdg/engine";
import { getQuizQuestions, type QuizQuestion } from "@/lib/sdg/quizBank";
import SDGIcon from "@/components/sdg/SDGIcon";
import { useAuthStore } from "@/store/authStore";
import { usePointsStore } from "@/store/pointsStore";

interface SDGQuizModalProps {
  sdgNumber: number;
  onClose: () => void;
}

type QuizState = "idle" | "playing" | "reviewing" | "results";

const QUESTIONS_PER_QUIZ = 5;

/* Provides the inline SVG motifs used by the quiz modal's decorative and feedback states. */

function IconCorrect({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.3"
      />
      <circle cx="12" cy="12" r="8" fill={`${color}18`} />
      <path
        d="M8 12.5l2.5 2.5 5.5-5.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconIncorrect({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.3"
      />
      <circle cx="12" cy="12" r="8" fill={`${color}18`} />
      <path
        d="M9 9l6 6M15 9l-6 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconQuizHero({ color, size = 72 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      {/* Draws the outer scanning ring around the quiz hero icon. */}
      <circle
        cx="36"
        cy="36"
        r="34"
        stroke={color}
        strokeWidth="0.5"
        opacity="0.15"
      />
      <circle
        cx="36"
        cy="36"
        r="28"
        stroke={color}
        strokeWidth="0.5"
        opacity="0.25"
        strokeDasharray="4 6"
      />
      {/* Draws the central hexagonal frame used by the quiz hero icon. */}
      <path
        d="M36 12 L54.8 23 L54.8 45 L36 56 L17.2 45 L17.2 23 Z"
        stroke={color}
        strokeWidth="1"
        fill={`${color}08`}
        opacity="0.6"
      />
      {/* Adds the inner diamond layer to the quiz hero icon. */}
      <path
        d="M36 20 L48 34 L36 48 L24 34 Z"
        stroke={color}
        strokeWidth="0.8"
        fill={`${color}10`}
        opacity="0.5"
      />
      {/* Places the question-mark glyph at the center of the hero icon. */}
      <text
        x="36"
        y="39"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="18"
        fontWeight="700"
        fontFamily="var(--font-orbitron)"
        opacity="0.9"
      >
        ?
      </text>
      {/* Adds the small corner nodes that complete the scanning motif. */}
      <circle cx="36" cy="12" r="2" fill={color} opacity="0.5" />
      <circle cx="54.8" cy="23" r="1.5" fill={color} opacity="0.35" />
      <circle cx="54.8" cy="45" r="1.5" fill={color} opacity="0.35" />
      <circle cx="36" cy="56" r="2" fill={color} opacity="0.5" />
      <circle cx="17.2" cy="23" r="1.5" fill={color} opacity="0.35" />
      <circle cx="17.2" cy="45" r="1.5" fill={color} opacity="0.35" />
    </svg>
  );
}

function DailyAttemptsMeter({
  remaining,
  total,
  canEarn,
  color,
}: {
  remaining: number;
  total: number;
  canEarn: boolean;
  color: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg"
      style={{
        background: canEarn ? `${color}08` : "rgba(255,107,44,0.06)",
        border: canEarn
          ? `1px solid ${color}25`
          : "1px solid rgba(255,107,44,0.18)",
      }}
    >
      {/* Adds the small pip indicators beneath the hero icon. */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < remaining;
          return (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: 7,
                height: 7,
                background: filled
                  ? canEarn
                    ? color
                    : "var(--neon-orange)"
                  : "rgba(255,255,255,0.08)",
                boxShadow: filled
                  ? `0 0 6px ${canEarn ? color : "var(--neon-orange)"}50`
                  : "none",
              }}
            />
          );
        })}
      </div>
      <span
        className="text-[12px] font-bold tracking-[0.08em]"
        style={{
          color: canEarn ? color : "var(--neon-orange)",
          fontFamily: "var(--font-fira-code)",
        }}
      >
        {canEarn ? `${remaining}/${total} REWARDED` : "LIMIT REACHED"}
      </span>
    </div>
  );
}

export default function SDGQuizModal({
  sdgNumber,
  onClose,
}: SDGQuizModalProps) {
  const { isAuthenticated } = useAuthStore();
  const { fetchPoints } = usePointsStore();

  const sdgDef = SDG_DEFINITIONS.find((d) => d.sdgNumber === sdgNumber);
  const sdgColor = sdgDef?.color || "#00e5ff";
  const sdgTitle = sdgDef?.title || `SDG ${sdgNumber}`;

  const [state, setState] = useState<QuizState>("idle");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<
    { questionId: string; selectedIndex: number; selectedText: string }[]
  >([]);
  const [reviewResult, setReviewResult] = useState<{
    correct: boolean;
    explanation: string;
    correctIndex: number;
  } | null>(null);

  // Tracks quiz completion, review state, and point-award results across one quiz session.
  const [finalScore, setFinalScore] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [dailyAttemptsUsed, setDailyAttemptsUsed] = useState(0);
  const [canEarnPoints, setCanEarnPoints] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Stores the player's remaining daily attempts and completion status.
  const [dailyStatus, setDailyStatus] = useState<{
    dailyAttemptsUsed: number;
    dailyPointsEarned: number;
    canEarnPoints: boolean;
  } | null>(null);

  // Loads the daily attempt status when the modal opens so the start screen reflects the current limit.
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/quiz/status")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setDailyStatus(data);
      })
      .catch((e) => console.error("Quiz status error:", e));
  }, [isAuthenticated]);

  const startQuiz = useCallback(() => {
    const q = getQuizQuestions(sdgNumber, QUESTIONS_PER_QUIZ);
    setQuestions(q);
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswers([]);
    setReviewResult(null);
    setState("playing");
  }, [sdgNumber]);

  // Lets the player change the selected option until they explicitly confirm the answer.
  const handleSelect = (optionIndex: number) => {
    if (state !== "playing") return;
    setSelectedOption(optionIndex);
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    const question = questions[currentIndex];
    const correct = selectedOption === question.correctIndex;

    // Stores the chosen answer for scoring and later review.
    const newAnswers = [
      ...answers,
      {
        questionId: question.id,
        selectedIndex: selectedOption,
        selectedText: question.options[selectedOption],
      },
    ];
    setAnswers(newAnswers);

    // Switches into review mode so the player can see immediate feedback before the next question.
    setReviewResult({
      correct,
      explanation: question.explanation,
      correctIndex: question.correctIndex,
    });
    setState("reviewing");
  };

  const handleContinue = async () => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      // Submits the finished quiz to the API so points and daily status can be updated.
      setSubmitting(true);
      try {
        const res = await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sdgNumber, answers }),
        });
        const data = await res.json();
        if (!data.error) {
          setFinalScore(data.score);
          setFinalTotal(data.total);
          setPointsAwarded(data.pointsAwarded);
          setDailyAttemptsUsed(data.dailyAttemptsUsed);
          setCanEarnPoints(data.canEarnPoints);
          if (data.pointsAwarded > 0) fetchPoints();
        } else {
          calcLocalScore();
        }
      } catch (e) {
        console.error("Quiz submit error:", e);
        calcLocalScore();
      } finally {
        setSubmitting(false);
      }
      setState("results");
    } else {
      setCurrentIndex(nextIndex);
      setSelectedOption(null);
      setReviewResult(null);
      setState("playing");
    }
  };

  const calcLocalScore = () => {
    const correctCount = answers.filter((a, i) => {
      const q = questions[i];
      return q && a.selectedIndex === q.correctIndex;
    }).length;
    setFinalScore(correctCount);
    setFinalTotal(questions.length);
  };

  const currentQuestion = questions[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Darkens the page and catches outside clicks while the quiz modal is open. */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: "rgba(6,8,13,0.92)",
            backdropFilter: "blur(8px)",
          }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Hosts the full quiz experience, including idle, play, review, and results states. */}
        <motion.div
          className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
          style={{
            background: "rgba(12,16,24,0.95)",
            border: `1px solid ${sdgColor}40`,
            boxShadow: `0 0 40px ${sdgColor}15, 0 0 80px rgba(0,0,0,0.5)`,
          }}
          initial={{ scale: 0.9, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 30, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Adds a thin accent bar across the top edge of the modal. */}
          <div className="h-[2px]" style={{ background: sdgColor }} />

          {/* Displays the quiz title, status copy, and close control. */}
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SDGIcon sdgNumber={sdgNumber} color={sdgColor} size={28} />
              <div>
                <div
                  className="text-[12px] font-bold tracking-[0.15em] uppercase"
                  style={{
                    color: sdgColor,
                    fontFamily: "var(--font-orbitron)",
                  }}
                >
                  SDG {sdgNumber} QUIZ
                </div>
                <div
                  className="text-[14px] font-semibold tracking-wide"
                  style={{ color: "var(--text-primary)" }}
                >
                  {sdgTitle}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: "var(--text-dim)",
                border: "1px solid var(--border-subtle)",
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
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 pb-6">
            {/* Shows the start screen before the player begins the daily quiz. */}
            {state === "idle" && (
              <motion.div
                className="text-center py-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Displays the animated hero icon that introduces the quiz. */}
                <motion.div
                  className="mx-auto mb-5"
                  style={{ width: 72, height: 72 }}
                  animate={{ rotate: [0, 0, 360] }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <IconQuizHero color={sdgColor} size={72} />
                </motion.div>

                <h3
                  className="text-base font-bold tracking-wider mb-2"
                  style={{
                    fontFamily: "var(--font-orbitron)",
                    color: "var(--text-primary)",
                  }}
                >
                  Test Your Knowledge
                </h3>
                <p
                  className="text-[14px] max-w-sm mx-auto mb-4 leading-relaxed"
                  style={{ color: "var(--text-dim)" }}
                >
                  {QUESTIONS_PER_QUIZ} questions about{" "}
                  <span style={{ color: sdgColor }}>{sdgTitle}</span>. Up to{" "}
                  {QUESTIONS_PER_QUIZ * 5} pts per quiz.
                </p>

                {/* Shows how many quiz attempts remain for the current day. */}
                {dailyStatus && (
                  <div className="mb-5">
                    <DailyAttemptsMeter
                      remaining={3 - dailyStatus.dailyAttemptsUsed}
                      total={3}
                      canEarn={dailyStatus.canEarnPoints}
                      color={sdgColor}
                    />
                  </div>
                )}

                <motion.button
                  onClick={startQuiz}
                  className="px-6 py-2.5 rounded-lg text-[14px] font-bold tracking-[0.12em] uppercase"
                  style={{
                    background: `${sdgColor}20`,
                    color: sdgColor,
                    border: `1px solid ${sdgColor}50`,
                    fontFamily: "var(--font-orbitron)",
                  }}
                  whileHover={{
                    scale: 1.03,
                    boxShadow: `0 0 20px ${sdgColor}30`,
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  Start Quiz
                </motion.button>
              </motion.div>
            )}

            {/* Shows the current question and answer choices while the quiz is in progress. */}
            {state === "playing" && currentQuestion && (
              <motion.div
                key={`question-${currentIndex}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Shows segmented progress through the current quiz run. */}
                <div className="flex items-center gap-2 mb-4">
                  {questions.map((_, idx) => (
                    <div
                      key={idx}
                      className="h-1.5 flex-1 rounded-full transition-all"
                      style={{
                        background:
                          idx < currentIndex
                            ? sdgColor
                            : idx === currentIndex
                              ? `${sdgColor}80`
                              : "rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </div>

                <div
                  className="text-[12px] font-bold tracking-[0.15em] uppercase mb-2"
                  style={{
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-fira-code)",
                  }}
                >
                  Question {currentIndex + 1} / {questions.length}
                </div>

                <p
                  className="text-[15px] font-semibold leading-relaxed mb-5"
                  style={{ color: "var(--text-primary)" }}
                >
                  {currentQuestion.question}
                </p>

                {/* Lists the answer options and keeps them re-selectable until confirmation. */}
                <div className="space-y-2.5">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    return (
                      <motion.button
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        className="w-full text-left p-3 rounded-lg text-[14px] transition-all"
                        style={{
                          background: isSelected
                            ? `${sdgColor}15`
                            : "rgba(0,0,0,0.3)",
                          border: isSelected
                            ? `1px solid ${sdgColor}60`
                            : "1px solid var(--border-subtle)",
                          color: isSelected
                            ? sdgColor
                            : "var(--text-secondary)",
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 text-[12px] font-bold"
                          style={{
                            background: isSelected
                              ? `${sdgColor}30`
                              : "rgba(255,255,255,0.06)",
                            color: isSelected ? sdgColor : "var(--text-dim)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Advances from selection to review or from review to the next question. */}
                <div className="flex justify-end mt-5">
                  <motion.button
                    onClick={handleNext}
                    disabled={selectedOption === null}
                    className="px-5 py-2 rounded-lg text-[13px] font-bold tracking-[0.12em] uppercase transition-all"
                    style={{
                      background:
                        selectedOption !== null
                          ? `${sdgColor}20`
                          : "rgba(0,0,0,0.2)",
                      color:
                        selectedOption !== null ? sdgColor : "var(--text-dim)",
                      border:
                        selectedOption !== null
                          ? `1px solid ${sdgColor}50`
                          : "1px solid var(--border-subtle)",
                      fontFamily: "var(--font-orbitron)",
                      cursor: selectedOption !== null ? "pointer" : "default",
                    }}
                    whileHover={selectedOption !== null ? { scale: 1.03 } : {}}
                    whileTap={selectedOption !== null ? { scale: 0.97 } : {}}
                  >
                    {currentIndex === questions.length - 1
                      ? "Finish"
                      : "Confirm"}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Shows feedback for the submitted answer before moving on. */}
            {state === "reviewing" && reviewResult && currentQuestion && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Keeps the quiz progress visible during answer review. */}
                <div className="flex items-center gap-2 mb-4">
                  {questions.map((_, idx) => (
                    <div
                      key={idx}
                      className="h-1.5 flex-1 rounded-full"
                      style={{
                        background:
                          idx <= currentIndex
                            ? sdgColor
                            : "rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </div>

                {/* Displays whether the submitted answer was correct or incorrect. */}
                <div
                  className="flex items-center gap-2.5 mb-3 px-3.5 py-2.5 rounded-lg"
                  style={{
                    background: reviewResult.correct
                      ? "rgba(57,255,127,0.06)"
                      : "rgba(255,58,92,0.06)",
                    border: reviewResult.correct
                      ? "1px solid rgba(57,255,127,0.18)"
                      : "1px solid rgba(255,58,92,0.18)",
                  }}
                >
                  {reviewResult.correct ? (
                    <IconCorrect color="var(--neon-green)" size={22} />
                  ) : (
                    <IconIncorrect color="var(--neon-red)" size={22} />
                  )}
                  <span
                    className="text-[14px] font-bold tracking-wider"
                    style={{
                      color: reviewResult.correct
                        ? "var(--neon-green)"
                        : "var(--neon-red)",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    {reviewResult.correct ? "CORRECT" : "INCORRECT"}
                  </span>
                </div>

                {/* Reveals the correct answer when the submitted option was wrong. */}
                {!reviewResult.correct && (
                  <div
                    className="flex items-center gap-2 text-[14px] mb-2 px-3.5 py-2 rounded-lg"
                    style={{
                      background: "rgba(57,255,127,0.04)",
                      border: "1px solid rgba(57,255,127,0.1)",
                      color: "var(--neon-green)",
                    }}
                  >
                    <IconCorrect color="var(--neon-green)" size={22} />
                    <span>
                      {String.fromCharCode(65 + reviewResult.correctIndex)}.{" "}
                      {currentQuestion.options[reviewResult.correctIndex]}
                    </span>
                  </div>
                )}

                {/* Explains the concept behind the current question. */}
                <div
                  className="text-[14px] leading-relaxed p-3.5 rounded-lg mb-5"
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {reviewResult.explanation}
                </div>

                <div className="flex justify-end">
                  <motion.button
                    onClick={handleContinue}
                    className="px-5 py-2 rounded-lg text-[13px] font-bold tracking-[0.12em] uppercase"
                    style={{
                      background: `${sdgColor}20`,
                      color: sdgColor,
                      border: `1px solid ${sdgColor}50`,
                      fontFamily: "var(--font-orbitron)",
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {currentIndex >= questions.length - 1
                      ? "See Results"
                      : "Continue"}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Summarizes the completed run and the rewards earned from it. */}
            {state === "results" && (
              <motion.div
                className="text-center py-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                {submitting ? (
                  <div className="py-8">
                    <div
                      className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
                      style={{
                        borderColor: sdgColor,
                        borderTopColor: "transparent",
                      }}
                    />
                    <div
                      className="text-[14px] tracking-wider"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Submitting results...
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Visualizes the final score as a circular progress ring. */}
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="2.5"
                        />
                        <motion.path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={sdgColor}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          initial={{ strokeDasharray: "0 100" }}
                          animate={{
                            strokeDasharray: `${(finalScore / finalTotal) * 100} ${100 - (finalScore / finalTotal) * 100}`,
                          }}
                          transition={{
                            duration: 1.2,
                            ease: "easeOut",
                          }}
                          style={{
                            filter: `drop-shadow(0 0 6px ${sdgColor})`,
                          }}
                        />
                      </svg>
                      <div
                        className="absolute inset-0 flex items-center justify-center text-xl font-bold"
                        style={{
                          fontFamily: "var(--font-orbitron)",
                          color: sdgColor,
                        }}
                      >
                        {finalScore}/{finalTotal}
                      </div>
                    </div>

                    {/* Shows the numeric score inside the summary ring. */}
                    <div
                      className="text-[14px] font-bold tracking-[0.12em] uppercase mb-3"
                      style={{
                        fontFamily: "var(--font-orbitron)",
                        color:
                          finalScore >= 4
                            ? "var(--neon-green)"
                            : finalScore >= 2
                              ? sdgColor
                              : "var(--neon-orange)",
                      }}
                    >
                      {finalScore === finalTotal
                        ? "PERFECT SCORE!"
                        : finalScore >= 4
                          ? "EXCELLENT!"
                          : finalScore >= 3
                            ? "WELL DONE!"
                            : finalScore >= 2
                              ? "GOOD EFFORT"
                              : "KEEP LEARNING"}
                    </div>

                    {/* Shows the points earned from the completed quiz. */}
                    {pointsAwarded > 0 ? (
                      <motion.div
                        className="text-[14px] font-bold px-4 py-2 rounded-lg inline-block mb-3"
                        style={{
                          background: "rgba(255,107,44,0.1)",
                          border: "1px solid rgba(255,107,44,0.25)",
                          color: "var(--neon-orange)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        +{pointsAwarded} pts earned!
                      </motion.div>
                    ) : (
                      <div
                        className="text-[13px] px-3 py-1.5 rounded-lg inline-block mb-3"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-dim)",
                        }}
                      >
                        {canEarnPoints
                          ? "No points for this attempt"
                          : "DAILY LIMIT REACHED"}
                      </div>
                    )}

                    {/* Shows the updated daily-attempt status after submission. */}
                    <div className="mb-5">
                      <DailyAttemptsMeter
                        remaining={Math.max(0, 3 - dailyAttemptsUsed)}
                        total={3}
                        canEarn={canEarnPoints}
                        color={sdgColor}
                      />
                    </div>

                    {/* Offers the available next actions after the quiz is finished. */}
                    <div className="flex items-center justify-center gap-3">
                      <motion.button
                        onClick={startQuiz}
                        className="px-5 py-2 rounded-lg text-[13px] font-bold tracking-[0.12em] uppercase"
                        style={{
                          background: `${sdgColor}20`,
                          color: sdgColor,
                          border: `1px solid ${sdgColor}50`,
                          fontFamily: "var(--font-orbitron)",
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Try Again
                      </motion.button>
                      <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg text-[13px] font-bold tracking-[0.12em] uppercase transition-all"
                        style={{
                          color: "var(--text-dim)",
                          border: "1px solid var(--border-subtle)",
                          fontFamily: "var(--font-orbitron)",
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
