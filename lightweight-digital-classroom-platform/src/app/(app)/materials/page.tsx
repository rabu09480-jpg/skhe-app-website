import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MaterialsClient } from "@/components/MaterialsClient";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <MaterialsClient user={user} />;
}
