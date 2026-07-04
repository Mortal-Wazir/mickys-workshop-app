import { NextResponse } from "next/server";
import { getAiProvider, type AiAction } from "@/lib/ai/providers";
import { createClient, getProfile } from "@/lib/supabase/server";
import { todayKey } from "@/lib/utils";

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const supabase = await createClient();
  const { data: settings } = await supabase.from("app_settings").select("ai_enabled").eq("id", 1).single();
  if (settings?.ai_enabled === false) return NextResponse.json({ error: "AI is disabled by admin." }, { status: 403 });

  const body = (await request.json()) as { action: AiAction; input: string; provider?: string };
  const provider = getAiProvider(body.provider);
  if (!provider) return NextResponse.json({ error: "AI is not configured yet." }, { status: 503 });

  const limit = profile.role === "owner" ? 50 : 5;
  const usedOn = todayKey();

  const { data: usage } = await supabase
    .from("ai_usage")
    .select("*")
    .eq("user_id", profile.id)
    .eq("used_on", usedOn)
    .maybeSingle();

  if ((usage?.actions_count ?? 0) >= limit) {
    return NextResponse.json({ error: `Daily AI limit reached. Your limit is ${limit}.` }, { status: 429 });
  }

  try {
    const output = await provider.generate({ action: body.action, input: body.input });
    await supabase.from("ai_usage").upsert({
      user_id: profile.id,
      used_on: usedOn,
      actions_count: (usage?.actions_count ?? 0) + 1,
    });
    return NextResponse.json({ output, provider: provider.name, remaining: limit - (usage?.actions_count ?? 0) - 1 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI is not configured yet.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}