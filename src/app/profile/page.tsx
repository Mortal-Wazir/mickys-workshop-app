import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/supabase/server";
import { Brain, Crown, KeyRound, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";

export default async function ProfilePage() {
  const profile = await getProfile();
  const aiLimit = profile?.role === "owner" ? 50 : 5;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-xl shadow-slate-200/70">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_300px] md:p-8">
          <div>
            <Badge className="mb-4 bg-emerald-300/15 text-emerald-200"><UserRound className="mr-1 h-3 w-3" /> Account profile</Badge>
            <h1 className="text-3xl font-semibold md:text-5xl">{profile?.full_name || "Student workspace"}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Your role controls project ownership, collaboration permissions, private owner tools, and daily AI usage.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-400 text-2xl font-bold text-slate-950">{(profile?.full_name || profile?.email || "S").slice(0, 1).toUpperCase()}</div>
            <p className="mt-4 truncate font-semibold">{profile?.email}</p>
            <Badge className="mt-3 bg-white/10 text-white">{profile?.role}</Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Account details</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="flex items-center gap-2 font-medium text-slate-950"><UserRound className="h-4 w-4 text-emerald-600" /> Name</p><p className="mt-2 text-slate-600">{profile?.full_name || "Not set"}</p></div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="flex items-center gap-2 font-medium text-slate-950"><Mail className="h-4 w-4 text-sky-600" /> Email</p><p className="mt-2 break-all text-slate-600">{profile?.email}</p></div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="flex items-center gap-2 font-medium text-slate-950"><ShieldCheck className="h-4 w-4 text-amber-600" /> Role</p><p className="mt-2"><Badge>{profile?.role}</Badge></p></div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="flex items-center gap-2 font-medium text-slate-950"><Brain className="h-4 w-4 text-violet-600" /> AI limit</p><p className="mt-2 text-slate-600">{aiLimit} actions per day</p></div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className={profile?.role === "owner" ? "border-amber-200 bg-amber-50" : "border-slate-200"}>
            <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-600" /> Owner access</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600">
              {profile?.role === "owner" ? "You can access private owner tools and higher AI limits." : "Your account can create projects, collaborate, publish public work, and use student AI limits."}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-slate-700" /> Security</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p className="rounded-lg bg-slate-50 p-3">Private owner data is protected by server routes and Supabase RLS.</p>
              <p className="rounded-lg bg-slate-50 p-3">Private projects are visible only to owners and collaborators.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-emerald-600" /> Next setup</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600">Keep your Supabase keys in `.env.local`. Never paste service keys into browser code.</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}