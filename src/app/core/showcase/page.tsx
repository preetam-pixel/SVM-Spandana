"use client";

import { BadgeCheck, Clapperboard, Feather, Music, VenetianMask } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Shimmer, cx } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { MaskPost } from "@/lib/types";

const KIND_ICON = { audio: Music, video: Clapperboard, text: Feather } as const;
const TABS = [
  { id: "review", label: "To review" },
  { id: "picks", label: "Core Picks" },
] as const;

const reactions = (p: MaskPost) => p.reactions.heart + p.reactions.fire + p.reactions.wow + p.reactions.clap;

/** Core members review Mask Mode work and endorse the best as "SVM Core Picks". */
export default function EndorsePage() {
  const { toast } = useStore();
  const [posts, setPosts] = useState<MaskPost[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("review");

  const load = useCallback(() => {
    fetch("/api/posts").then((r) => r.json()).then((d) => setPosts(d.posts ?? [])).catch(() => setPosts([]));
  }, []);
  useEffect(load, [load]);

  const endorse = async (p: MaskPost, note: string | null) => {
    const res = await fetch(`/api/posts/${p.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note === null ? { action: "unendorse" } : { action: "endorse", note }),
    });
    const d = (await res.json()) as { error?: string };
    if (!res.ok) return toast(d.error ?? "Couldn't update the endorsement", "error");
    toast(note === null ? `Removed “${p.title}” from Core Picks` : `“${p.title}” is now an SVM Core Pick`, note === null ? "info" : "level");
    load();
  };

  const picks = (posts ?? []).filter((p) => p.endorsement);
  // Most-loved first, so strong work doesn't get buried under new posts.
  const review = (posts ?? []).filter((p) => !p.endorsement && !p.mine).sort((a, b) => reactions(b) - reactions(a));
  const list = tab === "picks" ? picks : review;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Endorse work</h1>
        <p className="mt-1 max-w-2xl text-sm text-mute">
          Pick standout Mask Mode work as an <b className="text-fg">SVM Core Pick</b>. It gets a gold highlight, appears on everyone&apos;s home page, and the creator earns the Core Pick badge.
          Creators stay anonymous unless they choose to unmask.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cx("rounded-full border px-4 py-1.5 text-sm font-medium", tab === t.id ? "border-fg bg-fg text-ink" : "border-line bg-white text-mute hover:text-fg")}>
            {t.label} <span className="ml-1 opacity-70">{t.id === "picks" ? picks.length : review.length}</span>
          </button>
        ))}
      </div>

      {!posts ? <Card><Shimmer lines={5} /></Card> : list.length === 0 ? (
        <Card className="py-10 text-center text-sm text-mute">{tab === "picks" ? "No Core Picks yet. Endorse something from the review list." : "Nothing to review. New Mask Mode posts will show up here."}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => <Row key={p.id} p={p} onEndorse={(n) => endorse(p, n)} />)}
        </div>
      )}
    </div>
  );
}

function Row({ p, onEndorse }: { p: MaskPost; onEndorse: (note: string | null) => void }) {
  const [note, setNote] = useState("");
  const Icon = KIND_ICON[p.kind as keyof typeof KIND_ICON] ?? VenetianMask;
  return (
    <div className={cx("card flex flex-col overflow-hidden", p.endorsement && "core-pick")}>
      {p.kind === "photo" && p.media ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.media} alt={p.title} className="h-40 w-full object-cover" loading="lazy" />
      ) : p.kind === "video" && p.media ? (
        <video src={p.media} controls playsInline preload="metadata" className="h-40 w-full bg-black" />
      ) : (
        <div className="grid h-24 place-items-center bg-panel2/60"><Icon size={26} className="text-iris/70" /></div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-mute">
          <span className="truncate">{p.unmasked ?? p.alias}</span>
          <span className="shrink-0">{reactions(p)} reactions · {p.hoursAgo < 24 ? `${p.hoursAgo}h` : `${Math.round(p.hoursAgo / 24)}d`} ago</span>
        </div>
        <div className="mt-1 font-display text-lg font-semibold">{p.title}</div>
        {p.text && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-fg/80">{p.text}</p>}
        {p.kind === "audio" && p.media && <audio src={p.media} controls preload="metadata" className="mt-2 h-9 w-full" />}
        <div className="mt-auto pt-3">
          {p.endorsement ? (
            <div className="space-y-2">
              <Badge color="#a87a26"><BadgeCheck size={12} /> Endorsed by {p.endorsement.by}</Badge>
              {p.endorsement.note && <p className="text-xs italic text-fg/75">“{p.endorsement.note}”</p>}
              <button onClick={() => onEndorse(null)} className="block text-xs font-semibold text-mute hover:text-magenta">Remove from Core Picks</button>
            </div>
          ) : (
            <div className="space-y-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="A note to the creator (optional)" className="w-full rounded-full border border-line bg-white px-3 py-1.5 text-xs outline-none focus:border-fg/50" />
              <div className="flex items-center justify-between gap-2">
                <Button size="sm" variant="core" onClick={() => onEndorse(note)}><BadgeCheck size={14} /> Endorse</Button>
                <Link href={`/stage#post-${p.id}`} className="text-xs font-semibold text-iris hover:underline">View in Mask Mode</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
