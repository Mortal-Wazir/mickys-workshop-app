import Link from "next/link";
import { BookOpen, CheckSquare, FolderKanban, Gauge, Lock, LogOut, Newspaper, User, Wrench } from "lucide-react";
import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/exam-prep", label: "Exam Prep", icon: BookOpen },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/tech-news", label: "Tech News", icon: Newspaper },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar({ profile }: { profile: Profile }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-slate-200/80 bg-white/90 px-4 py-5 shadow-xl shadow-slate-200/50 backdrop-blur lg:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 rounded-xl bg-slate-950 p-3 text-white">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-400 text-slate-950"><Wrench className="h-5 w-5" /></span>
        <span>
          <span className="block text-base font-bold">Micky&apos;s Workshop</span>
          <span className="block text-xs text-slate-300">Build. Prep. Publish.</span>
        </span>
      </Link>

      <nav className="space-y-1">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-950 hover:text-white">
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
        {profile.role === "owner" ? (
          <Link href="/private/rbi" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100">
            <Lock className="h-4 w-4" />
            RBI Workspace
          </Link>
        ) : null}
      </nav>

      <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
        <p className="font-semibold">Workshop mode</p>
        <p className="mt-1 text-xs leading-5">Public projects can be copied. Original owners approve final improvements.</p>
      </div>

      <div className="mt-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-sm font-medium text-slate-950">{profile.full_name || "Student"}</p>
        <p className="truncate text-xs text-slate-500">{profile.email}</p>
        <form action={signOut} className="mt-3">
          <Button variant="secondary" size="sm" className="w-full"><LogOut className="h-4 w-4" /> Sign out</Button>
        </form>
      </div>
    </aside>
  );
}