import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, classes, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { and, desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classIdParam = req.nextUrl.searchParams.get("classId");

  const allClasses = await db
    .select()
    .from(classes)
    .orderBy(desc(classes.scheduledDate));
  const allStudents = await db
    .select()
    .from(users)
    .where(eq(users.role, "student"));
  const allAttendance = await db.select().from(attendance);

  const classMap = new Map(allClasses.map((c) => [c.id, c]));
  const studentMap = new Map(allStudents.map((s) => [s.id, s]));

  let filtered = allAttendance;
  if (user.role === "student") {
    filtered = filtered.filter((a) => a.userId === user.id);
  }
  if (classIdParam) {
    const cid = Number(classIdParam);
    filtered = filtered.filter((a) => a.classId === cid);
  }

  const records = filtered.map((a) => {
    const cls = classMap.get(a.classId);
    const stu = studentMap.get(a.userId);
    return {
      ...a,
      classTitle: cls?.titleBn || cls?.title || "Class",
      subject: cls?.subject || "",
      scheduledDate: cls?.scheduledDate || "",
      studentName: stu?.name || "Student",
      studentEmail: stu?.email || "",
    };
  });

  // Student summary report
  const studentReports = allStudents.map((s) => {
    const stuAtt = allAttendance.filter((a) => a.userId === s.id);
    const present = stuAtt.filter((a) => a.status === "present").length;
    const late = stuAtt.filter((a) => a.status === "late").length;
    const absent = stuAtt.filter((a) => a.status === "absent").length;
    const total = stuAtt.length || 1;
    const rate = Math.round(((present + late) / total) * 100);
    return {
      studentId: s.id,
      studentName: s.name,
      studentEmail: s.email,
      present,
      late,
      absent,
      totalRecords: stuAtt.length,
      attendanceRate: stuAtt.length === 0 ? 100 : rate,
    };
  });

  return NextResponse.json({
    records,
    studentReports:
      user.role === "student"
        ? studentReports.filter((r) => r.studentId === user.id)
        : studentReports,
    classes: allClasses,
    students: allStudents.map((s) => ({ id: s.id, name: s.name, email: s.email })),
  });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "instructor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const classId = Number(body.classId);
    const userId = Number(body.userId);
    const status = body.status as "present" | "late" | "absent";
    const durationMinutes = Number(body.durationMinutes) || (status === "absent" ? 0 : 45);
    const notes = String(body.notes || "").trim();

    if (!classId || !userId || !["present", "late", "absent"].includes(status)) {
      return NextResponse.json(
        { error: "classId, userId, and valid status are required" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.classId, classId), eq(attendance.userId, userId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(attendance)
        .set({
          status,
          durationMinutes,
          markedBy: "manual",
          notes,
        })
        .where(eq(attendance.id, existing.id))
        .returning();
      return NextResponse.json({ record: updated });
    }

    const [created] = await db
      .insert(attendance)
      .values({
        classId,
        userId,
        status,
        joinTime: status === "absent" ? null : new Date(),
        durationMinutes,
        markedBy: "manual",
        notes,
      })
      .returning();

    return NextResponse.json({ record: created }, { status: 201 });
  } catch (err) {
    console.error("Attendance save error:", err);
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}
