import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { getProfile } from "@/lib/supabase/server";

export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/auth");

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,#dff7eb,transparent_28%),linear-gradient(180deg,#f8fafc,#eef3f8)]">
      <Sidebar profile={profile} />
      <main className="min-w-0 flex-1 p-5 md:p-7">{children}</main>
    </div>
  );
}