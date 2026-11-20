import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assignments, assignmentSubmissions } from "@/db/schema";
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
  const assignmentId = Number(id);

  const [assignment] = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const answerText = String(body.answerText || "").trim();
    const fileUrl = String(body.fileUrl || "").trim();
    const fileName = String(body.fileName || "").trim();

    if (!answerText && !fileUrl) {
      return NextResponse.json(
        { error: "Please provide written answer or attach a file" },
        { status: 400 }
      );
    }

    const deadlineDate = new Date(assignment.deadline.replace(" ", "T"));
    const isLate = !isNaN(deadlineDate.getTime()) && new Date() > deadlineDate;
    const status = isLate ? "late" : "submitted";

    const [existing] = await db
      .select()
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.assignmentId, assignmentId),
          eq(assignmentSubmissions.studentId, user.id)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(assignmentSubmissions)
        .set({
          answerText,
          fileUrl,
          fileName,
          status,
          submittedAt: new Date(),
        })
        .where(eq(assignmentSubmissions.id, existing.id))
        .returning();
      return NextResponse.json({ submission: updated });
    }

    const [created] = await db
      .insert(assignmentSubmissions)
      .values({
        assignmentId,
        studentId: user.id,
        answerText,
        fileUrl,
        fileName,
        status,
      })
      .returning();

    return NextResponse.json({ submission: created }, { status: 201 });
  } catch (err) {
    console.error("Submit assignment error:", err);
    return NextResponse.json({ error: "Failed to submit assignment" }, { status: 500 });
  }
}
