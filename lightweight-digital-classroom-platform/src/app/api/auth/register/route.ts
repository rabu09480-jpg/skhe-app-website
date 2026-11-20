import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import {
  createSessionToken,
  hashPassword,
  sanitizeUser,
  setSessionCookie,
  UserRole,
} from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();

    if (!code || !name || !email || password.length < 6) {
      return NextResponse.json(
        { error: "Invite code, name, email, and password (min 6 chars) are required" },
        { status: 400 }
      );
    }

    const [invite] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.code, code))
      .limit(1);

    if (!invite) {
      return NextResponse.json({ error: "Invalid invitation code" }, { status: 400 });
    }

    if (invite.usedBy && invite.code !== "PATHSHALA2026") {
      return NextResponse.json(
        { error: "This invitation code has already been used" },
        { status: 400 }
      );
    }

    if (invite.email && invite.email.toLowerCase() !== email) {
      return NextResponse.json(
        { error: "This invitation code is restricted to a different email" },
        { status: 403 }
      );
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
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
        role: invite.role || "student",
        phone,
        className: invite.className || "SSC Batch - 2026",
        preferredLanguage: "bn",
      })
      .returning();

    if (invite.code !== "PATHSHALA2026") {
      await db
        .update(invitations)
        .set({ usedBy: created.id })
        .where(eq(invitations.id, invite.id));
    }

    const token = await createSessionToken({
      userId: created.id,
      email: created.email,
      role: created.role as UserRole,
    });
    await setSessionCookie(token);

    return NextResponse.json({ user: sanitizeUser(created) }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
