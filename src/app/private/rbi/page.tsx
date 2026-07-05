import { redirect } from "next/navigation";
import { saveRbiAnswer, uploadRbiNote } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { createClient, getProfile } from "@/lib/supabase/server";

const folders = ["ESI", "Finance", "Management", "Current Affairs", "Answer Writing"];

type RbiNoteRow = {
  id: string;
  folder: string;
  title: string;
  file_path: string | null;
};

type RbiAnswerRow = {
  id: string;
  question: string;
  answer: string;
};

export default async function RbiPage() {
  const profile = await getProfile();
  if (profile?.role !== "owner") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: notes }, { data: answers }] = await Promise.all([
    supabase.from("rbi_notes").select("*").order("created_at", { ascending: false }),
    supabase.from("rbi_answers").select("*").order("created_at", { ascending: false }).limit(6),
  ]);

  return (
    <>
      <PageHeader title="Private RBI Grade B" description="Owner-only workspace protected in UI, server route, and database policies." />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Folders</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">{folders.map((folder) => <Badge key={folder}>{folder}</Badge>)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Upload RBI note</CardTitle></CardHeader>
            <CardContent>
              <form action={uploadRbiNote} className="space-y-3">
                <select name="folder" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
                  {folders.map((folder) => <option key={folder} value={folder}>{folder}</option>)}
                </select>
                <Input name="title" placeholder="Note title, e.g. ESI poverty schemes" />
                <Input name="file" type="file" accept=".pdf,.txt,.md" required />
                <Button className="w-full">Upload note</Button>
              </form>
              <p className="mt-3 text-xs leading-5 text-slate-500">Uploads go to the private Supabase bucket named rbi-files and are only readable by the owner account.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Saved notes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(notes as RbiNoteRow[] | null)?.map((note) => (
                <div key={note.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <Badge>{note.folder}</Badge>
                  <p className="mt-2 text-sm font-medium text-slate-800">{note.title}</p>
                  {note.file_path ? <p className="mt-1 truncate text-xs text-slate-500">{note.file_path}</p> : null}
                </div>
              ))}
              {!notes?.length ? <p className="text-center text-sm text-slate-500">No RBI notes uploaded yet.</p> : null}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Phase 2 answer practice</CardTitle></CardHeader>
            <CardContent>
              <form action={saveRbiAnswer} className="space-y-3">
                <Input name="question" required placeholder="Write the question or prompt" />
                <Textarea name="answer" required placeholder="Write your answer..." className="min-h-48" />
                <Textarea name="ai_feedback" placeholder="Paste AI feedback here after using /api/ai with action rbi_answer_feedback." />
                <Button>Save answer</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent answers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(answers as RbiAnswerRow[] | null)?.map((answer) => (
                <div key={answer.id} className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-medium">{answer.question}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{answer.answer}</p>
                </div>
              ))}
              {!answers?.length ? <p className="text-center text-sm text-slate-500">No saved answers yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

