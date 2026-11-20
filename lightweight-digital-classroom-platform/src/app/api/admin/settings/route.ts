import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { getSessionUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [settings] = await db.select().from(platformSettings).limit(1);
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  await ensureSeeded();
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access only" }, { status: 403 });
  }

  const body = await req.json();
  const [existing] = await db.select().from(platformSettings).limit(1);

  if (!existing) {
    const [created] = await db
      .insert(platformSettings)
      .values({
        schoolName: String(body.schoolName || "Pathshala Digital Classroom"),
        schoolNameBn: String(body.schoolNameBn || "পাঠশালা ডিজিটাল শ্রেণিকক্ষ"),
        defaultLanguage: body.defaultLanguage === "en" ? "en" : "bn",
        lowBandwidthDefault: Boolean(body.lowBandwidthDefault),
        emailNotificationsEnabled: Boolean(body.emailNotificationsEnabled),
      })
      .returning();
    return NextResponse.json({ settings: created });
  }

  const [updated] = await db
    .update(platformSettings)
    .set({
      schoolName: body.schoolName ? String(body.schoolName) : existing.schoolName,
      schoolNameBn: body.schoolNameBn ? String(body.schoolNameBn) : existing.schoolNameBn,
      defaultLanguage:
        body.defaultLanguage === "en" || body.defaultLanguage === "bn"
          ? body.defaultLanguage
          : existing.defaultLanguage,
      lowBandwidthDefault:
        typeof body.lowBandwidthDefault === "boolean"
          ? body.lowBandwidthDefault
          : existing.lowBandwidthDefault,
      emailNotificationsEnabled:
        typeof body.emailNotificationsEnabled === "boolean"
          ? body.emailNotificationsEnabled
          : existing.emailNotificationsEnabled,
      updatedAt: new Date(),
    })
    .where(eq(platformSettings.id, existing.id))
    .returning();

  return NextResponse.json({ settings: updated });
}
