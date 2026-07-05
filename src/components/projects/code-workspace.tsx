"use client";

import { useMemo, useState } from "react";
import { Code2, Eye, FileCode2, Plus, Save, Trash2 } from "lucide-react";
import { createProjectCodeFile, deleteProjectCodeFile, saveProjectCodeFile, seedRoomStarterFiles } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CodeFile = {
  id: string;
  project_id: string;
  room_id: string | null;
  file_path: string;
  language: string;
  content: string;
  updated_at: string;
};

type CodeWorkspaceProps = {
  projectId: string;
  roomId: string | null;
  files: CodeFile[];
  title: string;
  mode: "permanent" | "room";
  canPublish?: boolean;
  publishAction?: (formData: FormData) => void;
};

function languageTone(language: string) {
  if (language === "html") return "bg-orange-50 text-orange-700";
  if (language === "css") return "bg-sky-50 text-sky-700";
  if (language === "javascript") return "bg-yellow-50 text-yellow-700";
  if (language === "python") return "bg-emerald-50 text-emerald-700";
  if (language === "typescript") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

function buildPreview(files: CodeFile[], activeId: string | null, activeContent: string) {
  const getContent = (name: string) => {
    const file = files.find((item) => item.file_path.toLowerCase() === name);
    if (!file) return "";
    return file.id === activeId ? activeContent : file.content;
  };

  const html = getContent("index.html") || "<main><h1>No index.html yet</h1><p>Create index.html, styles.css, and script.js for live preview.</p></main>";
  const css = getContent("styles.css");
  const js = getContent("script.js");

  return `${html}\n<style>${css}</style>\n<script>${js}<\/script>`;
}

export function CodeWorkspace({ projectId, roomId, files, title, mode, canPublish, publishAction }: CodeWorkspaceProps) {
  const [activeId, setActiveId] = useState(files[0]?.id ?? null);
  const activeFile = files.find((file) => file.id === activeId) ?? files[0] ?? null;
  const [draftContent, setDraftContent] = useState(activeFile?.content ?? "");

  function openFile(file: CodeFile) {
    setActiveId(file.id);
    setDraftContent(file.content);
  }

  const preview = useMemo(() => buildPreview(files, activeFile?.id ?? null, draftContent), [files, activeFile?.id, draftContent]);
  const supportsPreview = files.some((file) => ["index.html", "styles.css", "script.js"].includes(file.file_path.toLowerCase()));

  return (
    <Card className="overflow-hidden border-slate-900 bg-slate-950 text-white shadow-xl shadow-slate-300/40">
      <CardHeader className="border-white/10 bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-white"><Code2 className="h-5 w-5 text-emerald-300" /> {title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge className={mode === "room" ? "bg-violet-400/15 text-violet-100" : "bg-emerald-400/15 text-emerald-100"}>{mode === "room" ? "Room draft" : "Permanent files"}</Badge>
            {canPublish && publishAction ? (
              <form action={publishAction}>
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="room_id" value={roomId ?? ""} />
                <Button size="sm" className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">Publish code permanently</Button>
              </form>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid min-h-[620px] lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-white/10 bg-slate-900/80 p-4 lg:border-b-0 lg:border-r">
            <form action={createProjectCodeFile} className="space-y-2">
              <input type="hidden" name="project_id" value={projectId} />
              {roomId ? <input type="hidden" name="room_id" value={roomId} /> : null}
              <Input name="file_path" placeholder="src/App.tsx or index.html" className="border-white/10 bg-slate-950 text-white placeholder:text-slate-500" />
              <Button size="sm" className="w-full bg-white text-slate-950 hover:bg-slate-200"><Plus className="h-4 w-4" /> New file</Button>
            </form>

            {roomId ? (
              <form action={seedRoomStarterFiles} className="mt-2">
                <input type="hidden" name="project_id" value={projectId} />
                <input type="hidden" name="room_id" value={roomId} />
                <Button size="sm" variant="outline" className="w-full border-white/10 bg-slate-950 text-white hover:bg-slate-800">Add HTML starter</Button>
              </form>
            ) : null}

            <div className="mt-5 space-y-1">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => openFile(file)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition ${activeFile?.id === file.id ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                >
                  <span className="flex min-w-0 items-center gap-2"><FileCode2 className="h-4 w-4 shrink-0" /><span className="truncate">{file.file_path}</span></span>
                </button>
              ))}
              {!files.length ? <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-slate-400">No files yet. Create one or add the HTML starter.</p> : null}
            </div>
          </aside>

          <section className="grid min-h-[620px] xl:grid-cols-[1fr_42%]">
            <div className="flex min-h-[620px] flex-col bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{activeFile?.file_path || "No file selected"}</p>
                  {activeFile ? <Badge className={languageTone(activeFile.language)}>{activeFile.language}</Badge> : null}
                </div>
                {activeFile ? (
                  <div className="flex gap-2">
                    <form action={saveProjectCodeFile}>
                      <input type="hidden" name="project_id" value={projectId} />
                      <input type="hidden" name="file_id" value={activeFile.id} />
                      <input type="hidden" name="content" value={draftContent} />
                      <Button size="sm" className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"><Save className="h-4 w-4" /> Save</Button>
                    </form>
                    <form action={deleteProjectCodeFile}>
                      <input type="hidden" name="project_id" value={projectId} />
                      <input type="hidden" name="file_id" value={activeFile.id} />
                      <Button size="sm" variant="outline" className="border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"><Trash2 className="h-4 w-4" /></Button>
                    </form>
                  </div>
                ) : null}
              </div>
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                spellCheck={false}
                className="min-h-[540px] flex-1 resize-none bg-[#07111f] p-4 font-mono text-sm leading-6 text-slate-100 outline-none selection:bg-emerald-400/30"
                placeholder="Create or select a file to start coding."
              />
            </div>

            <div className="border-t border-white/10 bg-white xl:border-l xl:border-t-0">
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-slate-900"><Eye className="h-4 w-4" /><span className="text-sm font-semibold">Preview</span></div>
              {supportsPreview ? (
                <iframe title="Project preview" srcDoc={preview} className="h-[570px] w-full bg-white" sandbox="allow-scripts allow-forms allow-modals" />
              ) : (
                <div className="flex h-[570px] items-center justify-center p-8 text-center text-sm text-slate-500">
                  HTML/CSS/JS preview appears when you add index.html, styles.css, or script.js. Python and TypeScript are editable here, but not executed in the browser.
                </div>
              )}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
