import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, classes, classParticipants } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const classId = Number(id);
  const body = await req.json().catch(() => ({}));
  const action = body.action || "join";

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
    return NextResponse.json({ error: "Not enrolled in this class" }, { status: 403 });
  }

  // Record automatic attendance for students
  if (user.role === "student") {
    const [existing] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.classId, classId), eq(attendance.userId, user.id)))
      .limit(1);

    if (action === "join") {
      const now = new Date();
      let status: "present" | "late" = "present";
      if (cls.startedAt) {
        const diffMins = (now.getTime() - new Date(cls.startedAt).getTime()) / 60000;
        if (diffMins > 10) status = "late";
      }

      if (!existing) {
        await db.insert(attendance).values({
          classId,
          userId: user.id,
          status,
          joinTime: now,
          durationMinutes: 1,
          markedBy: "auto",
        });
      } else if (!existing.joinTime) {
        await db
          .update(attendance)
          .set({ status, joinTime: now, markedBy: "auto" })
          .where(eq(attendance.id, existing.id));
      }
    } else if (action === "leave" && existing) {
      const now = new Date();
      const joinMs = existing.joinTime ? new Date(existing.joinTime).getTime() : now.getTime();
      const durationMinutes = Math.max(1, Math.round((now.getTime() - joinMs) / 60000));
      await db
        .update(attendance)
        .set({ leaveTime: now, durationMinutes })
        .where(eq(attendance.id, existing.id));
    }
  }

  return NextResponse.json({
    ok: true,
    meetLink: cls.meetLink,
    backupMeetLink: cls.backupMeetLink,
    status: cls.status,
  });
}
