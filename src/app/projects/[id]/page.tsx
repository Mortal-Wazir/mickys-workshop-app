import { notFound } from "next/navigation";
import { addComment, addProjectTask, inviteCollaborator, requestProjectMerge, reviewProjectMerge, updateTaskStatus, uploadProjectFile } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Project, ProjectChangeRequest, ProjectTask, TaskStatus } from "@/lib/types";

type CommentRow = { id: string; body: string; profiles?: { full_name: string | null; email: string | null } | null };
type FileRow = { id: string; file_name: string; file_type: string };
type CollaboratorRow = { id: string; email: string };

const columns: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();
  const [{ data: project }, { data: tasks }, { data: comments }, { data: files }, { data: collaborators }] = await Promise.all([
    supabase.from("projects").select("*, profiles(full_name, email)").eq("id", id).single(),
    supabase.from("tasks").select("*").eq("project_id", id).order("created_at"),
    supabase.from("comments").select("*, profiles(full_name, email)").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("project_files").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("project_collaborators").select("*").eq("project_id", id),
  ]);

  if (!project) notFound();
  const currentProject = project as Project;
  const isOwner = currentProject.owner_id === user?.id;
  const isCopiedProject = Boolean(currentProject.source_project_id);

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
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
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
                <div className="mt-4 space-y-2">
                  {(outgoingRequests as ProjectChangeRequest[] | null)?.map((request) => <Badge key={request.id}>{request.status}</Badge>)}
                </div>
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
                      <form action={reviewProjectMerge}>
                        <input type="hidden" name="request_id" value={request.id} />
                        <input type="hidden" name="project_id" value={id} />
                        <input type="hidden" name="status" value="approved" />
                        <Button size="sm">Approve</Button>
                      </form>
                      <form action={reviewProjectMerge}>
                        <input type="hidden" name="request_id" value={request.id} />
                        <input type="hidden" name="project_id" value={id} />
                        <input type="hidden" name="status" value="rejected" />
                        <Button size="sm" variant="secondary">Reject</Button>
                      </form>
                      <Badge>{request.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>Task board</CardTitle></CardHeader>
            <CardContent>
              <form action={addProjectTask} className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <input type="hidden" name="project_id" value={id} />
                <Input name="title" required placeholder="Add a task" />
                <Input name="assignee_email" type="email" placeholder="Assignee email" />
                <Button>Add</Button>
              </form>
              <div className="grid gap-4 md:grid-cols-3">
                {columns.map((column) => (
                  <div key={column.key} className="min-h-60 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">{column.label}</h3>
                    <div className="space-y-2">
                      {(tasks as ProjectTask[] | null)?.filter((task) => task.status === column.key).map((task) => (
                        <Card key={task.id} className="shadow-none">
                          <CardContent className="space-y-3 p-3">
                            <p className="text-sm font-medium">{task.title}</p>
                            {task.assignee_email ? <p className="text-xs text-slate-500">{task.assignee_email}</p> : null}
                            <form action={updateTaskStatus} className="flex gap-2">
                              <input type="hidden" name="project_id" value={id} />
                              <input type="hidden" name="task_id" value={task.id} />
                              <select name="status" defaultValue={task.status} className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs">
                                {columns.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                              </select>
                              <Button size="sm" variant="secondary">Move</Button>
                            </form>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Comments</CardTitle></CardHeader>
            <CardContent>
              <form action={addComment} className="mb-4 space-y-3">
                <input type="hidden" name="project_id" value={id} />
                <Textarea name="body" required placeholder="Share an update or ask a collaborator..." />
                <Button>Post comment</Button>
              </form>
              <div className="space-y-3">
                {(comments as CommentRow[] | null)?.map((comment) => (
                  <div key={comment.id} className="rounded-md border border-slate-200 p-3">
                    <p className="text-sm text-slate-700">{comment.body}</p>
                    <p className="mt-2 text-xs text-slate-400">{comment.profiles?.full_name || comment.profiles?.email || "Student"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Project links</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><span className="font-medium">Stack:</span> {currentProject.tech_stack || "Not added"}</p><p><span className="font-medium">GitHub:</span> {currentProject.github_link || "Not added"}</p><p><span className="font-medium">Demo:</span> {currentProject.demo_link || "Not added"}</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Files</CardTitle></CardHeader><CardContent><form action={uploadProjectFile} className="space-y-3"><input type="hidden" name="project_id" value={id} /><select name="kind" className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"><option value="report">PDF/report</option><option value="screenshot">Screenshot</option></select><Input name="file" type="file" accept=".pdf,image/*" required /><Button variant="secondary" className="w-full">Upload</Button></form><div className="mt-4 space-y-2">{(files as FileRow[] | null)?.map((file) => <Badge key={file.id}>{file.file_type}: {file.file_name}</Badge>)}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Collaborators</CardTitle></CardHeader><CardContent><form action={inviteCollaborator} className="flex gap-2"><input type="hidden" name="project_id" value={id} /><Input name="email" type="email" placeholder="friend@example.com" required /><Button variant="secondary">Invite</Button></form><div className="mt-3 space-y-2">{(collaborators as CollaboratorRow[] | null)?.map((person) => <Badge key={person.id}>{person.email}</Badge>)}</div></CardContent></Card>
        </div>
      </div>
    </>
  );
}