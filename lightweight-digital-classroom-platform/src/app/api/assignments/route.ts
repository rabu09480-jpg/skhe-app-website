import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  assignments,
  assignmentSubmissions,
  classes,
  notifications,
  users,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allAssignments = await db
    .select()
    .from(assignments)
    .orderBy(desc(assignments.createdAt));

  const allSubmissions = await db.select().from(assignmentSubmissions);
  const allUsers = await db.select().from(users);
  const allClasses = await db.select().from(classes);

  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const classMap = new Map(allClasses.map((c) => [c.id, c]));

  const enriched = allAssignments.map((a) => {
    const subs = allSubmissions.filter((s) => s.assignmentId === a.id);
    const mySubmission = subs.find((s) => s.studentId === user.id) || null;
    const mappedSubs =
      user.role === "instructor" || user.role === "admin"
        ? subs.map((s) => ({
            ...s,
            studentName: userMap.get(s.studentId)?.name || "Student",
            studentEmail: userMap.get(s.studentId)?.email || "",
          }))
        : [];

    return {
      ...a,
      classTitle: a.classId ? classMap.get(a.classId)?.titleBn || classMap.get(a.classId)?.title || "" : "",
      mySubmission,
      submissions: mappedSubs,
      submissionCount: subs.length,
    };
  });

  return NextResponse.json({ assignments: enriched, classes: allClasses });
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
    const deadline = String(body.deadline || "").trim();
    const description = String(body.description || "").trim();
    const instructions = String(body.instructions || "").trim();
    const submissionType = String(body.submissionType || "both");
    const maxMarks = Number(body.maxMarks) || 20;
    const classId = body.classId ? Number(body.classId) : null;
    const attachmentUrl = String(body.attachmentUrl || "").trim();
    const attachmentName = String(body.attachmentName || "").trim();

    if (!title || !subject || !deadline) {
      return NextResponse.json(
        { error: "Title, subject, and deadline are required" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(assignments)
      .values({
        classId,
        title,
        description,
        instructions,
        subject,
        deadline,
        attachmentUrl,
        attachmentName,
        submissionType,
        maxMarks,
        createdBy: user.id,
      })
      .returning();

    const students = await db
      .select()
      .from(users)
      .where(eq(users.role, "student"));
    if (students.length > 0) {
      await db.insert(notifications).values(
        students.map((s) => ({
          userId: s.id,
          type: "assignment",
          title: `নতুন অ্যাসাইনমেন্ট: ${title}`,
          message: `${subject} — শেষ সময়: ${deadline}`,
          link: "/assignments",
        }))
      );
    }

    return NextResponse.json({ assignment: created }, { status: 201 });
  } catch (err) {
    console.error("Create assignment error:", err);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "instructor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.delete(assignments).where(eq(assignments.id, id));
  return NextResponse.json({ ok: true });
}
