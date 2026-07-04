import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Boxes, FolderKanban, GitPullRequest, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkshopScene } from "@/components/visuals/workshop-scene";
import { getUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getUser();
  if (user) redirect("/dashboard");
  const features: { title: string; body: string; icon: LucideIcon }[] = [
    { title: "Build projects", body: "Upload reports, screenshots, links, tasks, and collaborator notes in one organized studio.", icon: FolderKanban },
    { title: "Share publicly", body: "Publish projects to a public gallery where students can copy, learn, and request owner approval.", icon: GitPullRequest },
    { title: "Prepare smarter", body: "Track subjects, weak topics, flashcards, and AI-powered revision with daily limits.", icon: BookOpen },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-8 lg:grid-cols-[1fr_0.95fr]">
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(90deg,rgba(34,197,94,.18),rgba(56,189,248,.14),rgba(251,191,36,.12))] blur-3xl" />
        <div className="relative z-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-sm font-medium text-emerald-200">
            <Sparkles className="h-4 w-4" /> Project collaboration + exam prep studio
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-normal text-white md:text-7xl">Micky&apos;s Workshop</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            A polished workspace for B.Tech teams to build projects, publish public learning templates, request owner-approved improvements, and prepare for exams without losing the thread.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth"><Button className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"><ArrowRight className="h-4 w-4" /> Enter workshop</Button></Link>
            <Link href="/auth"><Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15">Log in</Button></Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {["Public project gallery", "Owner-approved changes", "Private owner tools"].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">{item}</div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <WorkshopScene />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-10 md:grid-cols-2 xl:grid-cols-4">
        {features.map(({ title, body, icon: Icon }) => (
          <Card key={title} className="border-white/10 bg-white/[0.06] text-white backdrop-blur">
            <CardContent className="flex gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-300/15 text-emerald-200"><Icon className="h-5 w-5" /></div>
              <div>
                <h2 className="font-semibold text-white">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="pointer-events-none fixed bottom-8 right-8 hidden rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-300 backdrop-blur md:flex">
        <Boxes className="mr-2 h-4 w-4 text-amber-200" /> Built for students who ship
      </div>
    </main>
  );
}