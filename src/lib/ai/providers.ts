export type AiAction =
  | "explain_notes"
  | "viva_questions"
  | "readme"
  | "resume_bullets"
  | "exam_mcqs"
  | "summarize_pdf"
  | "explain_concept"
  | "tech_news_summary"
  | "rbi_note_question"
  | "rbi_answer_feedback";

export type AiProviderId = "ollama" | "gemini";

export type AiRequest = {
  action: AiAction;
  input: string;
};

export type AiProvider = {
  name: AiProviderId;
  generate(request: AiRequest): Promise<string>;
};

function promptFor(request: AiRequest) {
  const prompts: Record<AiAction, string> = {
    explain_notes: "Explain these notes in simple B.Tech student language:",
    viva_questions: "Generate practical viva questions from this project description:",
    readme: "Generate a clean GitHub README from these project details:",
    resume_bullets: "Generate honest resume bullets from these project details:",
    exam_mcqs: "Generate exam MCQs with answers from these notes:",
    summarize_pdf: "Summarize this extracted PDF text:",
    explain_concept: "Explain this difficult concept step by step:",
    tech_news_summary: "Summarize this tech news for B.Tech students. Return ONLY this clean format, no markdown headings, no intro, no horizontal rules: Headline: one short headline. Key points: exactly 3 short bullet lines starting with -. Why it matters: one sentence. Project idea: one practical mini-project idea.",
    rbi_note_question: "Answer from the uploaded notes context:",
    rbi_answer_feedback: "Give structured feedback on answer quality, depth, examples, relevance, missing points, and an improved answer:",
  };

  return `${prompts[request.action]}\n\n${request.input}`;
}

export class OllamaProvider implements AiProvider {
  name: AiProviderId = "ollama";

  async generate(request: AiRequest) {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const model = process.env.OLLAMA_MODEL || "llama3.1";
    const apiKey = process.env.OLLAMA_API_KEY;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, prompt: promptFor(request), stream: false }),
    });

    if (!response.ok) throw new Error("Ollama is not configured or not running.");
    const data = await response.json();
    return data.response || "AI returned an empty response.";
  }
}

export class GeminiProvider implements AiProvider {
  name: AiProviderId = "gemini";

  async generate(request: AiRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    if (!apiKey) throw new Error("Gemini API key is not configured yet.");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptFor(request) }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 900 },
      }),
    });

    if (!response.ok) throw new Error("Gemini is not configured yet or the API key is invalid.");
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n").trim() || "AI returned an empty response.";
  }
}

export function getAiProvider(preferredProvider?: string | null): AiProvider | null {
  const provider = preferredProvider || process.env.AI_PROVIDER;
  if (provider === "ollama") return new OllamaProvider();
  if (provider === "gemini") return new GeminiProvider();
  return null;
}

