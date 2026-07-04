import Link from "next/link";
import { ArrowUpRight, Copy, ExternalLink, Globe2, Lock, Plus, Sparkles, Users } from "lucide-react";
import { copyPublicProject } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

function isMissingTableError(message?: string) {
  return message?.includes("schema cache") || message?.includes("public.projects");
}

function techBadges(stack: string | null) {
  return (stack || "Planning").split(",").slice(0, 4).map((tech) => <Badge key={tech}>{tech.trim()}</Badge>);
}

export default async function ProjectsPage() {
  const supabase = await createClient();
  const user = await getUser();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false });

  const allProjects = (projects as Project[] | null) ?? [];
  const publicProjects = allProjects.filter((project) => project.visibility === "public");
  const myProjects = allProjects.filter((project) => project.owner_id === user?.id || project.visibility !== "public");

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-xl shadow-slate-200/70">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_320px] md:p-8">
          <div>
            <Badge className="mb-4 bg-emerald-300/15 text-emerald-200"><Sparkles className="mr-1 h-3 w-3" /> Project studio</Badge>
            <h1 className="text-3xl font-semibold md:text-5xl">Build, publish, copy, improve.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Keep private projects focused, publish public builds for everyone, and let copied improvements come back as owner-approved requests.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/projects/new"><Button className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Plus className="h-4 w-4" /> New project</Button></Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4"><p className="text-2xl font-semibold">{allProjects.length}</p><p className="text-xs text-slate-300">Total visible</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4"><p className="text-2xl font-semibold">{publicProjects.length}</p><p className="text-xs text-slate-300">Public builds</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4"><p className="text-2xl font-semibold">{myProjects.length}</p><p className="text-xs text-slate-300">Your workspace</p></div>
          </div>
        </div>
      </section>

      {error && isMissingTableError(error.message) ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader><CardTitle className="text-amber-950">Database setup needed</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-amber-900">
            <p>Supabase is connected, but the project tables are not created yet. Paste the contents of this file into Supabase SQL Editor:</p>
            <code className="block rounded-md bg-white p-3 text-amber-950">supabase/schema.sql</code>
          </CardContent>
        </Card>
      ) : null}

      {error && !isMissingTableError(error.message) ? <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}</p> : null}

      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-100/60">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950"><Globe2 className="h-5 w-5 text-emerald-600" /> Public gallery</h2>
            <p className="mt-1 text-sm text-slate-500">Open projects students can inspect, copy, remix, and send back for approval.</p>
          </div>
          <Badge className="w-fit bg-emerald-50 text-emerald-700"><Users className="mr-1 h-3 w-3" /> Everyone can view</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {publicProjects.map((project, index) => (
            <Card key={project.id} className="group h-full overflow-hidden border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100">
              <div className={`h-2 ${index % 3 === 0 ? "bg-emerald-400" : index % 3 === 1 ? "bg-sky-400" : "bg-amber-300"}`} />
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/projects/${project.id}`} className="min-w-0"><CardTitle className="truncate group-hover:text-emerald-700">{project.title}</CardTitle></Link>
                  <Badge className="bg-emerald-100 text-emerald-800">Public</Badge>
                </div>
                <p className="text-xs text-slate-500">by {project.profiles?.full_name || project.profiles?.email || "Student"}</p>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 min-h-16 text-sm leading-6 text-slate-600">{project.description || "No description yet."}</p>
                <div className="mt-4 flex flex-wrap gap-2">{techBadges(project.tech_stack)}</div>
                <div className="mt-5 flex gap-2">
                  <Link href={`/projects/${project.id}`} className="flex-1"><Button variant="secondary" className="w-full">Open <ArrowUpRight className="h-4 w-4" /></Button></Link>
                  {project.owner_id !== user?.id ? (
                    <form action={copyPublicProject}>
                      <input type="hidden" name="project_id" value={project.id} />
                      <Button title="Copy project" size="icon" variant="outline"><Copy className="h-4 w-4" /></Button>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {!publicProjects.length ? <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-center text-sm text-emerald-800">No public projects yet. Publish one while creating a project.</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-500" />
          <h2 className="text-xl font-semibold text-slate-950">Your workspace</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {myProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="truncate">{project.title}</CardTitle>
                    <Badge>{project.visibility === "public" ? "Public" : "Private"}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 min-h-16 text-sm leading-6 text-slate-600">{project.description || "No description yet."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">{techBadges(project.tech_stack)}</div>
                  {project.github_link ? <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><ExternalLink className="h-4 w-4" /> GitHub added</p> : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {!myProjects.length ? <Card><CardContent className="text-center text-sm text-slate-500">No projects yet. Create your first project to start the workshop.</CardContent></Card> : null}
      </section>
    </div>
  );
}