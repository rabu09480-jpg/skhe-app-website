import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { QuizzesClient } from "@/components/QuizzesClient";

export const dynamic = "force-dynamic";

export default async function QuizzesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <QuizzesClient user={user} />;
}
