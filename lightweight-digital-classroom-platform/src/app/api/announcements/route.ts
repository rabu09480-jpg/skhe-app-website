import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, notifications, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));

  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

  const filtered = all.filter(
    (a) =>
      user.role === "admin" ||
      a.targetRole === "all" ||
      a.targetRole === user.role
  );

  return NextResponse.json({
    announcements: filtered.map((a) => ({
      ...a,
      authorName: a.createdBy ? userMap.get(a.createdBy) || "Staff" : "Staff",
    })),
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
    const content = String(body.content || "").trim();
    const priority = String(body.priority || "normal");
    const targetRole = String(body.targetRole || "all");

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(announcements)
      .values({
        title,
        content,
        priority,
        targetRole,
        createdBy: user.id,
      })
      .returning();

    const allUsers = await db.select().from(users);
    const targets = allUsers.filter(
      (u) =>
        u.id !== user.id &&
        (targetRole === "all" || u.role === targetRole)
    );

    if (targets.length > 0) {
      await db.insert(notifications).values(
        targets.map((t) => ({
          userId: t.id,
          type: "announcement",
          title: `নতুন ঘোষণা: ${title}`,
          message: content.slice(0, 120),
          link: "/announcements",
        }))
      );
    }

    return NextResponse.json({ announcement: created }, { status: 201 });
  } catch (err) {
    console.error("Announcement error:", err);
    return NextResponse.json({ error: "Failed to post announcement" }, { status: 500 });
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

  await db.delete(announcements).where(eq(announcements.id, id));
  return NextResponse.json({ ok: true });
}
