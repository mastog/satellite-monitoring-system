import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { awardPoints, POINTS_QUIZ_CORRECT } from "@/lib/points/economy";
import { getQuizQuestions } from "@/lib/sdg/quizBank";

const MAX_DAILY_SCORED_ATTEMPTS = 3;

interface AnswerInput {
  questionId: string;
  selectedIndex: number;
  selectedText?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { sdgNumber, answers } = body as {
      sdgNumber: number;
      answers: AnswerInput[];
    };

    if (!sdgNumber || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Get all questions for this SDG (unshuffled) to validate answers
    // Note: getQuizQuestions shuffles options, so we import the raw bank instead
    const { allQuestions: rawBank } = await import("@/lib/sdg/quizBank");
    const sdgQuestions = rawBank.filter((q) => q.sdgNumber === sdgNumber);
    const questionMap = new Map(sdgQuestions.map((q) => [q.id, q]));

    // Score answers — compare by selected text against the original correct answer
    const results = answers.map((a) => {
      const question = questionMap.get(a.questionId);
      if (!question) {
        return {
          questionId: a.questionId,
          correct: false,
          correctIndex: -1,
          explanation: "Question not found",
        };
      }
      const correctAnswer = question.options[question.correctIndex];
      const isCorrect = a.selectedText
        ? a.selectedText === correctAnswer
        : a.selectedIndex === question.correctIndex;
      return {
        questionId: a.questionId,
        correct: isCorrect,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
      };
    });

    const correctCount = results.filter((r) => r.correct).length;
    const total = answers.length;

    // Count today's attempts
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const todayAttempts = await prisma.quizAttempt.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfDay },
      },
    });

    // Award points if under daily limit
    let pointsAwarded = 0;
    if (todayAttempts < MAX_DAILY_SCORED_ATTEMPTS) {
      pointsAwarded = correctCount * POINTS_QUIZ_CORRECT;
      if (pointsAwarded > 0) {
        await awardPoints(user.id, pointsAwarded, "quiz");
      }
    }

    // Create quiz attempt record
    await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        sdgNumber,
        score: correctCount,
        total,
        pointsAwarded,
      },
    });

    const dailyAttemptsUsed = todayAttempts + 1;

    return NextResponse.json({
      score: correctCount,
      total,
      pointsAwarded,
      dailyAttemptsUsed,
      canEarnPoints: dailyAttemptsUsed < MAX_DAILY_SCORED_ATTEMPTS,
      results,
    });
  } catch (error) {
    console.error("Quiz submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
