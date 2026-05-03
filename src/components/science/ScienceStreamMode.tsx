"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type TouchEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Article } from "@/lib/content/data";
import { useAppStore } from "@/store/appStore";

type ScienceStreamModeProps = {
  articles: Article[];
  activeCategory: string;
  searchQuery: string;
};

type CameraState = "idle" | "loading" | "ready" | "denied" | "error";

type TiltState = {
  rotateX: number;
  rotateY: number;
  offsetX: number;
  offsetY: number;
};

const CATEGORY_COPY: Record<Article["category"], string> = {
  "earth-science": "EARTH SCI",
  sustainability: "SDG",
  "space-tech": "SPACE TECH",
  climate: "CLIMATE",
};

const ACCENT_HEX: Record<string, string> = {
  cyan: "#00e5ff",
  orange: "#ff6b2c",
  purple: "#b44aff",
  green: "#39ff7f",
  rose: "#ff3a8c",
};

const MEDIAPIPE_VERSION = "0.10.34";
const MEDIAPIPE_INFO_LOG = "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.";
const GESTURE_CONFIDENCE_THRESHOLD = 0.56;
const GESTURE_STABLE_FRAMES = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function shuffleArticles(items: Article[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function readableGestureLabel(label: string | null) {
  if (!label) return "CAMERA READY";
  return label.replace(/_/g, " ").toUpperCase();
}

function mapStreamGesture(label: string | null) {
  if (label === "Thumb_Up") return "next";
  if (label === "Thumb_Down") return "previous";
  if (label === "Victory") return "open";
  return null;
}

function runWithVisionConsoleFilter<T>(callback: () => T) {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const first = typeof args[0] === "string" ? args[0] : "";
    if (first.startsWith(MEDIAPIPE_INFO_LOG)) return;
    originalError(...args);
  };

  try {
    return callback();
  } finally {
    console.error = originalError;
  }
}

function isMediapipeInfoLog(args: unknown[]) {
  const first = typeof args[0] === "string" ? args[0] : "";
  return first.includes(MEDIAPIPE_INFO_LOG);
}

function useHeadlineDeck(articles: Article[]) {
  const [deck, setDeck] = useState<Article[]>(() => shuffleArticles(articles));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDeck(shuffleArticles(articles));
    setIndex(0);
  }, [articles]);

  const next = useCallback(() => {
    setIndex((current) => (current + 1) % Math.max(articles.length, 1));
  }, [articles.length]);

  const previous = useCallback(() => {
    setIndex((current) =>
      current === 0 ? Math.max(articles.length - 1, 0) : current - 1
    );
  }, [articles.length]);

  return {
    deck,
    index,
    next,
    previous,
    current: deck[index] ?? null,
  };
}

