import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { and, desc, eq } from "drizzle-orm";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  return NextResponse.json({
    notifications: items,
    unreadCount: items.filter((n) => !n.isRead).length,
  });
}

export async function PATCH(req: NextRequest) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.markAll) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, user.id));
  } else if (body.id) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.id, Number(body.id)), eq(notifications.userId, user.id))
      );
  }

  return NextResponse.json({ ok: true });
}
