import { notFound } from "next/navigation";
import { CheckCircle2, Clipboard, Code2, ExternalLink, FileText, GitBranch, Globe2, Lock, MessageSquare, Pencil, Plus, Users } from "lucide-react";
import {
  addComment,
  addProjectTask,
  applyProjectRoomDraft,
  createProjectRoom,
  inviteCollaborator,
  requestProjectMerge,
  reviewProjectMerge,
  saveProjectRoomDraft,
  updateProjectDetails,
  updateTaskStatus,
  uploadProjectFile,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Project, ProjectChangeRequest, ProjectRoom, ProjectTask, TaskStatus } from "@/lib/types";

type CommentRow = { id: string; body: string; profiles?: { full_name: string | null; email: string | null } | null };
type FileRow = { id: string; file_name: string; file_type: string };
type CollaboratorRow = { id: string; email: string };
type RoomRow = ProjectRoom & {
  participants?: { id: string; email: string | null; profiles?: { full_name: string | null; email: string | null } | null }[] | null;
};

const columns: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

function progress(tasks: ProjectTask[]) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((task) => task.status === "done").length / tasks.length) * 100);
}

function linkOrEmpty(value: string | null, label: string) {
  if (!value) return <span className="text-slate-400">{label} not added</span>;
  return <a href={value} target="_blank" className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800">{label}<ExternalLink className="h-3.5 w-3.5" /></a>;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();
  const [{ data: project }, { data: tasks }, { data: comments }, { data: files }, { data: collaborators }, { data: rooms }] = await Promise.all([
    supabase.from("projects").select("*, profiles(full_name, email)").eq("id", id).single(),
    supabase.from("tasks").select("*").eq("project_id", id).order("created_at"),
    supabase.from("comments").select("*, profiles(full_name, email)").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("project_files").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("project_collaborators").select("*").eq("project_id", id),
    supabase.from("project_rooms").select("*, participants:project_room_participants(id, email, profiles(full_name, email))").eq("project_id", id).order("created_at", { ascending: false }),
  ]);

  if (!project) notFound();
  const currentProject = project as Project;
  const taskItems = (tasks as ProjectTask[] | null) ?? [];
  const projectRooms = (rooms as RoomRow[] | null) ?? [];
  const activeRooms = projectRooms.filter((room) => room.status === "active");
  const isOwner = currentProject.owner_id === user?.id;
  const isCopiedProject = Boolean(currentProject.source_project_id);
  const completion = progress(taskItems);

  const [{ data: outgoingRequests }, { data: incomingRequests }] = await Promise.all([
    isCopiedProject
      ? supabase.from("project_change_requests").select("*").eq("copied_project_id", id).order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    isOwner
      ? supabase.from("project_change_requests").select("*, requester:profiles(full_name, email), copied_project:projects!project_change_requests_copied_project_id_fkey(title)").eq("original_project_id", id).order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <PageHeader title={currentProject.title} description={currentProject.description || "Project workspace"} />
      <div className="mb-5 flex flex-wrap gap-2">
        <Badge className={currentProject.visibility === "public" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}>{currentProject.visibility === "public" ? "Public project" : "Private project"}</Badge>
        {isCopiedProject ? <Badge>Copied from public gallery</Badge> : null}
        <Badge className="bg-sky-50 text-sky-700">{completion}% complete</Badge>
      </div>

      <section className="mb-5 grid gap-4 md:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-2xl font-semibold">{taskItems.filter((task) => task.status === "done").length}/{taskItems.length}</p><p className="text-xs text-slate-500">Tasks done</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3"><Users className="h-5 w-5 text-sky-600" /><div><p className="text-2xl font-semibold">{(collaborators as CollaboratorRow[] | null)?.length ?? 0}</p><p className="text-xs text-slate-500">Collaborators</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3"><FileText className="h-5 w-5 text-amber-600" /><div><p className="text-2xl font-semibold">{(files as FileRow[] | null)?.length ?? 0}</p><p className="text-xs text-slate-500">Files</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3"><GitBranch className="h-5 w-5 text-violet-600" /><div><p className="text-2xl font-semibold">{activeRooms.length}</p><p className="text-xs text-slate-500">Live rooms</p></div></CardContent></Card>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          {isOwner ? (
            <Card className="border-emerald-100">
              <CardHeader><CardTitle className="flex items-center gap-2"><Pencil className="h-4 w-4 text-emerald-600" /> Owner project controls</CardTitle></CardHeader>
              <CardContent>
                <form action={updateProjectDetails} className="grid gap-3">
                  <input type="hidden" name="project_id" value={id} />
                  <Input name="title" defaultValue={currentProject.title} required placeholder="Project title" />
                  <Textarea name="description" defaultValue={currentProject.description || ""} placeholder="Problem, solution, features, target users" />
                  <Input name="tech_stack" defaultValue={currentProject.tech_stack || ""} placeholder="Next.js, Supabase, Python, ML" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input name="github_link" defaultValue={currentProject.github_link || ""} placeholder="GitHub link" />
                    <Input name="demo_link" defaultValue={currentProject.demo_link || ""} placeholder="Demo link" />
                  </div>
                  <select name="visibility" defaultValue={currentProject.visibility} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
                    <option value="private">Private</option>
                    <option value="public">Public gallery</option>
                  </select>
                  <Button>Save project details</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {isCopiedProject ? (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader><CardTitle className="text-emerald-950">Send improvements to original owner</CardTitle></CardHeader>
              <CardContent>
                <form action={requestProjectMerge} className="space-y-3">
                  <input type="hidden" name="copied_project_id" value={id} />
                  <input type="hidden" name="original_project_id" value={currentProject.source_project_id || ""} />
                  <Textarea name="message" placeholder="Explain what you improved and why the owner should review it." />
                  <Button>Request owner approval</Button>
                </form>
                <div className="mt-4 space-y-2">{(outgoingRequests as ProjectChangeRequest[] | null)?.map((request) => <Badge key={request.id}>{request.status}</Badge>)}</div>
              </CardContent>
            </Card>
          ) : null}

          {isOwner && incomingRequests?.length ? (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader><CardTitle className="text-blue-950">Change requests</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(incomingRequests as ProjectChangeRequest[]).map((request) => (
                  <div key={request.id} className="rounded-lg border border-blue-100 bg-white p-3">
                    <p className="text-sm font-medium">{request.requester?.full_name || request.requester?.email || "Student"} wants you to review a copied project.</p>
                    <p className="mt-1 text-sm text-slate-600">{request.message || "No message added."}</p>
                    <div className="mt-3 flex gap-2">
                      <form action={reviewProjectMerge}><input type="hidden" name="request_id" value={request.id} /><input type="hidden" name="project_id" value={id} /><input type="hidden" name="status" value="approved" /><Button size="sm">Approve</Button></form>
                      <form action={reviewProjectMerge}><input type="hidden" name="request_id" value={request.id} /><input type="hidden" name="project_id" value={id} /><input type="hidden" name="status" value="rejected" /><Button size="sm" variant="secondary">Reject</Button></form>
                      <Badge>{request.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-violet-100">
            <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-violet-600" /> Live collaboration rooms</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {isOwner ? (
                <form action={createProjectRoom}>
                  <input type="hidden" name="project_id" value={id} />
                  <Button><Plus className="h-4 w-4" /> Create room code</Button>
                </form>
              ) : null}
              {activeRooms.map((room) => (
                <div key={room.id} className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-violet-950">Room code</p>
                      <p className="font-mono text-lg font-semibold tracking-widest text-violet-700">{room.invite_code}</p>
                    </div>
                    <Badge className="bg-violet-100 text-violet-800">Temporary draft</Badge>
                  </div>
                  <form action={saveProjectRoomDraft} className="grid gap-3">
                    <input type="hidden" name="room_id" value={room.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <Input name="draft_title" defaultValue={room.draft_title || ""} placeholder="Draft title" />
                    <Textarea name="draft_description" defaultValue={room.draft_description || ""} placeholder="Draft description" />
                    <Input name="draft_tech_stack" defaultValue={room.draft_tech_stack || ""} placeholder="Draft tech stack" />
                    <div className="grid gap-3 md:grid-cols-2"><Input name="draft_github_link" defaultValue={room.draft_github_link || ""} placeholder="Draft GitHub link" /><Input name="draft_demo_link" defaultValue={room.draft_demo_link || ""} placeholder="Draft demo link" /></div>
                    <Textarea name="draft_notes" defaultValue={room.draft_notes || ""} placeholder="Shared live notes, decisions, and preview changes" />
                    <div className="flex flex-wrap gap-2"><Button variant="secondary">Save temporary draft</Button></div>
                  </form>
                  {isOwner ? <form action={applyProjectRoomDraft} className="mt-3"><input type="hidden" name="room_id" value={room.id} /><input type="hidden" name="project_id" value={id} /><Button>Apply draft permanently</Button></form> : null}
                  <div className="mt-3 flex flex-wrap gap-2">{room.participants?.map((person) => <Badge key={person.id}>{person.profiles?.full_name || person.email || "Collaborator"}</Badge>)}</div>
                </div>
              ))}
              {!activeRooms.length ? <p className="rounded-lg border border-dashed border-violet-200 p-4 text-center text-sm text-slate-500">No active room yet. Owner can create a room and share the code.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Task board</CardTitle></CardHeader>
            <CardContent>
              <form action={addProjectTask} className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_auto]"><input type="hidden" name="project_id" value={id} /><Input name="title" required placeholder="Add a task" /><Input name="assignee_email" type="email" placeholder="Assignee email" /><Button>Add</Button></form>
              <div className="grid gap-4 md:grid-cols-3">
                {columns.map((column) => (
                  <div key={column.key} className="min-h-60 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">{column.label}</h3>
                    <div className="space-y-2">
                      {taskItems.filter((task) => task.status === column.key).map((task) => (
                        <Card key={task.id} className="shadow-none"><CardContent className="space-y-3 p-3"><p className="text-sm font-medium">{task.title}</p>{task.assignee_email ? <p className="text-xs text-slate-500">{task.assignee_email}</p> : null}<form action={updateTaskStatus} className="flex gap-2"><input type="hidden" name="project_id" value={id} /><input type="hidden" name="task_id" value={task.id} /><select name="status" defaultValue={task.status} className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs">{columns.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><Button size="sm" variant="secondary">Move</Button></form></CardContent></Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Comments</CardTitle></CardHeader>
            <CardContent>
              <form action={addComment} className="mb-4 space-y-3"><input type="hidden" name="project_id" value={id} /><Textarea name="body" required placeholder="Share an update or ask a collaborator..." /><Button>Post comment</Button></form>
              <div className="space-y-3">{(comments as CommentRow[] | null)?.map((comment) => <div key={comment.id} className="rounded-md border border-slate-200 p-3"><p className="text-sm text-slate-700">{comment.body}</p><p className="mt-2 text-xs text-slate-400">{comment.profiles?.full_name || comment.profiles?.email || "Student"}</p></div>)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Code2 className="h-4 w-4" /> Project links</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><span className="font-medium">Stack:</span> {currentProject.tech_stack || "Not added"}</p><p>{linkOrEmpty(currentProject.github_link, "GitHub")}</p><p>{linkOrEmpty(currentProject.demo_link, "Demo")}</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Files</CardTitle></CardHeader><CardContent><form action={uploadProjectFile} className="space-y-3"><input type="hidden" name="project_id" value={id} /><select name="kind" className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"><option value="report">PDF/report</option><option value="screenshot">Screenshot</option></select><Input name="file" type="file" accept=".pdf,image/*" required /><Button variant="secondary" className="w-full">Upload</Button></form><div className="mt-4 space-y-2">{(files as FileRow[] | null)?.map((file) => <Badge key={file.id}>{file.file_type}: {file.file_name}</Badge>)}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Collaborators</CardTitle></CardHeader><CardContent><form action={inviteCollaborator} className="flex gap-2"><input type="hidden" name="project_id" value={id} /><Input name="email" type="email" placeholder="friend@example.com" required /><Button variant="secondary">Invite</Button></form><div className="mt-3 space-y-2">{(collaborators as CollaboratorRow[] | null)?.map((person) => <Badge key={person.id}>{person.email}</Badge>)}</div></CardContent></Card>
          <Card className="border-slate-900 bg-slate-950 text-white"><CardHeader className="border-white/10"><CardTitle className="flex items-center gap-2 text-white"><Clipboard className="h-4 w-4" /> Workflow rule</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-300"><p>Room drafts are temporary. Collaborators can experiment there.</p><p className="flex items-center gap-2 text-emerald-200"><Lock className="h-4 w-4" /> Only the owner can apply permanent project changes.</p><p className="flex items-center gap-2 text-sky-200"><Globe2 className="h-4 w-4" /> Public projects can still be copied and improved separately.</p></CardContent></Card>
        </div>
      </div>
    </>
  );
}
