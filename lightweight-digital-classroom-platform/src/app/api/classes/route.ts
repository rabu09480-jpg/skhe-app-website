import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  classes,
  classParticipants,
  notifications,
  studyMaterials,
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

  const allClasses = await db
    .select()
    .from(classes)
    .orderBy(desc(classes.scheduledDate), classes.startTime);

  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const allMaterials = await db.select().from(studyMaterials);
  const allParticipants = await db.select().from(classParticipants);

  const enriched = allClasses.map((c) => {
    const inst = c.instructorId ? userMap.get(c.instructorId) : null;
    const participantIds = allParticipants
      .filter((p) => p.classId === c.id)
      .map((p) => p.userId);
    const isAuthorized =
      user.role === "admin" ||
      user.role === "instructor" ||
      participantIds.length === 0 ||
      participantIds.includes(user.id);

    return {
      id: c.id,
      title: c.title,
      titleBn: c.titleBn,
      subject: c.subject,
      description: c.description,
      instructorId: c.instructorId,
      instructorName: inst?.name || "Instructor",
      scheduledDate: c.scheduledDate,
      startTime: c.startTime,
      endTime: c.endTime,
      status: c.status,
      meetLink: isAuthorized ? c.meetLink : "",
      backupMeetLink: isAuthorized ? c.backupMeetLink : "",
      chatEnabled: c.chatEnabled,
      participantCount: participantIds.length,
      materialsCount: allMaterials.filter((m) => m.classId === c.id).length,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
    };
  });

  return NextResponse.json({ classes: enriched });
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
    const titleBn = String(body.titleBn || "").trim();
    const subject = String(body.subject || "").trim();
    const description = String(body.description || "").trim();
    const scheduledDate = String(body.scheduledDate || "").trim();
    const startTime = String(body.startTime || "").trim();
    const endTime = String(body.endTime || "").trim();
    const meetLink = String(body.meetLink || "").trim();
    const backupMeetLink = String(body.backupMeetLink || "").trim();

    if (!title || !subject || !scheduledDate || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, subject, date, start time, and end time are required" },
        { status: 400 }
      );
    }

    let instructorId = Number(body.instructorId) || user.id;
    if (user.role === "admin" && !body.instructorId) {
      const [inst] = await db
        .select()
        .from(users)
        .where(eq(users.role, "instructor"))
        .limit(1);
      if (inst) instructorId = inst.id;
    }

    const [created] = await db
      .insert(classes)
      .values({
        title,
        titleBn: titleBn || title,
        subject,
        description,
        instructorId,
        scheduledDate,
        startTime,
        endTime,
        status: body.status === "live" ? "live" : "upcoming",
        meetLink,
        backupMeetLink,
        startedAt: body.status === "live" ? new Date() : null,
        createdBy: user.id,
      })
      .returning();

    // Enroll selected students or all active students by default
    let studentIds: number[] = Array.isArray(body.participantIds)
      ? body.participantIds.map(Number).filter(Boolean)
      : [];

    if (studentIds.length === 0) {
      const activeStudents = await db
        .select()
        .from(users)
        .where(eq(users.role, "student"));
      studentIds = activeStudents.map((s) => s.id);
    }

    if (studentIds.length > 0) {
      await db.insert(classParticipants).values(
        studentIds.map((uid) => ({
          classId: created.id,
          userId: uid,
        }))
      );

      await db.insert(notifications).values(
        studentIds.map((uid) => ({
          userId: uid,
          type: "class",
          title: `নতুন ক্লাস নির্ধারিত: ${titleBn || title}`,
          message: `${subject} ক্লাস ${scheduledDate} তারিখ ${startTime} টায় অনুষ্ঠিত হবে।`,
          link: `/classroom/${created.id}`,
        }))
      );
    }

    return NextResponse.json({ class: created }, { status: 201 });
  } catch (err) {
    console.error("Create class error:", err);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
