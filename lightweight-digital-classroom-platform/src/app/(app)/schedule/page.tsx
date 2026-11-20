import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ScheduleClient } from "@/components/ScheduleClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <ScheduleClient user={user} />;
}
