# Micky's Workshop

Micky's Workshop is a full-stack Next.js App Router project for B.Tech project collaboration, exam preparation, and an owner-only RBI Grade B workspace.

## Completed

- Next.js App Router, TypeScript, Tailwind CSS, and shadcn-style local UI components.
- Supabase auth pages for sign up, login, and logout.
- Protected dashboard shell with sidebar navigation.
- Role model: `owner`, `student`, and `collaborator`.
- Project creation, project listing, project details, collaborator invites, report/screenshot upload, comments, and Todo/Doing/Done task board.
- Exam prep basics: subjects, manual flashcards, weak topics, and revision checklist UI.
- `/private/rbi` route protected on the server and backed by owner-only RLS policies.
- AI provider abstraction with Ollama support and cloud-provider placeholder.
- AI usage API with daily limits: students/collaborators 5 actions, owner 50 actions.
- Supabase SQL schema with RLS policies for the requested tables.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment values:

```bash
cp .env.example .env.local
```

3. Fill `.env.local` with your Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-or-secret-key
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

Use the project root URL, for example `https://your-project.supabase.co`, not the REST endpoint ending in `/rest/v1`.
Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never rename it to `NEXT_PUBLIC_...`.

If `AI_PROVIDER` is blank, the API returns: `AI is not configured yet.`

## Supabase Setup

1. Create a new Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Storage, create private buckets:
   - `project-files`
   - `study-files`
   - `rbi-files`
4. Sign up once through the app.
5. Make your account the owner:

```sql
update public.profiles
set role = 'owner'
where email = 'your-email@example.com';
```

For local auth testing, open Supabase Dashboard -> Authentication -> URL Configuration and add:

```text
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
```

If email confirmation is enabled, signup creates the account in Supabase immediately but the user must confirm email before logging in. For beginner local testing, you can temporarily turn off email confirmations in Authentication -> Providers -> Email.

RBI data is protected in three places: the sidebar only shows it to owners, the server page redirects non-owners, and RLS only allows owners to access `rbi_notes` and `rbi_answers`.

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Connect Ollama

1. Install Ollama.
2. Pull a model:

```bash
ollama pull llama3.1
```

3. Start Ollama and keep `AI_PROVIDER=ollama` in `.env.local`.
4. Send a POST request to `/api/ai`:

```json
{
  "action": "viva_questions",
  "input": "Smart attendance system using Next.js and Supabase"
}
```

Supported actions include `explain_notes`, `viva_questions`, `readme`, `resume_bullets`, `exam_mcqs`, `summarize_pdf`, `explain_concept`, `rbi_note_question`, and `rbi_answer_feedback`.

## What To Build Next

- Add edit/delete screens for projects, subjects, tasks, and flashcards.
- Add signed download links and preview pages for uploaded PDFs/screenshots.
- Add PDF text extraction before AI summarization.
- Add an owner settings page to toggle `app_settings.ai_enabled`.
- Add cloud AI providers in `src/lib/ai/providers.ts`.
- Add tests once the main flows are stable.
