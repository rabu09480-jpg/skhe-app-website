import React from "react";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminUsersClient } from "@/components/AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return <AdminUsersClient />;
}