export default function ScienceStreamMode({
  articles,
  activeCategory,
  searchQuery,
}: ScienceStreamModeProps) {
  const accentColor = useAppStore((s) => s.userPreferences.accentColor);
  const accentHex = ACCENT_HEX[accentColor] ?? ACCENT_HEX.cyan;
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [gestureLabel, setGestureLabel] = useState<string | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<
    "next" | "previous"
  >("next");
  const [transitionPulse, setTransitionPulse] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const cardShellRef = useRef<HTMLDivElement | null>(null);
  const leftWingRef = useRef<HTMLDivElement | null>(null);
  const rightWingRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<{
    detectForVideo: (video: HTMLVideoElement, time: number) => {
      faceLandmarks?: Array<Array<{ x: number; y: number }>>;
    };
    close?: () => void;
  } | null>(null);
  const gestureRecognizerRef = useRef<{
    recognizeForVideo: (video: HTMLVideoElement, time: number) => {
      gestures?: Array<Array<{ categoryName: string; score?: number }>>;
      landmarks?: Array<Array<{ x: number; y: number }>>;
    };
    close?: () => void;
  } | null>(null);
  const visionFrameRef = useRef<number | null>(null);
  const videoFrameCallbackRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const latchedGestureRef = useRef<"next" | "previous" | "open" | null>(null);
  const frameErrorCountRef = useRef(0);
  const lastProcessedVideoTimeRef = useRef(-1);
  const gestureFrameCountRef = useRef(0);
  const gestureCandidateRef = useRef<"next" | "previous" | "open" | null>(null);
  const gestureStableCountRef = useRef(0);
  const currentArticleRef = useRef<Article | null>(null);
  const gestureLabelRef = useRef<string | null>(null);
  const tiltTargetRef = useRef<TiltState>({
    rotateX: 0,
    rotateY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const tiltVisualRef = useRef<TiltState>({
    rotateX: 0,
    rotateY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const tiltLoopRef = useRef<number | null>(null);

  const visibleArticles = useMemo(() => {
    if (activeCategory === "all") return articles;
    return articles.filter((article) => article.category === activeCategory);
  }, [activeCategory, articles]);

  const {
    deck: articleDeck,
    index: articleIndex,
    next: nextArticle,
    previous: previousArticle,
    current: currentArticle,
  } = useHeadlineDeck(visibleArticles);

  useEffect(() => {
    currentArticleRef.current = currentArticle;
  }, [currentArticle]);

  const updateGestureLabel = useCallback((nextLabel: string | null) => {
    if (gestureLabelRef.current === nextLabel) return;
    gestureLabelRef.current = nextLabel;
    setGestureLabel(nextLabel);
  }, []);

  useEffect(() => {
    const applyTransforms = () => {
      const target = tiltTargetRef.current;
      const current = tiltVisualRef.current;
      const lerp = (from: number, to: number, alpha: number) =>
        from + (to - from) * alpha;
      const next: TiltState = {
        rotateX: lerp(current.rotateX, target.rotateX, 0.42),
        rotateY: lerp(current.rotateY, target.rotateY, 0.42),
        offsetX: lerp(current.offsetX, target.offsetX, 0.38),
        offsetY: lerp(current.offsetY, target.offsetY, 0.38),
      };
      tiltVisualRef.current = next;

      if (cardShellRef.current) {
        cardShellRef.current.style.transform = `translate3d(${next.offsetX}px, ${next.offsetY}px, 0) rotateX(${next.rotateX}deg) rotateY(${next.rotateY}deg)`;
      }
      if (leftWingRef.current) {
        leftWingRef.current.style.transform = `translate3d(${next.offsetX * -0.18}px, 0, 0) rotateX(${8 + next.rotateX * 0.1}deg) rotateY(${-26 + next.rotateY * 0.18}deg)`;
      }
      if (rightWingRef.current) {
        rightWingRef.current.style.transform = `translate3d(${next.offsetX * 0.14}px, 0, 0) rotateX(${-6 + next.rotateX * 0.08}deg) rotateY(${22 + next.rotateY * 0.14}deg)`;
      }

      tiltLoopRef.current = requestAnimationFrame(applyTransforms);
    };

    tiltLoopRef.current = requestAnimationFrame(applyTransforms);
    return () => {
      if (tiltLoopRef.current !== null) {
        cancelAnimationFrame(tiltLoopRef.current);
        tiltLoopRef.current = null;
      }
    };
  }, []);

  const disableVision = useCallback(
    (nextLabel: string) => {
      if (videoFrameCallbackRef.current !== null && previewVideoRef.current) {
        (
          previewVideoRef.current as HTMLVideoElement & {
            cancelVideoFrameCallback?: (handle: number) => void;
          }
        ).cancelVideoFrameCallback?.(videoFrameCallbackRef.current);
        videoFrameCallbackRef.current = null;
      }
      if (visionFrameRef.current !== null) {
        cancelAnimationFrame(visionFrameRef.current);
        visionFrameRef.current = null;
      }
      faceLandmarkerRef.current = null;
      gestureRecognizerRef.current = null;
      latchedGestureRef.current = null;
      frameErrorCountRef.current = 0;
      lastProcessedVideoTimeRef.current = -1;
      gestureFrameCountRef.current = 0;
      gestureCandidateRef.current = null;
      gestureStableCountRef.current = 0;
      tiltTargetRef.current = {
        rotateX: 0,
        rotateY: 0,
        offsetX: 0,
        offsetY: 0,
      };
      updateGestureLabel(nextLabel);
    },
    [updateGestureLabel]
  );

  const stopVision = useCallback(() => {
    if (videoFrameCallbackRef.current !== null && previewVideoRef.current) {
      (
        previewVideoRef.current as HTMLVideoElement & {
          cancelVideoFrameCallback?: (handle: number) => void;
        }
      ).cancelVideoFrameCallback?.(videoFrameCallbackRef.current);
      videoFrameCallbackRef.current = null;
    }
    if (visionFrameRef.current !== null) {
      cancelAnimationFrame(visionFrameRef.current);
      visionFrameRef.current = null;
    }
    faceLandmarkerRef.current = null;
    gestureRecognizerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    latchedGestureRef.current = null;
    frameErrorCountRef.current = 0;
    lastProcessedVideoTimeRef.current = -1;
    gestureFrameCountRef.current = 0;
    gestureCandidateRef.current = null;
    gestureStableCountRef.current = 0;
    tiltTargetRef.current = {
      rotateX: 0,
      rotateY: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }, []);

  const openCurrentArticle = useCallback(() => {
    const article = currentArticleRef.current;
    if (!article) return;
    window.open(article.url, "_blank", "noopener,noreferrer");
  }, []);

  const navigateByDelta = useCallback(
    (direction: "next" | "previous", sourceLabel: string) => {
      setTransitionDirection(direction);
      setTransitionPulse((current) => current + 1);
      updateGestureLabel(sourceLabel);
      if (direction === "next") {
        nextArticle();
        return;
      }
      previousArticle();
    },
    [nextArticle, previousArticle, updateGestureLabel]
  );

  const cardVariants = {
    initial: (direction: "next" | "previous") =>
      direction === "next"
        ? {
            opacity: 0,
            y: 164,
            x: 8,
            rotateX: -28,
            rotateZ: -4.8,
            scale: 0.89,
            filter: "blur(10px)",
            clipPath: "inset(24% 0% 0% 0% round 32px)",
          }
        : {
            opacity: 0,
            y: -150,
            x: -24,
            rotateX: 7,
            rotateY: -18,
            rotateZ: -8,
            scale: 0.93,
            filter: "blur(9px)",
            clipPath: "inset(0% 0% 26% 0% round 32px)",
          },
    animate: {
      opacity: 1,
      y: 0,
      x: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      filter: "blur(0px)",
      clipPath: "inset(0% 0% 0% 0% round 32px)",
    },
    exit: (direction: "next" | "previous") =>
      direction === "next"
        ? {
            opacity: 0,
            y: -226,
            x: -10,
            rotateX: 26,
            rotateZ: 4.2,
            scale: 0.84,
            filter: "blur(14px)",
            clipPath: "inset(0% 0% 30% 0% round 32px)",
          }
        : {
            opacity: 0,
            y: 244,
            x: 28,
            rotateX: -10,
            rotateY: 20,
            rotateZ: 8,
            scale: 0.9,
            filter: "blur(13px)",
            clipPath: "inset(34% 0% 0% 0% round 32px)",
          },
  };

  useEffect(() => {
    if (cameraEnabled) return;
    setCameraState("idle");
    updateGestureLabel(null);
  }, [cameraEnabled, updateGestureLabel]);

  useEffect(() => {
    if (!cameraEnabled) return;

    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      if (isMediapipeInfoLog(args)) return;
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, [cameraEnabled]);

  useEffect(() => {
    if (!cameraEnabled) return;

    let cancelled = false;
    const bootVision = async () => {
      setCameraState("loading");
      try {
        const [{ FilesetResolver, FaceLandmarker, GestureRecognizer }] =
          await Promise.all([import("@mediapipe/tasks-vision")]);
        const fileset = await FilesetResolver.forVisionTasks(
          `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
        );
        const [faceLandmarker, gestureRecognizer] = await Promise.all([
          runWithVisionConsoleFilter(() =>
            FaceLandmarker.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              },
              runningMode: "VIDEO",
              numFaces: 1,
            })
          ),
          runWithVisionConsoleFilter(() =>
            GestureRecognizer.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
              },
              runningMode: "VIDEO",
              numHands: 1,
            })
          ),
        ]);

        if (cancelled) {
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = previewVideoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          setCameraState("error");
          return;
        }

        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.srcObject = stream;
        try {
          await video.play();
        } catch (error) {
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          console.error("Science stream video playback failed", error);
          stream.getTracks().forEach((track) => track.stop());
          setCameraState("error");
          updateGestureLabel("CAMERA UNAVAILABLE");
          return;
        }

        streamRef.current = stream;
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          await new Promise<void>((resolve) => {
            let attempts = 0;
            const waitForFrame = () => {
              if (
                cancelled ||
                video.videoWidth > 0 ||
                video.videoHeight > 0 ||
                attempts > 24
              ) {
                resolve();
                return;
              }
              attempts += 1;
              requestAnimationFrame(waitForFrame);
            };
            waitForFrame();
          });
        }
        faceLandmarkerRef.current = faceLandmarker;
        gestureRecognizerRef.current = gestureRecognizer;
        frameErrorCountRef.current = 0;
        gestureFrameCountRef.current = 0;
        gestureCandidateRef.current = null;
        gestureStableCountRef.current = 0;
        setCameraState("ready");
        updateGestureLabel("CAMERA READY");

        const detect = (time: number, frameTimeOverride?: number) => {
          if (
            cancelled ||
            !previewVideoRef.current ||
            !faceLandmarkerRef.current ||
            !gestureRecognizerRef.current
          ) {
            visionFrameRef.current = null;
            return;
          }

          if (
            previewVideoRef.current.readyState >= 2 &&
            previewVideoRef.current.videoWidth > 0 &&
            previewVideoRef.current.videoHeight > 0
          ) {
            try {
              const mediaTime = previewVideoRef.current.currentTime;
              if (mediaTime <= 0 || mediaTime === lastProcessedVideoTimeRef.current) {
                visionFrameRef.current = requestAnimationFrame(detect);
                return;
              }
              lastProcessedVideoTimeRef.current = mediaTime;

              const faceTask = faceLandmarkerRef.current;
              const gestureTask = gestureRecognizerRef.current;
              if (!faceTask || !gestureTask) {
                if (
                  typeof previewVideoRef.current.requestVideoFrameCallback ===
                  "function"
                ) {
                  videoFrameCallbackRef.current =
                    previewVideoRef.current.requestVideoFrameCallback(
                      (_now, metadata) =>
                        detect(performance.now(), metadata.mediaTime * 1000)
                    );
                } else {
                  visionFrameRef.current = requestAnimationFrame(detect);
                }
                return;
              }

              const frameTime = frameTimeOverride ?? mediaTime * 1000;
              const faceResult = runWithVisionConsoleFilter(() =>
                faceTask.detectForVideo(previewVideoRef.current!, frameTime)
              );
              const face = faceResult.faceLandmarks?.[0];
              if (face) {
                const nose = face[1] ?? face[0];
                const eyeLeft = face[33] ?? face[133] ?? face[1];
                const eyeRight = face[263] ?? face[362] ?? face[1];
                const brow = face[10] ?? face[1];
                const chin = face[152] ?? face[1];
                const faceCenterX = (eyeLeft.x + eyeRight.x) * 0.5;
                const faceCenterY = (brow.y + chin.y) * 0.5;
                const yaw = clamp((faceCenterX - nose.x) * 360, -26, 26);
                const pitch = clamp((nose.y - faceCenterY) * 280, -20, 20);
                tiltTargetRef.current = {
                  rotateX: pitch,
                  rotateY: yaw,
                  offsetX: clamp((0.5 - nose.x) * 74, -30, 30),
                  offsetY: clamp((nose.y - 0.5) * 44, -18, 18),
                };
              } else {
                tiltTargetRef.current = {
                  rotateX: tiltTargetRef.current.rotateX * 0.45,
                  rotateY: tiltTargetRef.current.rotateY * 0.45,
                  offsetX: tiltTargetRef.current.offsetX * 0.36,
                  offsetY: tiltTargetRef.current.offsetY * 0.36,
                };
              }

              gestureFrameCountRef.current += 1;
              const gestureResult = runWithVisionConsoleFilter(() =>
                gestureTask.recognizeForVideo(previewVideoRef.current!, frameTime)
              );
              const primaryGestureEntry = gestureResult.gestures?.[0]?.[0] ?? null;
              const primaryGesture =
                primaryGestureEntry &&
                (primaryGestureEntry.score ?? 0) >= GESTURE_CONFIDENCE_THRESHOLD
                  ? primaryGestureEntry.categoryName
                  : null;
              const mappedGesture = mapStreamGesture(primaryGesture);

              if (mappedGesture) {
                if (gestureCandidateRef.current === mappedGesture) {
                  gestureStableCountRef.current += 1;
                } else {
                  gestureCandidateRef.current = mappedGesture;
                  gestureStableCountRef.current = 1;
                }

                if (
                  gestureStableCountRef.current >= GESTURE_STABLE_FRAMES &&
                  mappedGesture !== latchedGestureRef.current
                ) {
                  latchedGestureRef.current = mappedGesture;
                  if (mappedGesture === "next") {
                    navigateByDelta("next", "THUMB UP");
                  } else if (mappedGesture === "previous") {
                    navigateByDelta("previous", "THUMB DOWN");
                  } else {
                    updateGestureLabel("OPEN ARTICLE");
                    openCurrentArticle();
                  }
                }
              } else {
                gestureCandidateRef.current = null;
                gestureStableCountRef.current = 0;
                latchedGestureRef.current = null;
                if (primaryGesture) {
                  updateGestureLabel(readableGestureLabel(primaryGesture));
                } else {
                  updateGestureLabel("CAMERA READY");
                }
              }
              frameErrorCountRef.current = 0;
            } catch (error) {
              frameErrorCountRef.current += 1;
              if (frameErrorCountRef.current >= 6) {
                console.warn("Science stream vision frame failed repeatedly", error);
                disableVision("VISION OFFLINE");
                return;
              }
            }
          }

          if (
            previewVideoRef.current &&
            typeof previewVideoRef.current.requestVideoFrameCallback ===
              "function"
          ) {
            videoFrameCallbackRef.current =
              previewVideoRef.current.requestVideoFrameCallback(
                (_now, metadata) =>
                  detect(performance.now(), metadata.mediaTime * 1000)
              );
            return;
          }

          visionFrameRef.current = requestAnimationFrame(detect);
        };

        if (typeof video.requestVideoFrameCallback === "function") {
          videoFrameCallbackRef.current = video.requestVideoFrameCallback(
            (_now, metadata) => detect(performance.now(), metadata.mediaTime * 1000)
          );
        } else {
          visionFrameRef.current = requestAnimationFrame(detect);
        }
      } catch (error) {
        console.error("Science stream vision bootstrap failed", error);
        if ((error as DOMException)?.name === "NotAllowedError") {
          setCameraState("denied");
          updateGestureLabel("CAMERA DENIED");
        } else {
          if (streamRef.current) {
            setCameraState("ready");
            updateGestureLabel("VISION OFFLINE");
            return;
          }
          setCameraState("error");
          updateGestureLabel("CAMERA UNAVAILABLE");
        }
      }
    };

    void bootVision();

    return () => {
      cancelled = true;
      stopVision();
    };
  }, [
    cameraEnabled,
    disableVision,
    navigateByDelta,
    openCurrentArticle,
    stopVision,
    updateGestureLabel,
  ]);

  useEffect(() => {
    return () => stopVision();
  }, [stopVision]);

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    },
    []
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const startY = touchStartYRef.current;
      const endY = event.changedTouches[0]?.clientY ?? null;
      touchStartYRef.current = null;
      if (startY === null || endY === null) return;
      const deltaY = endY - startY;
      if (Math.abs(deltaY) < 42) return;
      event.preventDefault();
      if (deltaY < 0) {
        navigateByDelta("next", "TOUCH SWIPE UP");
        return;
      }
      navigateByDelta("previous", "TOUCH SWIPE DOWN");
    },
    [navigateByDelta]
  );

  const handlePointerParallax = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (cameraEnabled || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const ratioX = (event.clientX - rect.left) / rect.width - 0.5;
      const ratioY = (event.clientY - rect.top) / rect.height - 0.5;
      tiltTargetRef.current = {
        rotateX: clamp(-ratioY * 38, -20, 20),
        rotateY: clamp(ratioX * 52, -26, 26),
        offsetX: clamp(ratioX * 60, -30, 30),
        offsetY: clamp(ratioY * 36, -18, 18),
      };
    },
    [cameraEnabled]
  );

  if (!currentArticle) {
    return (
      <div
        className="rounded-3xl p-10 text-center"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,0.16))",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="text-[13px] font-bold tracking-[0.28em] uppercase"
          style={{
            color: "var(--text-dim)",
            fontFamily: "var(--font-orbitron)",
          }}
        >
          STREAM MODE
        </div>
        <p className="mt-3 text-[15px]" style={{ color: "var(--text-secondary)" }}>
          No articles are available for the current filter.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[32px] px-3 py-3 md:px-4 md:py-4"
      style={{
        perspective: "1800px",
        touchAction: "pan-x",
        background:
          "radial-gradient(circle at 50% 18%, rgba(0,229,255,0.08), transparent 28%), linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.46))",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerMove={handlePointerParallax}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,0.72), rgba(0,0,0,0.26))",
        }}
      />

      <div className="relative z-10 h-px shrink-0" />

      <div className="relative z-10 mt-2 min-h-0 grid items-stretch gap-3 overflow-visible lg:grid-cols-[minmax(8.75rem,0.44fr)_minmax(0,31rem)_minmax(10.5rem,0.68fr)]">
        <div className="hidden lg:block">
          <div
            className="flex h-full flex-col rounded-[28px] p-4"
            style={{
              background: "rgba(0,0,0,0.24)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              className="text-[10px] font-bold tracking-[0.24em] uppercase"
              style={{
                color: "var(--text-dim)",
                fontFamily: "var(--font-orbitron)",
              }}
            >
              INPUT LAYER
            </div>
            <div className="mt-4 rounded-[24px] border px-4 py-4"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                borderColor: "rgba(255,255,255,0.05)",
              }}
            >
              <div
                className="text-[11px] font-bold tracking-[0.26em] uppercase"
                style={{
                  color: accentHex,
                  fontFamily: "var(--font-orbitron)",
                }}
              >
                SCIENCE STREAM
              </div>
              <p
                className="mt-2 text-[13px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Vertical browsing mode for rapid article intake. Swipe or use camera
                gestures to move between randomized science stories.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase"
                  style={{
                    color: cameraEnabled ? "#031317" : accentHex,
                    background: cameraEnabled
                      ? `linear-gradient(135deg, ${accentHex}, color-mix(in srgb, ${accentHex} 72%, white))`
                      : "rgba(255,255,255,0.04)",
                    border: cameraEnabled
                      ? "1px solid transparent"
                      : `1px solid color-mix(in srgb, ${accentHex} 28%, transparent)`,
                    boxShadow: cameraEnabled
                      ? `0 0 20px color-mix(in srgb, ${accentHex} 14%, transparent)`
                      : "none",
                  }}
                >
                  {cameraEnabled ? "CAMERA LIVE" : "CAMERA OFFLINE"}
                </div>
                <button
                  type="button"
                  onClick={() => setCameraEnabled((current) => !current)}
                  className="rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase transition-all"
                  style={{
                    color: "var(--text-dim)",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {cameraEnabled ? "DISABLE" : "RETRY"}
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {[
                "Touch swipe switches the article deck.",
                "Thumb up advances to the next article in the stream.",
                "Thumb down returns to the previous article.",
                "Victory opens the current article link once per gesture.",
              ].map((copy) => (
                <div
                  key={copy}
                  className="rounded-2xl p-3 text-[13px] leading-relaxed"
                  style={{
                    color: "var(--text-secondary)",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  {copy}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 items-stretch justify-center overflow-visible">
          <motion.div
            className="pointer-events-none absolute inset-x-[12%] top-[7%] h-[72%] rounded-[40px]"
            animate={{
              opacity: 0.36,
              scale: 1.03,
            }}
            style={{
              background: `radial-gradient(circle at 50% 18%, color-mix(in srgb, ${accentHex} 22%, transparent), transparent 70%)`,
              filter: "blur(38px)",
            }}
          />

          <motion.div
            ref={leftWingRef}
            className="absolute inset-y-12 left-[8%] hidden w-[14.5rem] rounded-[30px] lg:block"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.04)",
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          />
          <motion.div
            ref={rightWingRef}
            className="absolute inset-y-16 right-[8%] hidden w-[14.5rem] rounded-[30px] lg:block"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
              border: "1px solid rgba(255,255,255,0.04)",
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          />

          <motion.div
            ref={cardShellRef}
            className="relative z-10 h-full max-h-full max-w-full aspect-[9/16] self-center"
            style={{ transformStyle: "preserve-3d", willChange: "transform" }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden lg:block">
              <button
                type="button"
                onClick={() => navigateByDelta("previous", "BUTTON UP")}
                className="pointer-events-auto absolute left-[-2.9rem] top-1/2 flex h-20 w-9 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[16px] border text-[10px] font-bold tracking-[0.18em] uppercase"
                style={{
                  color: "var(--text-dim)",
                  borderColor: "rgba(255,255,255,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                  backdropFilter: "blur(18px)",
                  boxShadow: "0 18px 44px rgba(0,0,0,0.24)",
                }}
                aria-label="Previous article"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 32% 30%, rgba(255,255,255,0.12), transparent 42%)",
                  }}
                />
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5l-7 7 7 7" />
                  <path d="M19 12H6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => navigateByDelta("next", "BUTTON DOWN")}
                className="pointer-events-auto absolute right-[-2.9rem] top-1/2 flex h-20 w-9 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[16px] border text-[10px] font-bold tracking-[0.18em] uppercase"
                style={{
                  color: "#041318",
                  borderColor: "transparent",
                  background: `linear-gradient(135deg, ${accentHex}, color-mix(in srgb, ${accentHex} 76%, white))`,
                  boxShadow: `0 18px 44px color-mix(in srgb, ${accentHex} 22%, transparent)`,
                }}
                aria-label="Next article"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 32% 30%, rgba(255,255,255,0.24), transparent 44%)",
                  }}
                />
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5l7 7-7 7" />
                  <path d="M5 12h13" />
                </svg>
              </button>
            </div>
            <div
              className="absolute inset-3 rounded-[44px]"
              style={{
                background: "rgba(0,0,0,0.55)",
                transform: "translateZ(-24px)",
                filter: "blur(16px)",
              }}
            />
            <div
              className="relative flex h-full min-h-0 overflow-hidden rounded-[42px] border p-4 shadow-[0_36px_90px_rgba(0,0,0,0.42)]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(8,10,14,0.94), rgba(8,10,14,0.82))",
                borderColor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% -4%, color-mix(in srgb, ${accentHex} 22%, transparent), transparent 38%), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 32%)`,
                }}
              />
              <div
                className="absolute left-1/2 top-4 h-1.5 w-24 -translate-x-1/2 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.08)",
                }}
              />

              {transitionPulse > 0 ? (
                <div
                  key={`pulse-${transitionPulse}`}
                  className="pointer-events-none absolute inset-0 z-0"
                >
                  <motion.div
                    initial={{
                      opacity: transitionDirection === "next" ? 0.46 : 0.38,
                      y: transitionDirection === "next" ? 112 : -104,
                      x: transitionDirection === "next" ? 0 : -12,
                      scaleY: transitionDirection === "next" ? 0.66 : 0.84,
                      scaleX: transitionDirection === "next" ? 1 : 0.92,
                      rotateZ: transitionDirection === "next" ? 0 : -7,
                    }}
                    animate={{
                      opacity: 0,
                      y: 0,
                      x: 0,
                      scaleY: 1,
                      scaleX: 1,
                      rotateZ: 0,
                    }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-x-5 rounded-[28px]"
                    style={{
                      top: transitionDirection === "next" ? "46%" : "10%",
                      bottom: transitionDirection === "next" ? "8%" : "34%",
                      background:
                        transitionDirection === "next"
                          ? `linear-gradient(180deg, transparent 0%, color-mix(in srgb, ${accentHex} 14%, transparent) 28%, rgba(255,255,255,0.2) 66%, transparent 100%)`
                          : `linear-gradient(135deg, transparent 0%, color-mix(in srgb, ${accentHex} 12%, transparent) 24%, rgba(255,255,255,0.18) 62%, transparent 100%)`,
                      filter:
                        transitionDirection === "next" ? "blur(18px)" : "blur(14px)",
                    }}
                  />
                  <motion.div
                    initial={{
                      opacity: transitionDirection === "next" ? 0.56 : 0.42,
                      y: transitionDirection === "next" ? 128 : -96,
                      x: transitionDirection === "next" ? 0 : -22,
                      scaleY: transitionDirection === "next" ? 0.22 : 0.44,
                      scaleX: transitionDirection === "next" ? 0.92 : 0.74,
                      rotateZ: transitionDirection === "next" ? 0 : -10,
                    }}
                    animate={{
                      opacity: 0,
                      y: transitionDirection === "next" ? -12 : 18,
                      x: transitionDirection === "next" ? 0 : 4,
                      scaleY: 1.08,
                      scaleX: 1,
                      rotateZ: 0,
                    }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-x-8 rounded-[999px]"
                    style={{
                      top: transitionDirection === "next" ? "64%" : "18%",
                      height: transitionDirection === "next" ? "12%" : "18%",
                      background:
                        transitionDirection === "next"
                          ? `linear-gradient(180deg, rgba(255,255,255,0.02), color-mix(in srgb, ${accentHex} 44%, transparent), rgba(255,255,255,0.24), transparent)`
                          : `linear-gradient(90deg, transparent, rgba(255,255,255,0.16), color-mix(in srgb, ${accentHex} 34%, transparent), transparent)`,
                      filter:
                        transitionDirection === "next" ? "blur(10px)" : "blur(8px)",
                    }}
                  />
                </div>
              ) : null}

              <AnimatePresence mode="wait" custom={transitionDirection}>
                <motion.article
                  key={`${currentArticle.id}-${transitionPulse}`}
                  custom={transitionDirection}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{
                    duration: transitionDirection === "next" ? 0.42 : 0.36,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative z-10 flex h-full min-h-0 flex-1 flex-col px-3 pb-3 pt-2"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.22em] uppercase"
                      style={{
                        color: accentHex,
                        background: "rgba(0,0,0,0.24)",
                        border: `1px solid color-mix(in srgb, ${accentHex} 22%, transparent)`,
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      {CATEGORY_COPY[currentArticle.category]}
                    </div>
                    <div
                      className="rounded-full px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase"
                      style={{
                        color: "var(--text-dim)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {articleIndex + 1}/{articleDeck.length}
                    </div>
                  </div>

                  <div className="mt-4 flex-1 min-h-0">
                    <div
                      className="rounded-[30px] border px-5 py-4"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                        borderColor: "rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background: accentHex,
                            boxShadow: `0 0 14px ${accentHex}`,
                          }}
                        />
                        <span
                          className="text-[11px] tracking-[0.2em] uppercase"
                          style={{
                            color: "var(--text-dim)",
                            fontFamily: "var(--font-fira-code)",
                          }}
                        >
                          {currentArticle.source}
                        </span>
                      </div>

                      <h3
                        className="mt-3 text-[22px] font-semibold leading-[1.14]"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {currentArticle.title}
                      </h3>

                      <p
                        className="mt-3 text-[12px] leading-[1.66]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {currentArticle.abstract}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {currentArticle.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase"
                            style={{
                              color: "var(--text-dim)",
                              border: "1px solid rgba(255,255,255,0.07)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-4 px-1">
                    <div>
                      <div
                        className="text-[11px] tracking-[0.18em] uppercase"
                        style={{
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-fira-code)",
                        }}
                      >
                        {currentArticle.date}
                      </div>
                      <div
                        className="mt-1 text-[11px]"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {currentArticle.readTime}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={openCurrentArticle}
                      className="rounded-full px-4 py-2 text-[10px] font-bold tracking-[0.18em] uppercase transition-all"
                      style={{
                        color: "#041318",
                        background: `linear-gradient(135deg, ${accentHex}, color-mix(in srgb, ${accentHex} 72%, white))`,
                        boxShadow: `0 10px 32px color-mix(in srgb, ${accentHex} 24%, transparent)`,
                        fontFamily: "var(--font-orbitron)",
                      }}
                    >
                      OPEN ARTICLE
                    </button>
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <div className="hidden min-h-0 overflow-hidden lg:block">
          <div
            className="flex h-full flex-col rounded-[28px] p-4"
            style={{
              background: "rgba(0,0,0,0.24)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              className="text-[10px] font-bold tracking-[0.24em] uppercase"
              style={{
                color: "var(--text-dim)",
                fontFamily: "var(--font-orbitron)",
              }}
            >
              CAMERA FEED
            </div>
            <div
              className="mt-4 flex flex-1 flex-col"
            >
              <div
                className="relative flex-1 overflow-hidden rounded-[20px] border"
                style={{
                  background:
                    cameraEnabled && cameraState === "ready"
                      ? "linear-gradient(180deg, rgba(0,229,255,0.09), rgba(0,0,0,0.32))"
                      : "rgba(0,0,0,0.28)",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <video
                  ref={previewVideoRef}
                  className="absolute inset-0 h-full w-full object-cover opacity-60"
                  style={{
                    display: cameraEnabled ? "block" : "none",
                    transform: "scaleX(-1)",
                    filter: "saturate(0.82) contrast(1.06) brightness(0.88)",
                  }}
                  muted
                  playsInline
                  autoPlay
                />
                <div
                  className="absolute inset-0"
                  style={{
                    display: cameraEnabled ? "block" : "none",
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.14), rgba(0,0,0,0.52)), radial-gradient(circle at 50% 12%, rgba(255,255,255,0.08), transparent 34%)",
                  }}
                />
                <div className="flex h-full flex-col justify-between p-4">
                  <div
                    className="rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.18em] uppercase inline-flex w-fit"
                    style={{
                      color: cameraState === "ready" ? accentHex : "var(--text-dim)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      fontFamily: "var(--font-orbitron)",
                    }}
                  >
                    {cameraState}
                  </div>
                  <div>
                    <div
                      className="text-[12px] tracking-[0.18em] uppercase"
                      style={{
                        color: accentHex,
                        fontFamily: "var(--font-fira-code)",
                      }}
                    >
                      {readableGestureLabel(gestureLabel)}
                    </div>
                    <p
                      className="mt-2 text-[13px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {cameraEnabled
                        ? "Face tilt steers the display. Thumb up moves forward, thumb down moves back, and victory opens the article."
                        : "Camera access failed. Retry to restore face tilt and gesture controls."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-3 px-5 lg:hidden">
        <button
          type="button"
          onClick={() => navigateByDelta("previous", "BUTTON UP")}
          className="pointer-events-auto relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] border"
          style={{
            color: "var(--text-dim)",
            borderColor: "rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            backdropFilter: "blur(18px)",
            boxShadow: "0 18px 44px rgba(0,0,0,0.24)",
          }}
          aria-label="Previous article"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5l-7 7 7 7" />
            <path d="M19 12H6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => navigateByDelta("next", "BUTTON DOWN")}
          className="pointer-events-auto relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] border"
          style={{
            color: "#041318",
            borderColor: "transparent",
            background: `linear-gradient(135deg, ${accentHex}, color-mix(in srgb, ${accentHex} 76%, white))`,
            boxShadow: `0 18px 44px color-mix(in srgb, ${accentHex} 22%, transparent)`,
          }}
          aria-label="Next article"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5l7 7-7 7" />
            <path d="M5 12h13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
