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
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const classId = Number(id);
  if (!classId) {
    return NextResponse.json({ error: "Invalid class ID" }, { status: 400 });
  }

  const [cls] = await db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);

  if (!cls) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const participants = await db
    .select()
    .from(classParticipants)
    .where(eq(classParticipants.classId, classId));

  const isAuthorized =
    user.role === "admin" ||
    user.role === "instructor" ||
    participants.length === 0 ||
    participants.some((p) => p.userId === user.id);

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "You are not enrolled in this class" },
      { status: 403 }
    );
  }

  const instructor = cls.instructorId
    ? (await db.select().from(users).where(eq(users.id, cls.instructorId)).limit(1))[0]
    : null;

  const materials = await db
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.classId, classId));

  return NextResponse.json({
    class: {
      ...cls,
      instructorName: instructor?.name || "Instructor",
      instructorEmail: instructor?.email || "",
    },
    materials,
    participants: participants.map((p) => p.userId),
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "instructor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const classId = Number(id);
  if (!classId) {
    return NextResponse.json({ error: "Invalid class ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const updates: Partial<typeof classes.$inferInsert> = {};

    if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim();
    if (typeof body.titleBn === "string") updates.titleBn = body.titleBn.trim();
    if (typeof body.subject === "string" && body.subject.trim()) updates.subject = body.subject.trim();
    if (typeof body.description === "string") updates.description = body.description.trim();
    if (typeof body.scheduledDate === "string") updates.scheduledDate = body.scheduledDate.trim();
    if (typeof body.startTime === "string") updates.startTime = body.startTime.trim();
    if (typeof body.endTime === "string") updates.endTime = body.endTime.trim();
    if (typeof body.meetLink === "string") updates.meetLink = body.meetLink.trim();
    if (typeof body.backupMeetLink === "string") updates.backupMeetLink = body.backupMeetLink.trim();
    if (typeof body.chatEnabled === "boolean") updates.chatEnabled = body.chatEnabled;

    if (
      body.status === "upcoming" ||
      body.status === "live" ||
      body.status === "completed" ||
      body.status === "cancelled"
    ) {
      updates.status = body.status;
      if (body.status === "live") {
        updates.startedAt = new Date();
      } else if (body.status === "completed") {
        updates.endedAt = new Date();
      }
    }

    const [updated] = await db
      .update(classes)
      .set(updates)
      .where(eq(classes.id, classId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Update participant list if provided by admin
    if (Array.isArray(body.participantIds) && user.role === "admin") {
      await db.delete(classParticipants).where(eq(classParticipants.classId, classId));
      const ids = body.participantIds.map(Number).filter(Boolean);
      if (ids.length > 0) {
        await db.insert(classParticipants).values(
          ids.map((uid: number) => ({ classId, userId: uid }))
        );
      }
    }

    // Notify participants if class just went live or got cancelled
    if (body.status === "live" || body.status === "cancelled") {
      const participants = await db
        .select()
        .from(classParticipants)
        .where(eq(classParticipants.classId, classId));
      if (participants.length > 0) {
        await db.insert(notifications).values(
          participants.map((p) => ({
            userId: p.userId,
            type: "class",
            title:
              body.status === "live"
                ? `লাইভ ক্লাস শুরু হয়েছে: ${updated.titleBn || updated.title}`
                : `ক্লাস বাতিল করা হয়েছে: ${updated.titleBn || updated.title}`,
            message:
              body.status === "live"
                ? "শিক্ষক ক্লাসে উপস্থিত আছেন। এখনই যোগ দিন।"
                : "এই ক্লাসটি বাতিল করা হয়েছে। পরবর্তী সময়সূচি দেখুন।",
            link: `/classroom/${classId}`,
          }))
        );
      }
    }

    return NextResponse.json({ class: updated });
  } catch (err) {
    console.error("Update class error:", err);
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const classId = Number(id);
  await db.delete(classes).where(eq(classes.id, classId));
  return NextResponse.json({ ok: true });
}
