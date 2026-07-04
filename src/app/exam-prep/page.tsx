import { addFlashcard, addWeakTopic, createSubject } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, Brain, CheckCircle2, Flame, Layers, Plus, Target } from "lucide-react";
import type { Subject } from "@/lib/types";

type FlashcardRow = { id: string; question: string };
type WeakTopicRow = { id: string; topic: string };

export default async function ExamPrepPage() {
  const supabase = await createClient();
  const [{ data: subjects }, { data: flashcards }, { data: weakTopics }] = await Promise.all([
    supabase.from("subjects").select("*").order("created_at", { ascending: false }),
    supabase.from("flashcards").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.from("weak_topics").select("*").order("created_at", { ascending: false }).limit(8),
  ]);

  const subjectList = (subjects as Subject[] | null) ?? [];
  const cardList = (flashcards as FlashcardRow[] | null) ?? [];
  const weakList = (weakTopics as WeakTopicRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-950 via-slate-950 to-emerald-950 text-white shadow-xl shadow-slate-200/70">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_360px] md:p-8">
          <div>
            <Badge className="mb-4 bg-sky-300/15 text-sky-100"><Brain className="mr-1 h-3 w-3" /> Exam prep cockpit</Badge>
            <h1 className="text-3xl font-semibold md:text-5xl">Turn messy notes into a revision system.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Create subjects, capture weak topics, write flashcards, and keep a clean checklist for the next paper.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
            <div className="rounded-xl border border-white/10 bg-white/[0.07] p-4"><p className="text-2xl font-semibold">{subjectList.length}</p><p className="text-xs text-slate-300">Subjects</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.07] p-4"><p className="text-2xl font-semibold">{cardList.length}</p><p className="text-xs text-slate-300">Recent cards</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.07] p-4"><p className="text-2xl font-semibold">{weakList.length}</p><p className="text-xs text-slate-300">Weak topics</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader className="bg-slate-950 text-white"><CardTitle className="flex items-center gap-2 text-white"><Plus className="h-5 w-5 text-emerald-300" /> Create subject</CardTitle></CardHeader>
            <CardContent>
              <form action={createSubject} className="space-y-3">
                <Input name="name" required placeholder="Database Management Systems" />
                <Input name="semester" placeholder="Semester 5" />
                <Button className="w-full">Add subject</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-emerald-600" /> Revision checklist</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              {["Read syllabus once", "Solve two PYQs", "Revise weak topics", "Test with flashcards"].map((item) => (
                <label key={item} className="flex grid-cols-none flex-row items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <input type="checkbox" className="h-4 w-4" />
                  <span>{item}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {subjectList.map((subject, index) => (
              <Card key={subject.id} className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200">
                <div className={`h-2 ${index % 3 === 0 ? "bg-sky-400" : index % 3 === 1 ? "bg-emerald-400" : "bg-amber-300"}`} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-sky-600" /> {subject.name}</CardTitle>
                  <Badge className="w-fit">{subject.semester || "Semester not set"}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={addFlashcard} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
                    <input type="hidden" name="subject_id" value={subject.id} />
                    <Input name="question" placeholder="Flashcard question" required />
                    <Textarea name="answer" placeholder="Answer" required />
                    <Button size="sm" variant="secondary">Save flashcard</Button>
                  </form>
                  <form action={addWeakTopic} className="rounded-lg border border-amber-100 bg-amber-50/60 p-3 space-y-2">
                    <input type="hidden" name="subject_id" value={subject.id} />
                    <Input name="topic" placeholder="Weak topic" required />
                    <Input name="notes" placeholder="Why it is weak?" />
                    <Button size="sm" variant="secondary">Track weak topic</Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
          {!subjectList.length ? <Card><CardContent className="text-center text-sm text-slate-500">Create your first subject to start exam prep.</CardContent></Card> : null}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-slate-700" /> Recent revision material</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Flashcards</h3>
                <div className="space-y-2">{cardList.map((card) => <p key={card.id} className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950">{card.question}</p>)}</div>
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-amber-600" /> Weak topics</h3>
                <div className="space-y-2">{weakList.map((topic) => <p key={topic.id} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-950">{topic.topic}</p>)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}