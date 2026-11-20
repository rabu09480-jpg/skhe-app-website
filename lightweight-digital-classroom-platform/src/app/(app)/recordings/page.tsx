import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RecordingsClient } from "@/components/RecordingsClient";

export const dynamic = "force-dynamic";

export default async function RecordingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <RecordingsClient user={user} />;
}
