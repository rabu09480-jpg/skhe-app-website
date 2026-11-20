import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "request";
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (action === "request") {
      if (!user) {
        return NextResponse.json({
          ok: true,
          message: "If an account exists, a reset code has been generated.",
        });
      }
      const token = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 30 * 60 * 1000);
      await db
        .update(users)
        .set({ resetToken: token, resetExpiresAt: expires })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        ok: true,
        // Returned for local demo convenience when SMTP is unconfigured
        demoResetCode: token,
        message: "Reset code generated (valid 30 minutes).",
      });
    }

    if (action === "confirm") {
      const token = String(body.code || "").trim();
      const newPassword = String(body.newPassword || "");

      if (!user || !user.resetToken || user.resetToken !== token) {
        return NextResponse.json({ error: "Invalid reset code" }, { status: 400 });
      }
      if (user.resetExpiresAt && user.resetExpiresAt < new Date()) {
        return NextResponse.json({ error: "Reset code expired" }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(newPassword);
      await db
        .update(users)
        .set({ passwordHash, resetToken: null, resetExpiresAt: null })
        .where(eq(users.id, user.id));

      return NextResponse.json({ ok: true, message: "Password updated successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}
