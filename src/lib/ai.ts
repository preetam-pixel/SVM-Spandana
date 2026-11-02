import type { AiSource, AiTask } from "./types";

export async function askAI<T>(task: AiTask, payload: Record<string, unknown>): Promise<{ data: T; source: AiSource }> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, payload }),
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  return res.json();
}
