import { createTaskFromTasksPage, deleteTask, updateTaskStatus } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, Clock3, Loader2, Plus, Trash2 } from "lucide-react";

type TaskListRow = {
  id: string;
  project_id: string;
  title: string;
  status: "todo" | "doing" | "done";
  assignee_email: string | null;
  projects?: { title: string | null } | null;
};

type ProjectOption = {
  id: string;
  title: string;
};

const columns = [
  { key: "todo", label: "Todo", icon: Clock3, tone: "border-slate-200 bg-slate-50 text-slate-700" },
  { key: "doing", label: "Doing", icon: Loader2, tone: "border-sky-200 bg-sky-50 text-sky-700" },
  { key: "done", label: "Done", icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
] as const;

export default async function TasksPage() {
  const supabase = await createClient();
  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supabase.from("tasks").select("*, projects(title)").order("created_at", { ascending: false }),
    supabase.from("projects").select("id, title").order("created_at", { ascending: false }),
  ]);
  const taskList = (tasks as TaskListRow[] | null) ?? [];
  const projectOptions = (projects as ProjectOption[] | null) ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 md:p-8">
        <Badge className="mb-4 bg-slate-950 text-white">Task command center</Badge>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-950 md:text-5xl">Move work from idea to done.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Create tasks, move their status, and delete finished or unwanted work from one board.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {columns.map((column) => <div key={column.key} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"><p className="text-2xl font-semibold">{taskList.filter((task) => task.status === column.key).length}</p><p className="text-xs text-slate-500">{column.label}</p></div>)}
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="p-5">
          <form action={createTaskFromTasksPage} className="grid gap-3 lg:grid-cols-[1fr_240px_220px_160px_auto]">
            <Input name="title" required placeholder="Add a task" />
            <select name="project_id" required className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
              <option value="">Select project</option>
              {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
            <Input name="assignee_email" type="email" placeholder="Assignee email" />
            <select name="status" defaultValue="todo" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
              {columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
            </select>
            <Button><Plus className="h-4 w-4" /> Add</Button>
          </form>
          {!projectOptions.length ? <p className="mt-3 text-sm text-amber-700">Create a project first, then you can add tasks here.</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => {
          const Icon = column.icon;
          const columnTasks = taskList.filter((task) => task.status === column.key);
          return (
            <section key={column.key} className={`min-h-96 rounded-2xl border p-4 ${column.tone}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold"><Icon className="h-5 w-5" /> {column.label}</h2>
                <Badge>{columnTasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <Card key={task.id} className="bg-white transition hover:-translate-y-0.5 hover:shadow-md">
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                        <p className="mt-2 text-xs text-slate-500">{task.projects?.title || "Project"}</p>
                        {task.assignee_email ? <p className="mt-1 text-xs text-slate-400">{task.assignee_email}</p> : null}
                      </div>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <form action={updateTaskStatus} className="flex gap-2">
                          <input type="hidden" name="project_id" value={task.project_id} />
                          <input type="hidden" name="task_id" value={task.id} />
                          <select name="status" defaultValue={task.status} className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs">
                            {columns.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                          </select>
                          <Button size="sm" variant="secondary">Move</Button>
                        </form>
                        <form action={deleteTask}>
                          <input type="hidden" name="project_id" value={task.project_id} />
                          <input type="hidden" name="task_id" value={task.id} />
                          <Button title="Delete task" size="icon" variant="outline"><Trash2 className="h-4 w-4" /></Button>
                        </form>
                      </div>
                      {task.status !== "done" ? (
                        <form action={updateTaskStatus}>
                          <input type="hidden" name="project_id" value={task.project_id} />
                          <input type="hidden" name="task_id" value={task.id} />
                          <input type="hidden" name="status" value="done" />
                          <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500"><CheckCircle2 className="h-4 w-4" /> Mark done</Button>
                        </form>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {!columnTasks.length ? <p className="rounded-xl border border-dashed border-current/20 bg-white/60 p-6 text-center text-sm">No tasks here.</p> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}