import Link from "next/link";
import { AlertCircle, CheckCircle2, ExternalLink, Lightbulb, Newspaper, Radio, Rss, Search, Sparkles, Zap } from "lucide-react";
import { fetchLatestTechNews, shareTechNews } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

type TechNewsRow = {
  id: string;
  url: string;
  title: string;
  summary: string;
  provider: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
};

const defaultSources = [
  "https://hnrss.org/frontpage",
  "https://techcrunch.com/feed/",
  "https://www.theverge.com/rss/index.xml",
  "https://feeds.arstechnica.com/arstechnica/technology-lab",
  "https://www.wired.com/feed/rss",
  "https://www.engadget.com/rss.xml",
].join("\n");

const defaultKeywords = "AI, artificial intelligence, machine learning, LLM, software, programming, cybersecurity, cloud, startup, robotics, semiconductor, chip, database, GitHub, API, web development";
function decodeText(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .trim();
}

function cleanAiLine(line: string) {
  return decodeText(line)
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^[-–—]+$/, "")
    .trim();
}

function parseNewsSummary(summary: string) {
  const lines = summary
    .split(/\r?\n/)
    .map(cleanAiLine)
    .filter(Boolean)
    .filter((line) => !/^here'?s a summary/i.test(line));

  let headline = "Quick brief";
  const points: string[] = [];
  let why = "";
  let idea = "";

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("headline:")) {
      headline = line.replace(/^headline:\s*/i, "");
    } else if (lower.startsWith("why it matters:")) {
      why = line.replace(/^why it matters:\s*/i, "");
    } else if (lower.startsWith("project idea:")) {
      idea = line.replace(/^project idea:\s*/i, "");
    } else if (!lower.startsWith("key points:") && points.length < 4) {
      points.push(line);
    }
  }

  if (headline === "Quick brief" && points.length) {
    headline = points.shift() || headline;
  }

  return { headline, points: points.slice(0, 4), why, idea };
}

function NewsSummary({ summary }: { summary: string }) {
  const parsed = parseNewsSummary(summary);

  return (
    <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4">
      <p className="text-sm font-semibold leading-6 text-slate-950">{parsed.headline}</p>
      {parsed.points.length ? (
        <div className="mt-3 grid gap-2">
          {parsed.points.map((point) => (
            <div key={point} className="flex gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm leading-5 text-slate-700">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      ) : null}
      {parsed.why || parsed.idea ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {parsed.why ? (
            <div className="rounded-lg bg-sky-50 p-3 text-sm leading-5 text-sky-950">
              <span className="block text-xs font-semibold uppercase tracking-wide text-sky-700">Why it matters</span>
              {parsed.why}
            </div>
          ) : null}
          {parsed.idea ? (
            <div className="rounded-lg bg-amber-50 p-3 text-sm leading-5 text-amber-950">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-700"><Lightbulb className="h-3.5 w-3.5" /> Project idea</span>
              {parsed.idea}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default async function TechNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: news, error: tableError } = await supabase
    .from("tech_news")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false });
  const newsItems = (news as TechNewsRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-sky-950 to-emerald-950 text-white shadow-xl shadow-slate-200/70">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_320px] md:p-8">
          <div>
            <Badge className="mb-4 bg-sky-300/15 text-sky-100"><Radio className="mr-1 h-3 w-3" /> Tech news bulletin</Badge>
            <h1 className="text-3xl font-semibold md:text-5xl">Auto-fetch useful tech news.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Add trusted RSS feeds, filter for student-relevant technology stories, and publish AI summaries for everyone in the workshop.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5">
            <p className="text-3xl font-semibold">{newsItems.length}</p>
            <p className="mt-1 text-sm text-slate-300">Published summaries</p>
          </div>
        </div>
      </section>

      {params.error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{params.error}</span>
          </CardContent>
        </Card>
      ) : null}

      {params.message ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-start gap-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{params.message}</span>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-950 text-white">
          <CardTitle className="flex items-center gap-2 text-white"><Rss className="h-5 w-5 text-emerald-300" /> Fetch latest from trusted sources</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={fetchLatestTechNews} className="grid gap-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_190px_auto]">
              <Input name="keywords" defaultValue={defaultKeywords} placeholder="AI, cybersecurity, cloud, startups" />
              <select name="provider" defaultValue="gemini" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
                <option value="gemini">Gemini cloud</option>
                <option value="ollama">Ollama local</option>
              </select>
              <Button><Search className="mr-2 h-4 w-4" /> Fetch & summarize</Button>
            </div>
            <textarea
              name="source_urls"
              defaultValue={defaultSources}
              rows={5}
              className="min-h-28 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Paste RSS feed URLs, one per line. Example: https://example.com/feed.xml"
            />
          </form>
          <p className="mt-3 text-xs text-slate-500">
            These defaults use RSS feeds because they are much more reliable than scraping article pages. You can edit the source list anytime before fetching.
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200/80">
        <CardHeader className="bg-slate-50">
          <CardTitle className="flex items-center gap-2 text-slate-900"><Sparkles className="h-5 w-5 text-sky-600" /> Share one article manually</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={shareTechNews} className="grid gap-3">
            <div className="grid gap-3 lg:grid-cols-[1fr_190px_auto]">
              <Input name="url" type="url" required placeholder="https://example.com/latest-ai-chip-news" />
              <select name="provider" defaultValue="gemini" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
                <option value="gemini">Gemini cloud</option>
                <option value="ollama">Ollama local</option>
              </select>
              <Button variant="outline">Summarize link</Button>
            </div>
            <Input name="title" placeholder="Optional title, useful when pasting article text" />
            <textarea
              name="article_text"
              rows={5}
              placeholder="Optional: paste article text here if the website blocks automatic reading."
              className="min-h-28 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </form>
        </CardContent>
      </Card>

      {tableError ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="text-sm text-amber-900">Tech news table is not ready yet. Run the latest schema SQL in Supabase.</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {newsItems.map((item) => (
          <Card key={item.id} className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200">
            <div className="h-2 bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-300" />
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="line-clamp-2">{decodeText(item.title)}</CardTitle>
                <Badge>{item.provider}</Badge>
              </div>
              <p className="text-xs text-slate-500">shared by {item.profiles?.full_name || item.profiles?.email || "Student"}</p>
            </CardHeader>
            <CardContent>
              <NewsSummary summary={item.summary} />
              <Link href={item.url} target="_blank" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-emerald-700">
                Read original <ExternalLink className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
      {!newsItems.length && !tableError ? <Card><CardContent className="text-center text-sm text-slate-500"><Newspaper className="mx-auto mb-2 h-8 w-8" /> No news yet. Fetch from sources to build the bulletin.</CardContent></Card> : null}
    </div>
  );
}


