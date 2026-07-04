import Link from "next/link";
import { BookOpen, Brain, FolderKanban, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkshopScene } from "@/components/visuals/workshop-scene";
import { createClient, getProfile } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getProfile();
  const [{ count: projectCount }, { count: subjectCount }, { data: settings }] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase.from("subjects").select("*", { count: "exact", head: true }),
    supabase.from("app_settings").select("ai_enabled").eq("id", 1).single(),
  ]);

  const stats = [
    { label: "Projects", value: projectCount ?? 0, icon: FolderKanban, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Subjects", value: subjectCount ?? 0, icon: BookOpen, tone: "bg-sky-50 text-sky-700" },
    { label: "AI status", value: settings?.ai_enabled === false ? "Off" : "Ready", icon: Brain, tone: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-xl shadow-slate-200/70 lg:grid-cols-[1fr_420px]">
        <div className="p-6 md:p-8">
          <Badge className="mb-4 bg-emerald-300/15 text-emerald-200"><Sparkles className="mr-1 h-3 w-3" /> Live workshop</Badge>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">Welcome back, {profile?.full_name || "builder"}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Keep projects moving, publish useful builds, and turn weak topics into revision wins. Your workspace is ready for today&apos;s push.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/projects/new"><Button className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Plus className="h-4 w-4" /> New project</Button></Link>
            <Link href="/projects"><Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15">Explore public gallery</Button></Link>
          </div>
        </div>
        <div className="hidden lg:block"><WorkshopScene compact /></div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{stat.label}</CardTitle>
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${stat.tone}`}><stat.icon className="h-5 w-5" /></span>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{stat.value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Today&apos;s focus</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <p className="rounded-lg bg-slate-50 p-4">Ship one project task and write a useful update for collaborators.</p>
          <p className="rounded-lg bg-slate-50 p-4">Add one weak topic and convert it into two flashcards.</p>
          <p className="rounded-lg bg-slate-50 p-4">{profile?.role === "owner" ? "Use your private owner workspace for focused revision." : "Use AI carefully. Students get 5 actions per day."}</p>
        </CardContent>
      </Card>
    </div>
  );
}