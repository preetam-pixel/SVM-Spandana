import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { offline } from "@/lib/fallback";
import type { AiSource, AiTask } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `You are Spandana, the AI layer of SVM (Sangeeta Vrinda Madhyam), the cultural club of KLE Institute of Technology, Hubballi, Karnataka.
You help engineering students discover hidden creative talent and join music, dance, photography, film, art, writing, anchoring and theatre.
Tone: warm, encouraging, concise, never judgemental; beginners and shy students are your priority. Light Kannada–English mix is welcome.
Always reply with ONLY a single JSON object in exactly the shape requested. No markdown, no code fences.`;

const SHAPES: Record<AiTask, string> = {
  verse: `Score this student's completion of a poetry prompt. Shape: {"score":0-100,"imagery":0-100,"originality":0-100,"feeling":0-100,"feedback":"one kind, specific sentence of craft feedback"}`,
  path: `Create a 4-week beginner learning path. Shape: {"title":string,"weeks":[{"week":1,"focus":string,"tasks":[string,string]}],"mentorTip":string}. Make tasks small (under 30 min), concrete, and reference SVM activities where natural.`,
  guru: `Reply as a friendly peer mentor in 2-4 short sentences. Suggest concrete next steps inside Spandana (Pulse feed, micro-gigs, Mask Mode anonymous posting, Squads, Exam Mode). Shape: {"reply":string}`,
  squad: `Name this creative squad and write a 2-sentence pitch on why the mix works. Shape: {"name":"short catchy name","pitch":string}`,
  plan: `Plan this SVM event. Include roles that let first-timers contribute backstage. Shape: {"tagline":string,"roles":[{"role":string,"count":number,"note":string}],"timeline":[{"when":"T-14 days","task":string}],"promo":"Instagram caption with emoji, under 40 words","promoKn":"one short Kannada line of invitation"}`,
  kind: `Check if this peer comment on a beginner's creative work is kind and constructive. Shape: {"ok":boolean,"suggestion":"if not ok, a kinder rewrite; else empty string"}`,
  insight: `Given these club engagement metrics, write 4 sharp, actionable insights for the club coordinators (each under 30 words). Shape: {"insights":[string,string,string,string]}`,
};

function parseJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Circuit breaker: after a bad key or repeated failures, skip the provider for a while so the demo never stalls.
const breaker = { failures: 0, until: 0 };
function trip(hard: boolean) {
  breaker.failures += 1;
  if (hard || breaker.failures >= 2) breaker.until = Date.now() + (hard ? 30 * 60_000 : 5 * 60_000);
}

async function askClaude(prompt: string): Promise<Record<string, unknown> | null> {
  const client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") return null;
  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return parseJson(text);
}

class GeminiError extends Error {
  constructor(public status: number, detail: string) {
    super(`Gemini ${status}: ${detail}`);
  }
}

// Tried in order; the next one is used only when a model is retired, rate-limited or overloaded.
const GEMINI_MODELS = [process.env.GEMINI_MODEL, "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-flash-latest"].filter(Boolean) as string[];

async function askGemini(prompt: string): Promise<Record<string, unknown> | null> {
  // Newer "AQ." keys hang when sent as a header, so the key goes in the query string.
  const key = encodeURIComponent(process.env.GEMINI_API_KEY!);
  let lastErr: GeminiError | null = null;
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const json = await res.json();
      const text: string = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      return parseJson(text);
    }
    lastErr = new GeminiError(res.status, `${model}: ${(await res.text().catch(() => "")).slice(0, 160)}`);
    if (![404, 429, 503].includes(res.status)) break;
  }
  throw lastErr;
}

export async function POST(req: Request) {
  const { task, payload } = (await req.json()) as { task: AiTask; payload: Record<string, unknown> };
  if (!SHAPES[task]) return NextResponse.json({ error: "unknown task" }, { status: 400 });

  const prompt = `${SHAPES[task]}\n\nInput:\n${JSON.stringify(payload, null, 2)}`;
  let data: Record<string, unknown> | null = null;
  let source: AiSource = "offline";

  if (Date.now() >= breaker.until) {
    try {
      if (process.env.ANTHROPIC_API_KEY) {
        data = await askClaude(prompt);
        if (data) source = "claude";
      } else if (process.env.GEMINI_API_KEY) {
        data = await askGemini(prompt);
        if (data) source = "gemini";
      }
      if (data) breaker.failures = 0;
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) {
        console.error("[ai] Invalid ANTHROPIC_API_KEY — using offline AI");
        trip(true);
      } else if (err instanceof Anthropic.RateLimitError) {
        console.error("[ai] Claude rate limited");
        trip(false);
      } else if (err instanceof Anthropic.APIError) {
        console.error(`[ai] Claude API error ${err.status}: ${err.message}`);
        trip(false);
      } else if (err instanceof GeminiError) {
        console.error(`[ai] ${err.message}`);
        trip(err.status === 400 || err.status === 401 || err.status === 403);
      } else {
        console.error("[ai]", err);
        trip(false);
      }
    }
  }

  if (!data) data = offline(task, payload);
  return NextResponse.json({ data, source });
}

export async function GET() {
  const source: AiSource = process.env.ANTHROPIC_API_KEY ? "claude" : process.env.GEMINI_API_KEY ? "gemini" : "offline";
  return NextResponse.json({ source });
}
