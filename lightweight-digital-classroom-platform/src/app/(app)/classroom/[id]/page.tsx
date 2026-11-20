import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClassroomClient } from "@/components/ClassroomClient";

export const dynamic = "force-dynamic";

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <ClassroomClient user={user} classId={Number(id)} />;
}
