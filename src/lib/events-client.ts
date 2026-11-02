"use client";

/** Small fetch helpers for the events pages. Each returns an error message, or null on success. */
async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.ok) return null;
    const d = await res.json().catch(() => ({}));
    return (d.error as string) ?? "Something went wrong";
  } catch {
    return "You seem to be offline";
  }
}

export const eventAction = (id: string, body: Record<string, unknown>) => send(`/api/events/${id}`, "POST", body);
export const postJSON = (url: string, body: unknown) => send(url, "POST", body);
export const patchJSON = (url: string, body: unknown) => send(url, "PATCH", body);
export const del = (url: string) => send(url, "DELETE");
