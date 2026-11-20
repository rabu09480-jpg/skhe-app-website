import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assignmentSubmissions, notifications } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || (user.role !== "instructor" && user.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const assignmentId = Number(id);

  try {
    const body = await req.json();
    const submissionId = Number(body.submissionId);
    const status = (body.status as "graded" | "returned" | "late") || "graded";
    const marks = body.marks !== undefined && body.marks !== "" ? Number(body.marks) : null;
    const feedback = String(body.feedback || "").trim();

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId required" }, { status: 400 });
    }

    const [updated] = await db
      .update(assignmentSubmissions)
      .set({
        status,
        marks,
        feedback,
        gradedBy: user.id,
        gradedAt: new Date(),
      })
      .where(eq(assignmentSubmissions.id, submissionId))
      .returning();

    if (!updated || updated.assignmentId !== assignmentId) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    await db.insert(notifications).values({
      userId: updated.studentId,
      type: "assignment",
      title:
        status === "returned"
          ? "অ্যাসাইনমেন্ট সংশোধনের জন্য ফেরত দেওয়া হয়েছে"
          : "অ্যাসাইনমেন্টের নম্বর প্রকাশিত হয়েছে",
      message:
        status === "returned"
          ? `মন্তব্য: ${feedback || "অনুগ্রহ করে সংশোধন করে পুনরায় জমা দাও।"}`
          : `প্রাপ্ত নম্বর: ${marks ?? "-"}। ${feedback}`,
      link: "/assignments",
    });

    return NextResponse.json({ submission: updated });
  } catch (err) {
    console.error("Grade assignment error:", err);
    return NextResponse.json({ error: "Failed to grade submission" }, { status: 500 });
  }
}
