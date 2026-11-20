import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AnnouncementsClient } from "@/components/AnnouncementsClient";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AnnouncementsClient user={user} />;
}
