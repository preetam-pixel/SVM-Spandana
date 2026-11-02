"use client";

import { motion } from "framer-motion";
import { Camera, Clapperboard, Feather, Heart, Music, Play, Send, ShieldCheck, Sparkles, UploadCloud, VenetianMask, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiTag, Badge, Button, Card, SectionHead, Shimmer, cx } from "@/components/ui";
import { askAI } from "@/lib/ai";
import { noteFreq, playNotes } from "@/lib/audio";
import { useStore } from "@/lib/store";
import type { DisciplineId, MaskPost } from "@/lib/types";
import { uploadMedia } from "@/lib/upload-client";

const UNMASK_AT = 10;
const REACT = [
  { k: "heart", e: "❤️" },
  { k: "fire", e: "🔥" },
  { k: "wow", e: "✨" },
  { k: "clap", e: "👏" },
] as const;

type Kind = "photo" | "audio" | "video" | "text";
const KINDS: { id: Kind; label: string; icon: typeof Camera; accept: string; hint: string; disc: DisciplineId }[] = [
  { id: "photo", label: "Photo / Art", icon: Camera, accept: "image/*", hint: "JPG, PNG or WebP · up to 10 MB", disc: "photo" },
  { id: "audio", label: "Music", icon: Music, accept: "audio/*", hint: "MP3, M4A, WAV or OGG · up to 20 MB", disc: "vocal" },
  { id: "video", label: "Reel / Video", icon: Clapperboard, accept: "video/*", hint: "MP4, WebM or MOV · up to 50 MB", disc: "video" },
  { id: "text", label: "Writing", icon: Feather, accept: "", hint: "Poem, shayari, ಕವನ, story", disc: "writing" },
];

const total = (p: MaskPost) => p.reactions.heart + p.reactions.fire + p.reactions.wow + p.reactions.clap;

