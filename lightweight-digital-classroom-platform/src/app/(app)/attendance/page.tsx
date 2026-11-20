import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AttendanceClient } from "@/components/AttendanceClient";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AttendanceClient user={user} />;
}
