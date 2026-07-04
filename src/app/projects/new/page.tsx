import { Globe2, Lock } from "lucide-react";
import { createProject } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="New project" description="Choose whether this project stays private or joins the public gallery." />
      <Card className="max-w-3xl overflow-hidden">
        <CardHeader className="bg-slate-950 text-white"><CardTitle className="text-white">Project details</CardTitle></CardHeader>
        <CardContent>
          <form action={createProject} className="space-y-5">
            <label>Title<Input name="title" required placeholder="Smart Attendance System" /></label>
            <label>Description<Textarea name="description" placeholder="What problem does this project solve?" /></label>
            <label>Tech stack<Input name="tech_stack" placeholder="Next.js, Supabase, Python" /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <label>GitHub link<Input name="github_link" type="url" placeholder="https://github.com/..." /></label>
              <label>Demo link<Input name="demo_link" type="url" placeholder="https://..." /></label>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Visibility</p>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex grid-cols-none cursor-pointer flex-row items-start gap-3 rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                  <input type="radio" name="visibility" value="private" defaultChecked className="mt-1" />
                  <span><span className="flex items-center gap-2 font-semibold text-slate-950"><Lock className="h-4 w-4" /> Private</span><span className="mt-1 block text-sm font-normal text-slate-500">Only you and collaborators can access it.</span></span>
                </label>
                <label className="flex grid-cols-none cursor-pointer flex-row items-start gap-3 rounded-lg border border-emerald-200 p-4 hover:bg-emerald-50">
                  <input type="radio" name="visibility" value="public" className="mt-1" />
                  <span><span className="flex items-center gap-2 font-semibold text-slate-950"><Globe2 className="h-4 w-4" /> Public</span><span className="mt-1 block text-sm font-normal text-slate-500">Every user can view and copy it. Changes need owner approval.</span></span>
                </label>
              </div>
            </div>
            <Button>Create project</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}