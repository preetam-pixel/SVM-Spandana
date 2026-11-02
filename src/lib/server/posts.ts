import type { MaskPost } from "@/lib/types";

export interface PostRow {
  id: string; user_id: string | null; alias: string; kind: string; title: string; body: string | null; media: string | null;
  mime: string | null; notes: string | null; seed: number | null; heart: number; fire: number; wow: number; clap: number;
  unmasked: string | null; created_at: number;
}

/** Shapes a post for the client. The creator's identity is only revealed once they unmask. */
export function serializePost(r: PostRow, viewer: string | null, comments: string[]): MaskPost {
  return {
    id: r.id, alias: r.alias, kind: r.kind as MaskPost["kind"], title: r.title, text: r.body ?? undefined,
    notes: r.notes ? JSON.parse(r.notes) : undefined, seed: r.seed ?? undefined, media: r.media ?? undefined, mime: r.mime ?? undefined,
    reactions: { heart: r.heart, fire: r.fire, wow: r.wow, clap: r.clap }, comments,
    hoursAgo: Math.max(0, Math.round((Date.now() - r.created_at) / 3_600_000)),
    unmasked: r.unmasked ?? undefined, mine: !!viewer && r.user_id === viewer,
  };
}
