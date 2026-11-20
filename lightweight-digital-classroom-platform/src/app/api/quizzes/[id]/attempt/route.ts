import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quizAttempts, quizQuestions, quizzes } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Students only" }, { status: 403 });
  }

  const { id } = await context.params;
  const quizId = Number(id);

  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.studentId, user.id))
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "You have already submitted this quiz" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const answers: Record<string, string> = body.answers || {};

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId));

  let objectiveScore = 0;
  let hasShortAnswer = false;

  for (const q of questions) {
    const studentAns = String(answers[String(q.id)] || "").trim();
    if (q.questionType === "short_answer") {
      hasShortAnswer = true;
    } else if (
      studentAns &&
      q.correctAnswer &&
      studentAns.toLowerCase() === q.correctAnswer.trim().toLowerCase()
    ) {
      objectiveScore += q.marks;
    }
  }

  const [created] = await db
    .insert(quizAttempts)
    .values({
      quizId,
      studentId: user.id,
      answersJson: answers,
      objectiveScore,
      manualScore: 0,
      totalScore: objectiveScore,
      status: hasShortAnswer ? "submitted" : "graded",
    })
    .returning();

  return NextResponse.json({ attempt: created }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || (user.role !== "instructor" && user.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const quizId = Number(id);
  const body = await req.json();
  const attemptId = Number(body.attemptId);
  const manualScore = Math.max(0, Number(body.manualScore) || 0);

  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.quizId, quizId)))
    .limit(1);

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(quizAttempts)
    .set({
      manualScore,
      totalScore: attempt.objectiveScore + manualScore,
      status: "graded",
    })
    .where(eq(quizAttempts.id, attemptId))
    .returning();

  return NextResponse.json({ attempt: updated });
}
