import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeeded();
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
