"use client";

import { ArrowRight, BadgeCheck, Clapperboard, Feather, Music, VenetianMask } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MaskPost } from "@/lib/types";

const KIND_ICON = { audio: Music, video: Clapperboard, text: Feather } as const;

/** Home-page spotlight of Mask Mode works endorsed by SVM core. Hidden until there is at least one. */
export function CorePicks() {
  const [picks, setPicks] = useState<MaskPost[]>([]);
  useEffect(() => {
    fetch("/api/posts?picks=1").then((r) => r.json()).then((d) => setPicks(d.posts ?? [])).catch(() => {});
  }, []);
  if (!picks.length) return null;

  return (
    <section className="card core-pick overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-sand/45 to-sand/10 px-5 py-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold"><BadgeCheck size={15} /> SVM Core Picks</div>
          <div className="font-display text-lg font-semibold">Work the core team loved this week</div>
        </div>
        <Link href="/stage" className="flex shrink-0 items-center gap-1 text-sm font-semibold text-iris hover:underline">Mask Mode <ArrowRight size={14} /></Link>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {picks.slice(0, 3).map((p) => {
          const Icon = KIND_ICON[p.kind as keyof typeof KIND_ICON] ?? VenetianMask;
          return (
            <Link key={p.id} href={`/stage#post-${p.id}`} className="group overflow-hidden rounded-xl border border-gold/25 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
              {p.kind === "photo" && p.media ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.media} alt={p.title} className="h-28 w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-28 place-items-center bg-panel2/60"><Icon size={28} className="text-iris/70" /></div>
              )}
              <div className="p-3">
                <div className="truncate font-display font-semibold">{p.title}</div>
                <div className="truncate text-xs text-mute">by {p.unmasked ?? p.alias}</div>
                {p.endorsement?.note && <div className="mt-1 line-clamp-2 text-xs italic text-fg/75">“{p.endorsement.note}”</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
