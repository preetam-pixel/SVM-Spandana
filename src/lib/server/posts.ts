import type { MaskPost } from "@/lib/types";

export interface PostRow {
  id: string; user_id: string | null; alias: string; kind: string; title: string; body: string | null; media: string | null;
  media_path: string | null; mime: string | null; notes: [string, number][] | null; seed: number | null;
  heart: number; fire: number; wow: number; clap: number; unmasked: string | null; created_at: string;
  // From migrations/005; absent until it has run.
  endorsed_by?: string | null; endorsed_at?: string | null; endorse_note?: string | null;
}

/** Shapes a post for the client. The creator's identity is only revealed once they unmask. */
export function serializePost(r: PostRow, viewer: string | null, comments: string[], names: Map<string, string> = new Map()): MaskPost {
  return {
    id: r.id, alias: r.alias, kind: r.kind as MaskPost["kind"], title: r.title, text: r.body ?? undefined,
    notes: r.notes ?? undefined, seed: r.seed ?? undefined, media: r.media ?? undefined, mime: r.mime ?? undefined,
    reactions: { heart: r.heart, fire: r.fire, wow: r.wow, clap: r.clap }, comments,
    hoursAgo: Math.max(0, Math.round((Date.now() - new Date(r.created_at).getTime()) / 3_600_000)),
    unmasked: r.unmasked ?? undefined, mine: !!viewer && r.user_id === viewer,
    // The creator's id is only exposed after they choose to unmask.
    creatorId: r.unmasked && r.user_id ? r.user_id : undefined,
    endorsement: r.endorsed_at
      ? { by: (r.endorsed_by && names.get(r.endorsed_by)) || "SVM Core", note: r.endorse_note || undefined, at: new Date(r.endorsed_at).getTime() }
      : undefined,
  };
}
