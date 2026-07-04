import { Hammer, Sparkles } from "lucide-react";
import { signIn, signUp } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WorkshopScene } from "@/components/visuals/workshop-scene";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen bg-[#07111f] text-white lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative hidden overflow-hidden p-8 lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,197,94,.18),rgba(56,189,248,.12),rgba(251,191,36,.10))]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-emerald-100">
            <Sparkles className="h-4 w-4" /> Micky&apos;s Workshop
          </div>
          <WorkshopScene />
          <div>
            <h1 className="text-4xl font-semibold leading-tight">Build projects. Prepare exams. Share what works.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Your account unlocks private workspaces, public project discovery, task boards, and revision tools.</p>
          </div>
        </div>
      </section>

      <section className="grid place-items-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-400 text-slate-950"><Hammer className="h-5 w-5" /></span>
            <div><p className="font-semibold">Micky&apos;s Workshop</p><p className="text-sm text-slate-300">Student build studio</p></div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {params.error ? <div className="rounded-md border border-red-300/40 bg-red-500/10 p-4 text-sm text-red-100 md:col-span-2">{params.error}</div> : null}
            {params.message ? <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-4 text-sm text-emerald-100 md:col-span-2">{params.message}</div> : null}
            <Card className="border-white/10 bg-white text-slate-950">
              <CardHeader><CardTitle>Create account</CardTitle></CardHeader>
              <CardContent>
                <form action={signUp} className="space-y-4">
                  <label>Full name<Input name="full_name" placeholder="Micky Student" /></label>
                  <label>Email<Input name="email" type="email" required placeholder="you@example.com" /></label>
                  <label>Password<Input name="password" type="password" required minLength={6} /></label>
                  <Button className="w-full">Sign up</Button>
                </form>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white text-slate-950">
              <CardHeader><CardTitle>Log in</CardTitle></CardHeader>
              <CardContent>
                <form action={signIn} className="space-y-4">
                  <label>Email<Input name="email" type="email" required placeholder="you@example.com" /></label>
                  <label>Password<Input name="password" type="password" required /></label>
                  <Button className="w-full">Log in</Button>
                </form>
                <p className="mt-4 text-sm text-slate-500">Owner role can be assigned in Supabase after signup.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}