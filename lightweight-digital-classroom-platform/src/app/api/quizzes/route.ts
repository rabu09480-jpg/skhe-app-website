import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  classes,
  notifications,
  quizAttempts,
  quizQuestions,
  quizzes,
  users,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { asc, desc, eq } from "drizzle-orm";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allQuizzes = await db
    .select()
    .from(quizzes)
    .orderBy(desc(quizzes.createdAt));

  const allQuestions = await db
    .select()
    .from(quizQuestions)
    .orderBy(asc(quizQuestions.orderIndex));

  const allAttempts = await db.select().from(quizAttempts);
  const allUsers = await db.select().from(users);
  const allClasses = await db.select().from(classes);

  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const enriched = allQuizzes.map((q) => {
    const qQuestions = allQuestions.filter((qq) => qq.quizId === q.id);
    const qAttempts = allAttempts.filter((a) => a.quizId === q.id);
    const myAttempt = qAttempts.find((a) => a.studentId === user.id) || null;

    // Hide correct answers from students until they submit & results are allowed
    const safeQuestions = qQuestions.map((qq) => {
      const canSeeAnswer =
        user.role !== "student" ||
        (myAttempt !== null && q.showResultsImmediately);
      return {
        ...qq,
        correctAnswer: canSeeAnswer ? qq.correctAnswer : "",
      };
    });

    const attemptsForInstructor =
      user.role === "instructor" || user.role === "admin"
        ? qAttempts.map((a) => ({
            ...a,
            studentName: userMap.get(a.studentId)?.name || "Student",
            studentEmail: userMap.get(a.studentId)?.email || "",
          }))
        : [];

    return {
      ...q,
      questions: safeQuestions,
      myAttempt,
      attempts: attemptsForInstructor,
      attemptCount: qAttempts.length,
    };
  });

  return NextResponse.json({ quizzes: enriched, classes: allClasses });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "instructor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const subject = String(body.subject || "").trim();
    const description = String(body.description || "").trim();
    const durationMinutes = Number(body.durationMinutes) || 15;
    const showResultsImmediately = body.showResultsImmediately !== false;
    const isQuickQuiz = Boolean(body.isQuickQuiz);
    const classId = body.classId ? Number(body.classId) : null;
    const startTime = String(body.startTime || "").trim();
    const endTime = String(body.endTime || "").trim();

    interface RawQuestion {
      questionText: string;
      questionType: "mcq" | "true_false" | "short_answer";
      options?: string[];
      correctAnswer?: string;
      marks?: number;
    }

    const questionsInput: RawQuestion[] = Array.isArray(body.questions)
      ? body.questions
      : [];

    if (!title || !subject || questionsInput.length === 0) {
      return NextResponse.json(
        { error: "Title, subject, and at least one question are required" },
        { status: 400 }
      );
    }

    const totalMarks = questionsInput.reduce(
      (sum, q) => sum + (Number(q.marks) || 1),
      0
    );

    const [created] = await db
      .insert(quizzes)
      .values({
        classId,
        title,
        description,
        subject,
        durationMinutes,
        totalMarks,
        startTime,
        endTime,
        showResultsImmediately,
        isQuickQuiz,
        createdBy: user.id,
      })
      .returning();

    await db.insert(quizQuestions).values(
      questionsInput.map((q, idx) => ({
        quizId: created.id,
        questionText: String(q.questionText || "").trim(),
        questionType: q.questionType || "mcq",
        optionsJson:
          q.questionType === "true_false"
            ? ["সত্য (True)", "মিথ্যা (False)"]
            : Array.isArray(q.options)
            ? q.options.map(String)
            : [],
        correctAnswer: String(q.correctAnswer || "").trim(),
        marks: Number(q.marks) || 1,
        orderIndex: idx + 1,
      }))
    );

    const students = await db
      .select()
      .from(users)
      .where(eq(users.role, "student"));
    if (students.length > 0) {
      await db.insert(notifications).values(
        students.map((s) => ({
          userId: s.id,
          type: "quiz",
          title: `নতুন কুইজ: ${title}`,
          message: `${subject} — মোট নম্বর: ${totalMarks}, সময়: ${durationMinutes} মিনিট`,
          link: "/quizzes",
        }))
      );
    }

    return NextResponse.json({ quiz: created }, { status: 201 });
  } catch (err) {
    console.error("Create quiz error:", err);
    return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
  }
}
