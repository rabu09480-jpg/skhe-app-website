import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser, hashPassword, sanitizeUser } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import crypto from "crypto";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access only" }, { status: 403 });
  }

  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  const allInvites = await db
    .select()
    .from(invitations)
    .orderBy(desc(invitations.createdAt));

  return NextResponse.json({
    users: allUsers.map(sanitizeUser),
    invitations: allInvites,
  });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const action = body.action || "create_user";

    if (action === "create_invite") {
      const code =
        String(body.code || "").trim().toUpperCase() ||
        `PATH-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const [created] = await db
        .insert(invitations)
        .values({
          code,
          email: String(body.email || "").trim().toLowerCase(),
          role: body.role === "instructor" ? "instructor" : "student",
          className: String(body.className || "SSC Batch - 2026"),
          createdBy: user.id,
        })
        .returning();
      return NextResponse.json({ invitation: created }, { status: 201 });
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "student123");
    const role =
      body.role === "admin" || body.role === "instructor" ? body.role : "student";
    const phone = String(body.phone || "").trim();
    const className = String(body.className || "SSC Batch - 2026").trim();

    if (!name || !email || password.length < 6) {
      return NextResponse.json(
        { error: "Name, email, and password (min 6 chars) are required" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        role,
        phone,
        className,
        preferredLanguage: "bn",
      })
      .returning();

    return NextResponse.json({ user: sanitizeUser(created) }, { status: 201 });
  } catch (err) {
    console.error("Admin create user error:", err);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const userId = Number(body.userId);
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const updates: Partial<typeof users.$inferInsert> = {};
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
    if (body.role === "student" || body.role === "instructor" || body.role === "admin") {
      updates.role = body.role;
    }
    if (typeof body.className === "string") updates.className = body.className;
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.phone === "string") updates.phone = body.phone.trim();

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (err) {
    console.error("Admin update user error:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access only" }, { status: 403 });
  }

  const userId = Number(req.nextUrl.searchParams.get("id"));
  if (!userId || userId === user.id) {
    return NextResponse.json({ error: "Cannot delete current admin" }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
