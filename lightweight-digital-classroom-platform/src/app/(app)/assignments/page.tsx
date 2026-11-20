import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssignmentsClient } from "@/components/AssignmentsClient";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <AssignmentsClient user={user} />;
}
