"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiProvider } from "@/lib/ai/providers";
import { todayKey } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function authMessage(type: "error" | "message", message: string) {
  redirect(`/auth?${type}=${encodeURIComponent(message)}`);
}

async function ensureProfile(userId: string, email: string | null, fullName: string | null) {
  try {
    const admin = createAdminClient();
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();

    if (!existingProfile) {
      await admin.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName,
        role: "student",
      });
      return;
    }

    await admin.from("profiles").update({ email, full_name: fullName }).eq("id", userId);
  } catch {
    // The database trigger should normally create profiles. This fallback only runs
    // when the service role key is configured, and signup still succeeds without it.
  }
}


function cleanArticleHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 9000);
}

function titleFromHtml(html: string) {
  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1];
  return title?.replace(/\s+/g, " ").trim().slice(0, 180) || "Tech news update";
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeXml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

type FeedItem = {
  title: string;
  url: string;
  text: string;
  source: string;
};

function xmlValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function xmlLink(block: string) {
  const atomHref = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
  if (atomHref) return decodeXml(atomHref);
  return xmlValue(block, "link");
}

function parseFeed(xml: string, sourceUrl: string): FeedItem[] {
  const source = titleFromHtml(xml) === "Tech news update" ? new URL(sourceUrl).hostname : titleFromHtml(xml);
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  return blocks.slice(0, 12).map((block) => {
    const title = stripTags(xmlValue(block, "title"));
    const url = xmlLink(block);
    const summary = stripTags(xmlValue(block, "description") || xmlValue(block, "summary") || xmlValue(block, "content:encoded") || xmlValue(block, "content"));
    return { title, url, text: summary, source };
  }).filter((item) => item.title && item.url);
}

function isRelevantTechNews(item: FeedItem, keywords: string[]) {
  const haystack = `${item.title} ${item.text}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function sourceUrlsFrom(value: string | null) {
  const fallback = [
    "https://techcrunch.com/feed/",
    "https://www.theverge.com/rss/index.xml",
    "https://feeds.arstechnica.com/arstechnica/technology-lab",
  ];

  const urls = (value ? value.split(/\r?\n|,/g) : fallback)
    .map((item) => item.trim())
    .filter(Boolean);

  return urls.length ? urls.slice(0, 6) : fallback;
}

function techKeywordsFrom(value: string | null) {
  const fallback = [
    "ai", "artificial intelligence", "machine learning", "openai", "gemini", "llm", "developer", "software",
    "programming", "cybersecurity", "security", "cloud", "startup", "robotics", "semiconductor", "chip",
    "database", "github", "microsoft", "google", "apple", "nvidia", "android", "web", "api", "data",
  ];

  const custom = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  return custom.length ? custom : fallback;
}
async function checkAiLimit(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: settings } = await supabase.from("app_settings").select("ai_enabled").eq("id", 1).single();
  if (settings?.ai_enabled === false) throw new Error("AI is disabled by admin.");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const limit = profile?.role === "owner" ? 50 : 5;
  const usedOn = todayKey();
  const { data: usage } = await supabase
    .from("ai_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("used_on", usedOn)
    .maybeSingle();

  if ((usage?.actions_count ?? 0) >= limit) throw new Error(`Daily AI limit reached. Your limit is ${limit}.`);

  return async () => {
    await supabase.from("ai_usage").upsert({
      user_id: userId,
      used_on: usedOn,
      actions_count: (usage?.actions_count ?? 0) + 1,
    });
  };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  return { supabase, user };
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = text(formData, "email") ?? "";
  const password = text(formData, "password") ?? "";
  const fullName = text(formData, "full_name");
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });

  if (error) authMessage("error", error.message);
  if (data.user) await ensureProfile(data.user.id, data.user.email ?? email, fullName);

  if (!data.session) {
    authMessage("message", "Account created. Check your email to confirm, then log in.");
  }

  redirect("/dashboard");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: text(formData, "email") ?? "",
    password: text(formData, "password") ?? "",
  });

  if (error) authMessage("error", error.message);
  if (data.user) {
    await ensureProfile(
      data.user.id,
      data.user.email ?? null,
      typeof data.user.user_metadata.full_name === "string" ? data.user.user_metadata.full_name : null,
    );
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth");
}

export async function createProject(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title: text(formData, "title"),
      description: text(formData, "description"),
      tech_stack: text(formData, "tech_stack"),
      github_link: text(formData, "github_link"),
      demo_link: text(formData, "demo_link"),
      visibility: text(formData, "visibility") === "public" ? "public" : "private",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  redirect(`/projects/${data.id}`);
}

export async function copyPublicProject(formData: FormData) {
  const { supabase, user } = await requireUser();
  const projectId = text(formData, "project_id");
  if (!projectId) return;

  const { data: source, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("visibility", "public")
    .single();

  if (error || !source) throw new Error(error?.message || "Project is not available to copy.");
  const project = source as Project;

  const { data: copy, error: copyError } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title: `${project.title} - my copy`,
      description: project.description,
      tech_stack: project.tech_stack,
      github_link: project.github_link,
      demo_link: project.demo_link,
      visibility: "private",
      source_project_id: project.id,
    })
    .select("id")
    .single();

  if (copyError) throw new Error(copyError.message);
  redirect(`/projects/${copy.id}`);
}

export async function requestProjectMerge(formData: FormData) {
  const { supabase, user } = await requireUser();
  const copiedProjectId = text(formData, "copied_project_id");
  const originalProjectId = text(formData, "original_project_id");
  if (!copiedProjectId || !originalProjectId) return;

  const { error } = await supabase.from("project_change_requests").insert({
    original_project_id: originalProjectId,
    copied_project_id: copiedProjectId,
    requester_id: user.id,
    message: text(formData, "message"),
    status: "pending",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${copiedProjectId}`);
}