export default function StagePage() {
  const { addContribution, toast } = useStore();
  const [posts, setPosts] = useState<MaskPost[] | null>(null);
  const [kind, setKind] = useState<Kind>("photo");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch("/api/posts").then((r) => r.json()).then((d) => setPosts(d.posts)).catch(() => setPosts([]));
  }, []);
  useEffect(load, [load]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const want = kind === "photo" ? "image/" : `${kind}/`;
    if (!f.type.startsWith(want)) return toast(`That doesn't look like a ${KINDS.find((k) => k.id === kind)!.label.toLowerCase()} file`, "error");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, 60));
  };

  const clear = () => { setFile(null); setPreview(null); setTitle(""); setText(""); setProgress(null); };

  const post = async () => {
    let media: { path: string; mime: string } | undefined;
    if (kind !== "text" && file) {
      setProgress(35);
      const up = await uploadMedia(file, kind);
      if ("error" in up) {
        setProgress(null);
        return toast(up.error, "error");
      }
      media = up;
    }
    setProgress(90);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, title, body: text, path: media?.path, mime: media?.mime }),
    });
    const data = (await res.json()) as { post?: MaskPost; error?: string };
    setProgress(null);
    if (!res.ok || !data.post) return toast(data.error ?? "Couldn't post", "error");
    setPosts((ps) => [data.post!, ...(ps ?? [])]);
    addContribution({ title: `Shared “${data.post.title}” in Mask Mode`, kind: "showcase", discipline: KINDS.find((k) => k.id === kind)!.disc, points: 20 });
    toast(`Posted anonymously as “${data.post.alias}”`, "info");
    clear();
  };

  const act = async (id: string, body: Record<string, string>) => {
    const res = await fetch(`/api/posts/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.ok;
  };

  const react = (id: string, k: keyof MaskPost["reactions"]) => {
    setPosts((ps) => ps!.map((p) => (p.id === id ? { ...p, reactions: { ...p.reactions, [k]: p.reactions[k] + 1 } } : p)));
    void act(id, { action: "react", kind: k });
  };

  const comment = async (id: string, c: string) => {
    if (await act(id, { action: "comment", text: c })) setPosts((ps) => ps!.map((p) => (p.id === id ? { ...p, comments: [...p.comments, c] } : p)));
  };

  const unmask = async (p: MaskPost) => {
    if (!confirm(`Unmask “${p.title}”? Your name will appear on it and it will show on your public profile.`)) return;
    if (!(await act(p.id, { action: "unmask" }))) return toast("Couldn't unmask", "error");
    addContribution({ title: `Unmasked as the creator of “${p.title}”`, kind: "showcase", discipline: KINDS.find((k) => k.id === p.kind)?.disc, points: 15 });
    toast("You unmasked! Take a bow 🎉", "level");
    load();
  };

  const remask = async (p: MaskPost) => {
    if (!(await act(p.id, { action: "remask" }))) return toast("Couldn't mask again", "error");
    toast(`“${p.title}” is anonymous again`, "info");
    load();
  };

  const mine = (posts ?? []).filter((p) => p.mine);
  const meta = KINDS.find((k) => k.id === kind)!;
  const canPost = progress === null && (kind === "text" ? text.trim().length > 2 : !!file);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="card relative overflow-hidden p-6">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-sand/50 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-iris/10"><VenetianMask className="text-iris" /></div>
            <div>
              <h1 className="font-display text-2xl font-bold">Mask Mode</h1>
              <p className="mt-1 text-sm text-mute">Upload your photos, music, reels and writing under a secret alias. Collect kind reactions. <b className="text-fg">Unmask only when you're ready.</b></p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge color="#4f7b5f"><ShieldCheck size={11} /> No downvotes, ever</Badge>
                <Badge color="#4f7b5f"><Sparkles size={11} /> AI keeps comments kind</Badge>
                <Badge color="#a87a26">Your name stays hidden until you unmask</Badge>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {KINDS.map((k) => (
              <button key={k.id} onClick={() => { setKind(k.id); clear(); }}
                className={cx("flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition", kind === k.id ? "border-iris bg-iris text-white shadow-md shadow-iris/20" : "border-line bg-white text-mute hover:text-fg")}>
                <k.icon size={16} /> {k.label}
              </button>
            ))}
          </div>

          {kind === "text" ? (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="A poem, a shayari, a ಕವನ, a thought…" className="w-full resize-none rounded-xl border border-line bg-white p-3 font-display outline-none placeholder:font-sans placeholder:text-fg/30 focus:border-iris/60" />
          ) : !file ? (
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
              className={cx("flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition", drag ? "border-iris bg-iris/5" : "border-line bg-panel2/30 hover:bg-panel2/60")}
            >
              <UploadCloud size={32} className="text-iris" />
              <div className="font-semibold">Tap to upload or drag your {meta.label.toLowerCase()} here</div>
              <div className="text-xs text-mute">{meta.hint}</div>
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-line bg-panel2/40">
              <button onClick={clear} className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow" aria-label="Remove"><X size={16} /></button>
              {kind === "photo" && preview && <img src={preview} alt="Preview" className="max-h-80 w-full object-contain" />}
              {kind === "video" && preview && <video src={preview} controls playsInline className="max-h-80 w-full bg-black" />}
              {kind === "audio" && preview && (
                <div className="flex items-center gap-3 p-5"><div className="grid h-12 w-12 place-items-center rounded-full grad-bg"><Music size={20} /></div><audio src={preview} controls className="w-full" /></div>
              )}
              <div className="border-t border-line bg-white px-3 py-2 text-xs text-mute">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept={meta.accept} hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Title" className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-iris/60" />
            {kind !== "text" && <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Caption (optional)" className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-iris/60" />}
          </div>
          {progress !== null && (
            <div className="mt-3"><div className="h-2 overflow-hidden rounded-full bg-fg/10"><div className="h-full grad-bg transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-1 text-xs text-mute">{progress < 90 ? "Uploading to secure storage…" : "Publishing…"}</div></div>
          )}
          <div className="mt-3 flex justify-end"><Button disabled={!canPost} onClick={post}><VenetianMask size={16} /> Post anonymously</Button></div>
        </Card>

        <section>
          <SectionHead title="Masked showcase" sub="Work from classmates you haven't met yet" />
          {!posts ? <Shimmer lines={4} /> : (
            <div className="grid gap-4 sm:grid-cols-2">
              {posts.map((p) => <PostCard key={p.id} p={p} onReact={(k) => react(p.id, k)} onComment={(c) => comment(p.id, c)} onUnmask={() => unmask(p)} onRemask={() => remask(p)} />)}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <Card>
          <div className="font-display font-semibold">Your masked works</div>
          {mine.length === 0 && <p className="mt-2 text-sm text-mute">Nothing yet. Your first upload is 100% anonymous.</p>}
          <div className="mt-3 space-y-3">
            {mine.map((p) => {
              const t = total(p);
              return (
                <div key={p.id} className="rounded-xl border border-line bg-white p-3">
                  <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-semibold">{p.title}</span><span className="shrink-0 text-xs text-mute">{p.unmasked ? "Unmasked" : `as ${p.alias}`}</span></div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-mute">{REACT.map((r) => <span key={r.k}>{r.e} {p.reactions[r.k]}</span>)}</div>
                  {!p.unmasked && (
                    <>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/10"><div className="h-full grad-bg transition-all" style={{ width: `${Math.min(100, (t / UNMASK_AT) * 100)}%` }} /></div>
                      <div className="mt-2 text-xs text-mute">{t >= UNMASK_AT ? <span className="text-gold">{t} people loved this. Ready to take a bow?</span> : `${t} reactions so far. Unmask whenever you feel ready.`}</div>
                      <Button size="sm" variant={t >= UNMASK_AT ? "primary" : "soft"} className="mt-2 w-full" onClick={() => unmask(p)}>Unmask me ✦</Button>
                    </>
                  )}
                  {p.unmasked && (
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-aqua">Credited to {p.unmasked}</span>
                      <button onClick={() => remask(p)} className="shrink-0 font-semibold text-mute hover:text-fg">Mask again</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <div className="font-display font-semibold">Why masks work</div>
          <p className="mt-2 text-sm text-mute">Most students who never join say they fear judgement. Mask Mode separates the work from the person: feedback comes first, identity comes later, and only by choice.</p>
        </Card>
      </aside>
    </div>
  );
}

function PostCard({ p, onReact, onComment, onUnmask, onRemask }: {
  p: MaskPost;
  onReact: (k: keyof MaskPost["reactions"]) => void;
  onComment: (c: string) => Promise<void>;
  onUnmask: () => void;
  onRemask: () => void;
}) {
  const [c, setC] = useState("");
  const [checking, setChecking] = useState(false);
  const [hint, setHint] = useState<{ suggestion: string; source: string } | null>(null);

  const send = async () => {
    setChecking(true);
    try {
      const r = await askAI<{ ok: boolean; suggestion: string }>("kind", { text: c, work: p.title });
      if (r.data.ok) { await onComment(c); setC(""); setHint(null); }
      else setHint({ suggestion: r.data.suggestion, source: r.source });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="card flex flex-col overflow-hidden">
      {p.kind === "photo" && p.media && <img src={p.media} alt={p.title} className="max-h-72 w-full bg-panel2 object-cover" loading="lazy" />}
      {p.kind === "video" && p.media && <video src={p.media} controls playsInline preload="metadata" className="max-h-80 w-full bg-black" />}
      {(p.kind === "sketch" || p.kind === "scene") && <MaskArt kind={p.kind} seed={p.seed ?? 1} />}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between text-xs text-mute">
          <span className="flex min-w-0 items-center gap-1.5">
            <VenetianMask size={13} className="shrink-0" />
            {p.unmasked ? (
              p.creatorId ? (
                <Link href={p.mine ? "/profile" : `/u/${p.creatorId}`} className="truncate font-semibold text-aqua hover:underline">{p.unmasked}</Link>
              ) : <span className="truncate font-semibold text-aqua">{p.unmasked}</span>
            ) : <span className="truncate">{p.alias}</span>}
            {p.mine && <Badge color="#a87a26">You</Badge>}
          </span>
          <span className="shrink-0">{p.hoursAgo === 0 ? "just now" : `${p.hoursAgo}h ago`}</span>
        </div>
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <div className="font-display text-lg font-semibold">{p.title}</div>
          {p.mine && (p.unmasked ? (
            <button onClick={onRemask} className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-mute hover:text-fg">Mask again</button>
          ) : (
            <button onClick={onUnmask} className="shrink-0 rounded-full grad-bg px-2.5 py-1 text-[11px] font-semibold shadow-sm">Unmask ✦</button>
          ))}
        </div>
        {p.text && <p className={cx("mt-1.5 whitespace-pre-line text-sm leading-relaxed text-fg/85", p.kind === "text" && "font-display text-base italic")}>{p.text}</p>}
        {p.kind === "audio" && p.media && (
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-panel2/50 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full grad-bg"><Music size={15} /></span><audio src={p.media} controls preload="metadata" className="h-9 w-full" /></div>
        )}
        {p.kind === "tune" && p.notes && (
          <button onClick={() => playNotes(p.notes!)} className="mt-2 flex items-center gap-3 rounded-xl bg-panel2/50 p-3 text-left hover:bg-panel2">
            <span className="grid h-9 w-9 place-items-center rounded-full grad-bg"><Play size={15} className="ml-0.5" /></span>
            <span className="flex h-8 flex-1 items-end gap-0.5">
              {p.notes.map(([n], i) => <span key={i} className="flex-1 rounded-sm bg-iris/50" style={{ height: `${30 + (noteFreq(n) - 250) / 6}%` }} />)}
            </span>
          </button>
        )}
        <div className="mt-3 flex gap-1.5">
          {REACT.map((r) => (
            <motion.button whileTap={{ scale: 0.85 }} key={r.k} onClick={() => onReact(r.k)} className="flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs hover:bg-panel2/50">{r.e} {p.reactions[r.k]}</motion.button>
          ))}
        </div>
        <div className="mt-3 space-y-1">
          {p.comments.slice(-2).map((x, i) => <div key={i} className="text-xs text-mute"><Heart size={10} className="mr-1 inline text-magenta" />{x}</div>)}
        </div>
        <div className="mt-auto flex gap-2 pt-3">
          <input value={c} onChange={(e) => setC(e.target.value)} onKeyDown={(e) => e.key === "Enter" && c.trim() && send()} placeholder="Say something kind…" className="min-w-0 flex-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs outline-none focus:border-iris/50" />
          <button disabled={!c.trim() || checking} onClick={send} className="grid h-8 w-8 place-items-center rounded-full grad-bg disabled:opacity-40" aria-label="Send"><Send size={13} /></button>
        </div>
        {hint && (
          <div className="mt-2 rounded-xl border border-gold/30 bg-sand/20 p-2.5 text-xs">
            <div className="mb-1 flex items-center justify-between"><span className="font-semibold text-gold">Let's keep it kind 💛</span><AiTag source={hint.source} /></div>
            <div className="text-fg/80">{hint.suggestion}</div>
            <button className="mt-1.5 font-semibold text-gold underline" onClick={() => { setC(hint.suggestion.replace(/^.*?[“"]|[”"].*$/g, "") || hint.suggestion); setHint(null); }}>Use this instead</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MaskArt({ kind, seed }: { kind: "sketch" | "scene"; seed: number }) {
  const h = (seed * 47) % 360;
  if (kind === "scene")
    return (
      <svg viewBox="0 0 300 170" className="block w-full">
        <defs>
          <linearGradient id={`ps${seed}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a3a5e" /><stop offset="0.6" stopColor="#e07a5f" /><stop offset="1" stopColor="#f2c46b" /></linearGradient>
        </defs>
        <rect width="300" height="170" fill={`url(#ps${seed})`} />
        <circle cx="200" cy="96" r="20" fill="#fff1c1" />
        <path d="M0 110 L60 86 L120 104 L190 80 L250 100 L300 90 L300 112 L0 112 Z" fill="#3b2416" />
        <rect y="112" width="300" height="58" fill="#2a1a10" />
        <rect x="180" y="122" width="40" height="2" fill="#fff1c1" opacity="0.6" /><rect x="186" y="132" width="28" height="2" fill="#fff1c1" opacity="0.4" />
      </svg>
    );
  return (
    <svg viewBox="0 0 300 170" className="block w-full bg-[#f3e9d8]">
      {Array.from({ length: 12 }).map((_, i) => (
        <g key={i} transform={`rotate(${i * 30} 150 85)`}>
          <ellipse cx="150" cy="45" rx="10" ry="34" fill={`hsl(${(h % 40) + 15 + i * 2} 55% ${45 + (i % 3) * 6}%)`} opacity="0.6" />
          <circle cx="150" cy="20" r="4" fill="#8b3a3a" />
        </g>
      ))}
      <circle cx="150" cy="85" r="14" fill="#5c3a21" />
    </svg>
  );
}
