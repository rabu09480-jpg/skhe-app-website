import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { classes, recordings } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allRecordings = await db
    .select()
    .from(recordings)
    .orderBy(desc(recordings.recordedDate));
  const allClasses = await db.select().from(classes);
  const classMap = new Map(allClasses.map((c) => [c.id, c]));

  return NextResponse.json({
    recordings: allRecordings.map((r) => ({
      ...r,
      classTitle: r.classId ? classMap.get(r.classId)?.titleBn || classMap.get(r.classId)?.title || "" : "",
    })),
    classes: allClasses,
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
    const title = String(body.title || "").trim();
    const subject = String(body.subject || "").trim();
    const recordingUrl = String(body.recordingUrl || "").trim();
    const durationLabel = String(body.durationLabel || "45 min").trim();
    const recordedDate = String(body.recordedDate || new Date().toISOString().slice(0, 10));
    const notes = String(body.notes || "").trim();
    const classId = body.classId ? Number(body.classId) : null;

    if (!title || !subject || !recordingUrl) {
      return NextResponse.json(
        { error: "Title, subject, and recording link/file are required" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(recordings)
      .values({
        classId,
        title,
        subject,
        recordingUrl,
        durationLabel,
        recordedDate,
        notes,
        uploadedBy: user.id,
      })
      .returning();

    return NextResponse.json({ recording: created }, { status: 201 });
  } catch (err) {
    console.error("Create recording error:", err);
    return NextResponse.json({ error: "Failed to save recording" }, { status: 500 });
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

  await db.delete(recordings).where(eq(recordings.id, id));
  return NextResponse.json({ ok: true });
}
