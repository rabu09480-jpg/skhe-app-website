import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser, hashPassword, sanitizeUser, verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updates: Partial<typeof users.$inferInsert> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim();
    }
    if (typeof body.bio === "string") {
      updates.bio = body.bio.trim();
    }
    if (typeof body.avatarUrl === "string") {
      updates.avatarUrl = body.avatarUrl.trim();
    }
    if (body.preferredLanguage === "bn" || body.preferredLanguage === "en") {
      updates.preferredLanguage = body.preferredLanguage;
    }
    if (typeof body.dataSaverDefault === "boolean") {
      updates.dataSaverDefault = body.dataSaverDefault;
    }

    if (typeof body.newPassword === "string" && body.newPassword.length >= 6) {
      const [current] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.id))
        .limit(1);
      if (!current || !(await verifyPassword(String(body.currentPassword || ""), current.passwordHash))) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
      updates.passwordHash = await hashPassword(body.newPassword);
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, session.id))
      .returning();

    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
