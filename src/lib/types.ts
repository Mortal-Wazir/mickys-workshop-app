export type UserRole = "owner" | "student" | "collaborator";
export type TaskStatus = "todo" | "doing" | "done";
export type ProjectVisibility = "private" | "public";
export type ChangeRequestStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
};

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  tech_stack: string | null;
  github_link: string | null;
  demo_link: string | null;
  visibility: ProjectVisibility;
  source_project_id: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

export type ProjectTask = {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  assignee_email: string | null;
  due_date: string | null;
};

export type ProjectChangeRequest = {
  id: string;
  original_project_id: string;
  copied_project_id: string;
  requester_id: string;
  message: string | null;
  status: ChangeRequestStatus;
  created_at: string;
  requester?: { full_name: string | null; email: string | null } | null;
  copied_project?: { title: string | null } | null;
};

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  semester: string | null;
};
export type ProjectRoom = {
  id: string;
  project_id: string;
  owner_id: string;
  invite_code: string;
  draft_title: string | null;
  draft_description: string | null;
  draft_tech_stack: string | null;
  draft_github_link: string | null;
  draft_demo_link: string | null;
  draft_notes: string | null;
  status: "active" | "closed";
  created_at: string;
  updated_at: string;
};

export type ProjectRoomParticipant = {
  id: string;
  room_id: string;
  user_id: string | null;
  email: string | null;
  profiles?: { full_name: string | null; email: string | null } | null;
};