export async function reviewProjectMerge(formData: FormData) {
  const { supabase } = await requireUser();
  const requestId = text(formData, "request_id");
  const projectId = text(formData, "project_id");
  const status = text(formData, "status") === "approved" ? "approved" : "rejected";

  await supabase.from("project_change_requests").update({ status }).eq("id", requestId);
  revalidatePath(`/projects/${projectId}`);
}
export async function addProjectTask(formData: FormData) {
  const { supabase } = await requireUser();
  const projectId = text(formData, "project_id");
  await supabase.from("tasks").insert({
    project_id: projectId,
    title: text(formData, "title"),
    assignee_email: text(formData, "assignee_email"),
    status: "todo",
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateTaskStatus(formData: FormData) {
  const { supabase } = await requireUser();
  const projectId = text(formData, "project_id");
  await supabase.from("tasks").update({ status: text(formData, "status") }).eq("id", text(formData, "task_id"));
  revalidatePath(`/projects/${projectId}`);
}


export async function createTaskFromTasksPage(formData: FormData) {
  const { supabase } = await requireUser();
  const projectId = text(formData, "project_id");
  if (!projectId) return;

  await supabase.from("tasks").insert({
    project_id: projectId,
    title: text(formData, "title"),
    assignee_email: text(formData, "assignee_email"),
    status: text(formData, "status") || "todo",
  });

  revalidatePath("/tasks");
}

export async function deleteTask(formData: FormData) {
  const { supabase } = await requireUser();
  const taskId = text(formData, "task_id");
  const projectId = text(formData, "project_id");
  if (!taskId) return;

  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/tasks");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function addComment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const projectId = text(formData, "project_id");
  await supabase.from("comments").insert({
    project_id: projectId,
    user_id: user.id,
    body: text(formData, "body"),
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function inviteCollaborator(formData: FormData) {
  const { supabase } = await requireUser();
  const projectId = text(formData, "project_id");
  await supabase.from("project_collaborators").insert({
    project_id: projectId,
    email: text(formData, "email"),
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function uploadProjectFile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("file");
  const projectId = text(formData, "project_id");
  const kind = text(formData, "kind") ?? "report";
  if (!(file instanceof File) || !projectId) return;

  const path = `${user.id}/projects/${projectId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("project-files").upload(path, file);
  if (error) throw new Error(error.message);

  await supabase.from("project_files").insert({
    project_id: projectId,
    user_id: user.id,
    file_name: file.name,
    file_path: path,
    file_type: kind,
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectDetails(formData: FormData) {
  const { supabase, user } = await requireUser();
  const projectId = text(formData, "project_id");
  if (!projectId) return;

  const { error } = await supabase
    .from("projects")
    .update({
      title: text(formData, "title"),
      description: text(formData, "description"),
      tech_stack: text(formData, "tech_stack"),
      github_link: text(formData, "github_link"),
      demo_link: text(formData, "demo_link"),
      visibility: text(formData, "visibility") === "public" ? "public" : "private",
    })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function createProjectRoom(formData: FormData) {
  const { supabase, user } = await requireUser();
  const projectId = text(formData, "project_id");
  if (!projectId) return;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, owner_id, title, description, tech_stack, github_link, demo_link")
    .eq("id", projectId)
    .single();

  if (projectError || !project) throw new Error(projectError?.message || "Project not found.");
  if (project.owner_id !== user.id) throw new Error("Only the project owner can create collaboration rooms.");

  const inviteCode = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const { error } = await supabase.from("project_rooms").insert({
    project_id: projectId,
    owner_id: user.id,
    invite_code: inviteCode,
    draft_title: project.title,
    draft_description: project.description,
    draft_tech_stack: project.tech_stack,
    draft_github_link: project.github_link,
    draft_demo_link: project.demo_link,
    draft_notes: "",
    status: "active",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function joinProjectRoom(formData: FormData) {
  const { user } = await requireUser();
  const inviteCode = text(formData, "invite_code")?.toUpperCase();
  if (!inviteCode) return;

  const admin = createAdminClient();
  const { data: room, error } = await admin
    .from("project_rooms")
    .select("id, project_id")
    .eq("invite_code", inviteCode)
    .eq("status", "active")
    .single();

  if (error || !room) throw new Error("Room code is invalid or closed.");

  await admin.from("project_room_participants").upsert({
    room_id: room.id,
    user_id: user.id,
    email: user.email,
  }, { onConflict: "room_id,user_id" });

  if (user.email) {
    await admin.from("project_collaborators").upsert({
      project_id: room.project_id,
      user_id: user.id,
      email: user.email,
    }, { onConflict: "project_id,email" });
  }

  redirect(`/projects/${room.project_id}`);
}

export async function saveProjectRoomDraft(formData: FormData) {
  const { supabase } = await requireUser();
  const roomId = text(formData, "room_id");
  const projectId = text(formData, "project_id");
  if (!roomId || !projectId) return;

  const { error } = await supabase
    .from("project_rooms")
    .update({
      draft_title: text(formData, "draft_title"),
      draft_description: text(formData, "draft_description"),
      draft_tech_stack: text(formData, "draft_tech_stack"),
      draft_github_link: text(formData, "draft_github_link"),
      draft_demo_link: text(formData, "draft_demo_link"),
      draft_notes: text(formData, "draft_notes"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function applyProjectRoomDraft(formData: FormData) {
  const { supabase, user } = await requireUser();
  const roomId = text(formData, "room_id");
  const projectId = text(formData, "project_id");
  if (!roomId || !projectId) return;

  const { data: room, error } = await supabase
    .from("project_rooms")
    .select("*")
    .eq("id", roomId)
    .eq("owner_id", user.id)
    .single();

  if (error || !room) throw new Error(error?.message || "Only the room owner can apply draft changes.");

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      title: room.draft_title,
      description: room.draft_description,
      tech_stack: room.draft_tech_stack,
      github_link: room.draft_github_link,
      demo_link: room.draft_demo_link,
    })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (updateError) throw new Error(updateError.message);
  await supabase.from("project_rooms").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", roomId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function uploadRbiNote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner") throw new Error("Only owner can upload RBI notes.");

  const file = formData.get("file");
  const folder = text(formData, "folder") || "ESI";
  const title = text(formData, "title");
  if (!(file instanceof File)) return;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${user.id}/rbi/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("rbi-files").upload(path, file, { upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from("rbi_notes").insert({
    owner_id: user.id,
    folder,
    title: title || file.name,
    file_path: path,
    extracted_text: null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/private/rbi");
}
function codeLanguageFromPath(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".html")) return "html";
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript";
  if (lower.endsWith(".py")) return "python";
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".md")) return "markdown";
  return "text";
}

function starterCodeFor(filePath: string) {
  const language = codeLanguageFromPath(filePath);
  if (language === "html") return "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"utf-8\" />\n    <title>Micky's Workshop Preview</title>\n    <link rel=\"stylesheet\" href=\"styles.css\" />\n  </head>\n  <body>\n    <main id=\"app\">\n      <h1>Hello from Micky's Workshop</h1>\n      <p>Edit index.html, styles.css, and script.js to preview your idea.</p>\n    </main>\n    <script src=\"script.js\"></script>\n  </body>\n</html>\n";
  if (language === "css") return "body {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n  background: #f8fafc;\n  color: #0f172a;\n}\n\nmain {\n  max-width: 720px;\n  margin: 64px auto;\n  padding: 32px;\n  border-radius: 16px;\n  background: white;\n  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);\n}\n";
  if (language === "javascript") return "const app = document.querySelector('#app');\nconsole.log('Micky\\'s Workshop preview is running.');\n";
  if (language === "python") return "def main():\n    print('Hello from Micky\\'s Workshop')\n\nif __name__ == '__main__':\n    main()\n";
  if (language === "typescript") return "export function helloWorkshop(name: string) {\n  return `Hello, ${name}`;\n}\n";
  return "";
}

export async function createProjectCodeFile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const projectId = text(formData, "project_id");
  const roomId = text(formData, "room_id");
  const filePath = text(formData, "file_path")?.replace(/^\/+/, "");
  if (!projectId || !filePath) return;

  const language = codeLanguageFromPath(filePath);
  const { error } = await supabase.from("project_code_files").insert({
    project_id: projectId,
    room_id: roomId,
    created_by: user.id,
    file_path: filePath,
    language,
    content: starterCodeFor(filePath),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function saveProjectCodeFile(formData: FormData) {
  const { supabase } = await requireUser();
  const projectId = text(formData, "project_id");
  const fileId = text(formData, "file_id");
  const content = formData.get("content");
  if (!projectId || !fileId || typeof content !== "string") return;

  const { error } = await supabase
    .from("project_code_files")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", fileId);

  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectCodeFile(formData: FormData) {
  const { supabase } = await requireUser();
  const projectId = text(formData, "project_id");
  const fileId = text(formData, "file_id");
  if (!projectId || !fileId) return;

  const { error } = await supabase.from("project_code_files").delete().eq("id", fileId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function publishRoomCodeFiles(formData: FormData) {
  const { supabase, user } = await requireUser();
  const projectId = text(formData, "project_id");
  const roomId = text(formData, "room_id");
  if (!projectId || !roomId) return;

  const { data: project } = await supabase.from("projects").select("owner_id").eq("id", projectId).single();
  if (project?.owner_id !== user.id) throw new Error("Only the owner can publish room code permanently.");

  const { data: draftFiles, error } = await supabase
    .from("project_code_files")
    .select("file_path, language, content")
    .eq("project_id", projectId)
    .eq("room_id", roomId);

  if (error) throw new Error(error.message);

  for (const file of draftFiles ?? []) {
    const { data: existing } = await supabase
      .from("project_code_files")
      .select("id")
      .eq("project_id", projectId)
      .is("room_id", null)
      .eq("file_path", file.file_path)
      .maybeSingle();

    if (existing) {
      await supabase.from("project_code_files").update({
        language: file.language,
        content: file.content,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("project_code_files").insert({
        project_id: projectId,
        room_id: null,
        created_by: user.id,
        file_path: file.file_path,
        language: file.language,
        content: file.content,
      });
    }
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function seedRoomStarterFiles(formData: FormData) {
  const { supabase, user } = await requireUser();
  const projectId = text(formData, "project_id");
  const roomId = text(formData, "room_id");
  if (!projectId || !roomId) return;

  const starterFiles = ["index.html", "styles.css", "script.js"];
  for (const filePath of starterFiles) {
    const { data: existing } = await supabase
      .from("project_code_files")
      .select("id")
      .eq("project_id", projectId)
      .eq("room_id", roomId)
      .eq("file_path", filePath)
      .maybeSingle();
    if (existing) continue;

    await supabase.from("project_code_files").insert({
      project_id: projectId,
      room_id: roomId,
      created_by: user.id,
      file_path: filePath,
      language: codeLanguageFromPath(filePath),
      content: starterCodeFor(filePath),
    });
  }

  revalidatePath(`/projects/${projectId}`);
}
export async function createSubject(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("subjects").insert({
    user_id: user.id,
    name: text(formData, "name"),
    semester: text(formData, "semester"),
  });
  revalidatePath("/exam-prep");
}

export async function addFlashcard(formData: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("flashcards").insert({
    subject_id: text(formData, "subject_id"),
    question: text(formData, "question"),
    answer: text(formData, "answer"),
  });
  revalidatePath("/exam-prep");
}

export async function addWeakTopic(formData: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("weak_topics").insert({
    subject_id: text(formData, "subject_id"),
    topic: text(formData, "topic"),
    notes: text(formData, "notes"),
  });
  revalidatePath("/exam-prep");
}

export async function saveRbiAnswer(formData: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("rbi_answers").insert({
    owner_id: user.id,
    question: text(formData, "question"),
    answer: text(formData, "answer"),
    ai_feedback: text(formData, "ai_feedback"),
  });
  revalidatePath("/private/rbi");
}

function techNewsMessage(type: "error" | "message", message: string): never {
  redirect(`/tech-news?${type}=${encodeURIComponent(message)}`);
}

export async function fetchLatestTechNews(formData: FormData) {
  const { supabase, user } = await requireUser();
  const providerId = text(formData, "provider") || "gemini";
  const sourceUrls = sourceUrlsFrom(text(formData, "source_urls"));
  const keywords = techKeywordsFrom(text(formData, "keywords"));
  const provider = getAiProvider(providerId);
  if (!provider) techNewsMessage("error", "AI is not configured yet.");

  const markUsage = await checkAiLimit(supabase, user.id);
  const collected: FeedItem[] = [];

  for (const sourceUrl of sourceUrls) {
    try {
      const response = await fetch(sourceUrl, {
        headers: {
          "Accept": "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*",
          "User-Agent": "MickysWorkshopBot/1.0",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) continue;

      const xml = await response.text();
      collected.push(...parseFeed(xml, sourceUrl));
    } catch {
      // One source failing should not stop the whole bulletin refresh.
    }
  }

  const relevant = collected
    .filter((item) => isRelevantTechNews(item, keywords))
    .filter((item, index, items) => items.findIndex((other) => other.url === item.url) === index)
    .slice(0, 3);

  if (!relevant.length) {
    techNewsMessage("error", "No relevant tech news found from those sources. Try different feed URLs or broader keywords.");
  }

  let published = 0;
  for (const item of relevant) {
    const { data: existing } = await supabase.from("tech_news").select("id").eq("url", item.url).maybeSingle();
    if (existing) continue;

    const summary = await provider.generate({
      action: "tech_news_summary",
      input: `Source: ${item.source}\nURL: ${item.url}\nTitle: ${item.title}\nArticle/feed text:\n${item.text || item.title}`,
    });

    const { error } = await supabase.from("tech_news").insert({
      user_id: user.id,
      url: item.url,
      title: item.title,
      summary,
      provider: provider.name,
    });

    if (!error) published += 1;
  }

  if (published === 0) {
    techNewsMessage("message", "Feeds were checked, but the relevant stories were already published.");
  }

  await markUsage();
  revalidatePath("/tech-news");
  techNewsMessage("message", `Fetched and published ${published} relevant tech news ${published === 1 ? "story" : "stories"}.`);
}
export async function shareTechNews(formData: FormData) {
  const { supabase, user } = await requireUser();
  const url = text(formData, "url");
  const providerId = text(formData, "provider") || "gemini";
  const manualText = text(formData, "article_text");
  const manualTitle = text(formData, "title");

  if (!url) techNewsMessage("error", "Please paste an article URL.");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    techNewsMessage("error", "Please paste a valid article URL.");
  }

  const provider = getAiProvider(providerId);
  if (!provider) techNewsMessage("error", "AI is not configured yet.");

  let title = manualTitle || "Tech news update";
  let articleText = manualText || "";

  if (!articleText) {
    try {
      const response = await fetch(parsedUrl.toString(), {
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36 MickyWorkshopBot/1.0",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        techNewsMessage("error", "That website blocked automatic reading. Paste the article text in the box and try again.");
      }

      const html = await response.text();
      title = manualTitle || titleFromHtml(html);
      articleText = cleanArticleHtml(html);
    } catch {
      techNewsMessage("error", "Could not read that article link. Paste the article text in the box and try again.");
    }
  }

  if (articleText.length < 200) {
    techNewsMessage("error", "Please paste at least 200 characters of article text so AI has enough context.");
  }

  const markUsage = await checkAiLimit(supabase, user.id);
  const summary = await provider.generate({
    action: "tech_news_summary",
    input: `URL: ${parsedUrl.toString()}\nTitle: ${title}\nArticle text:\n${articleText.slice(0, 9000)}`,
  });
  await markUsage();

  const { error } = await supabase.from("tech_news").insert({
    user_id: user.id,
    url: parsedUrl.toString(),
    title,
    summary,
    provider: provider.name,
  });

  if (error) techNewsMessage("error", error.message);

  revalidatePath("/tech-news");
  techNewsMessage("message", "News summary published successfully.");
}








