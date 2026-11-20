import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProgressClient } from "@/components/ProgressClient";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <ProgressClient user={user} />;
}
