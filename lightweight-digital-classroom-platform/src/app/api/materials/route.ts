import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { classes, notifications, studyMaterials, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subject = req.nextUrl.searchParams.get("subject");
  const classId = req.nextUrl.searchParams.get("classId");

  const all = await db
    .select()
    .from(studyMaterials)
    .orderBy(desc(studyMaterials.createdAt));

  const allClasses = await db.select().from(classes);
  const classMap = new Map(allClasses.map((c) => [c.id, c]));

  let filtered = all;
  if (subject && subject !== "all") {
    filtered = filtered.filter((m) => m.subject.toLowerCase() === subject.toLowerCase());
  }
  if (classId) {
    filtered = filtered.filter((m) => m.classId === Number(classId));
  }

  const enriched = filtered.map((m) => {
    const cls = m.classId ? classMap.get(m.classId) : null;
    return {
      ...m,
      classTitle: cls?.titleBn || cls?.title || "General",
    };
  });

  return NextResponse.json({ materials: enriched, classes: allClasses });
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
    const topic = String(body.topic || "").trim();
    const type = String(body.type || "pdf");
    const fileUrl = String(body.fileUrl || "").trim();
    const fileName = String(body.fileName || "").trim();
    const fileSizeBytes = Number(body.fileSizeBytes) || 0;
    const classId = body.classId ? Number(body.classId) : null;

    if (!title || !subject || !fileUrl) {
      return NextResponse.json(
        { error: "Title, subject, and file/link URL are required" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(studyMaterials)
      .values({
        classId,
        title,
        subject,
        topic,
        type,
        fileUrl,
        fileName,
        fileSizeBytes,
        uploadedBy: user.id,
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
          type: "material",
          title: `নতুন স্টাডি ম্যাটেরিয়াল: ${title}`,
          message: `${subject} বিষয়ের নতুন নোট যুক্ত হয়েছে। অফলাইন পড়ার জন্য ডাউনলোড করতে পারেন।`,
          link: "/materials",
        }))
      );
    }

    return NextResponse.json({ material: created }, { status: 201 });
  } catch (err) {
    console.error("Create material error:", err);
    return NextResponse.json({ error: "Failed to save study material" }, { status: 500 });
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

  await db.delete(studyMaterials).where(eq(studyMaterials.id, id));
  return NextResponse.json({ ok: true });
}
