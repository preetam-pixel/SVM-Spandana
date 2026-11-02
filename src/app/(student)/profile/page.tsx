"use client";

import { BadgeCheck, Camera, Check, Instagram, LogOut, Mail, Pencil, RefreshCw, Trash2, VenetianMask, X, Youtube } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DnaRadar } from "@/components/DnaRadar";
import { Avatar, Badge, Button, DiscIcon, Kn, cx } from "@/components/ui";
import { DAYS, DEPTS, DIM_MAP, DISCIPLINES, LADDER, TIMES } from "@/lib/data";
import { archetype, points } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Dept, DisciplineId, MaskPost } from "@/lib/types";
import { uploadMedia } from "@/lib/upload-client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-iris/60";

function Section({ title, kn, editing, onEdit, onSave, onCancel, saving, children }: {
  title: string; kn?: string; editing?: boolean; onEdit?: () => void; onSave?: () => void; onCancel?: () => void; saving?: boolean; children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title} {kn && <Kn className="text-sm font-normal text-mute">{kn}</Kn>}</h2>
        {onEdit && !editing && <Button size="sm" variant="soft" onClick={onEdit}><Pencil size={13} /> Edit</Button>}
        {editing && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onCancel}><X size={14} /> Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={saving}><Check size={14} /> {saving ? "Saving…" : "Save"}</Button>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-mute">{label}</div>
      <div className={cx("mt-0.5 text-sm", !value && "italic text-mute")}>{value || "Not added"}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { account, profile, update, saveAccount, applyAccount, logout, toast } = useStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<"details" | "social" | "interests" | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: "", usn: "", email: "", dept: "CSE" as Dept, year: 1, bio: "", instagram: "", youtube: "" });
  const [interests, setInterests] = useState<DisciplineId[]>([]);
  const [works, setWorks] = useState<MaskPost[]>([]);

  useEffect(() => {
    fetch("/api/posts").then((r) => r.json()).then((d) => setWorks((d.posts as MaskPost[]).filter((p) => p.mine))).catch(() => {});
  }, []);

  if (!account) return null;

  const begin = (s: "details" | "social" | "interests") => {
    setDraft({ name: account.name, usn: account.usn, email: account.email, dept: account.dept, year: account.year, bio: account.bio, instagram: account.instagram, youtube: account.youtube });
    setInterests(profile.declared);
    setEditing(s);
  };

  const save = async (fields: Partial<typeof draft>) => {
    setSaving(true);
    const err = await saveAccount(fields);
    setSaving(false);
    if (err) return toast(err, "error");
    toast("Profile updated");
    setEditing(null);
  };

  const uploadAvatar = async (file: File) => {
    toast("Uploading photo…", "info");
    const up = await uploadMedia(file, "avatar");
    if ("error" in up) return toast(up.error, "error");
    const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarPath: up.path }) });
    const d = await res.json();
    if (!res.ok) return toast(d.error ?? "Upload failed", "error");
    applyAccount({ ...d.user, profile });
    toast("Profile photo updated");
  };

  const removeWork = async (id: string) => {
    if (!confirm("Delete this work permanently?")) return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) { setWorks((w) => w.filter((p) => p.id !== id)); toast("Work deleted", "info"); }
  };

  const toggleSlot = (slot: string) =>
    update((p) => ({ ...p, freeSlots: p.freeSlots.includes(slot) ? p.freeSlots.filter((s) => s !== slot) : [...p.freeSlots, slot] }));

  const rung = LADDER[profile.level];
  const phone = account.phone.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2");

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="card relative overflow-hidden p-0">
        <div className="h-24 bg-gradient-to-r from-sand/70 via-panel2 to-sand/40" />
        <div className="flex flex-wrap items-end gap-5 px-5 pb-5">
          <div className="relative -mt-12">
            <div className="rounded-full bg-white p-1 shadow-md"><Avatar name={account.name} src={account.avatar} size={96} /></div>
            <button onClick={() => fileRef.current?.click()} className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full grad-bg shadow" aria-label="Change photo"><Camera size={15} /></button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold">{account.name}</h1>
            <div className="mt-0.5 text-sm text-mute">{account.usn || "USN not added"} · {account.dept} · Year {account.year}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge color="#4f7b5f"><BadgeCheck size={12} /> {phone} verified</Badge>
              <Badge color="#5c3a21">{rung.name} <Kn>{rung.kn}</Kn></Badge>
              {profile.sparkDone && <Badge color="#a87a26">{archetype(profile.dna)}</Badge>}
            </div>
          </div>
          <div className="flex gap-3 text-center">
            {[[points(profile), "points"], [`${profile.stamps.length}/9`, "stamps"], [profile.contributions.filter((c) => c.kind !== "spark").length, "contributions"]].map(([n, l]) => (
              <div key={l as string} className="rounded-xl bg-panel2/60 px-3 py-2"><div className="font-display text-xl font-bold">{n}</div><div className="text-[11px] text-mute">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Personal details */}
          <Section title="Personal details" editing={editing === "details"} onEdit={() => begin("details")} onCancel={() => setEditing(null)} saving={saving}
            onSave={() => save({ name: draft.name, usn: draft.usn, email: draft.email, dept: draft.dept, year: draft.year, bio: draft.bio })}>
            {editing === "details" ? (
              <div className="grid gap-3">
                <label className="text-sm">Full name<input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">USN<input className={`${input} uppercase`} value={draft.usn} maxLength={12} onChange={(e) => setDraft({ ...draft, usn: e.target.value.toUpperCase() })} /></label>
                  <label className="text-sm">Email<input className={input} type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="you@example.com" /></label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm">Branch
                    <select className={input} value={draft.dept} onChange={(e) => setDraft({ ...draft, dept: e.target.value as Dept })}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select>
                  </label>
                  <label className="text-sm">Year
                    <select className={input} value={draft.year} onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })}>{[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
                  </label>
                </div>
                <label className="text-sm">Bio <span className="text-mute">({draft.bio.length}/280)</span>
                  <textarea className={`${input} resize-none`} rows={3} maxLength={280} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="A line about you and your art" />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name" value={account.name} />
                <Field label="USN" value={account.usn} />
                <Field label="Mobile" value={phone} />
                <Field label="Email" value={account.email} />
                <Field label="Branch" value={account.dept} />
                <Field label="Year" value={`Year ${account.year}`} />
                <div className="col-span-2"><Field label="Bio" value={account.bio} /></div>
              </div>
            )}
          </Section>

          {/* Social */}
          <Section title="Social & portfolio links" editing={editing === "social"} onEdit={() => begin("social")} onCancel={() => setEditing(null)} saving={saving}
            onSave={() => save({ instagram: draft.instagram, youtube: draft.youtube })}>
            {editing === "social" ? (
              <div className="grid gap-3">
                <label className="text-sm">Instagram handle<input className={input} value={draft.instagram} onChange={(e) => setDraft({ ...draft, instagram: e.target.value })} placeholder="@yourhandle" /></label>
                <label className="text-sm">YouTube / portfolio link<input className={input} value={draft.youtube} onChange={(e) => setDraft({ ...draft, youtube: e.target.value })} placeholder="https://…" /></label>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Instagram size={16} className="text-magenta" /> {account.instagram ? `@${account.instagram}` : <span className="italic text-mute">Not added</span>}</div>
                <div className="flex items-center gap-2"><Youtube size={16} className="text-magenta" /> {account.youtube || <span className="italic text-mute">Not added</span>}</div>
                <div className="flex items-center gap-2"><Mail size={16} className="text-magenta" /> {account.email || <span className="italic text-mute">Not added</span>}</div>
              </div>
            )}
          </Section>

          {/* Interests */}
          <Section title="Art forms I do" editing={editing === "interests"} onEdit={() => begin("interests")} onCancel={() => setEditing(null)}
            onSave={() => { update((p) => ({ ...p, declared: interests })); setEditing(null); toast("Interests updated"); }}>
            <div className="flex flex-wrap gap-2">
              {(editing === "interests" ? DISCIPLINES : DISCIPLINES.filter((d) => profile.declared.includes(d.id))).map((d) => {
                const on = (editing === "interests" ? interests : profile.declared).includes(d.id);
                return (
                  <button key={d.id} disabled={editing !== "interests"} onClick={() => setInterests(on ? interests.filter((x) => x !== d.id) : [...interests, d.id])}
                    className={cx("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition", on ? "border-iris/50 bg-iris/10" : "border-line hover:bg-fg/5", editing !== "interests" && "cursor-default")}>
                    <DiscIcon id={d.id} size={14} /> {d.name}
                  </button>
                );
              })}
              {editing !== "interests" && profile.declared.length === 0 && <span className="text-sm italic text-mute">None yet. That's fine, your hidden spark will guide you.</span>}
            </div>
          </Section>

          {/* Availability */}
          <Section title="Weekly free slots">
            <p className="-mt-2 mb-3 text-xs text-mute">Tap to toggle. Recommendations and squads only use these slots.</p>
            <div className="grid grid-cols-[auto_repeat(4,1fr)] gap-1.5 text-[11px]">
              <div />
              {TIMES.map((t) => <div key={t} className="text-center text-mute">{t}</div>)}
              {DAYS.map((d) => (
                <div key={d} className="contents">
                  <div className="pr-1 text-mute">{d}</div>
                  {TIMES.map((t) => {
                    const s = `${d} ${t}`;
                    const on = profile.freeSlots.includes(s);
                    return <button key={s} onClick={() => toggleSlot(s)} aria-label={s} className={cx("h-7 rounded-md transition", on ? "bg-aqua/70" : "bg-fg/5 hover:bg-fg/10")} />;
                  })}
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          {/* DNA */}
          <Section title="Creative DNA">
            {profile.sparkDone ? (
              <>
                <DnaRadar dna={profile.dna} height={240} />
                {profile.hiddenSpark && <p className="text-center text-sm text-mute">Hidden spark: <b style={{ color: DIM_MAP[profile.hiddenSpark].color }}>{DIM_MAP[profile.hiddenSpark].label}</b></p>}
              </>
            ) : <p className="text-sm text-mute">You haven't taken the Creative Spark yet.</p>}
            <Button size="sm" variant="soft" className="mt-3" onClick={() => router.push("/spark")}><RefreshCw size={13} /> {profile.sparkDone ? "Retake Creative Spark" : "Take Creative Spark"}</Button>
          </Section>

          {/* Works */}
          <Section title="My works">
            {works.length === 0 ? (
              <p className="text-sm text-mute">No uploads yet. <Link href="/stage" className="font-semibold text-iris hover:underline">Share your first work in Mask Mode →</Link></p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {works.map((w) => (
                  <div key={w.id} className="overflow-hidden rounded-xl border border-line bg-white">
                    <div className="grid aspect-video place-items-center bg-panel2/60">
                      {w.kind === "photo" && w.media && <img src={w.media} alt={w.title} className="h-full w-full object-cover" />}
                      {w.kind === "video" && w.media && <video src={w.media} className="h-full w-full object-cover" muted />}
                      {w.kind === "audio" && <span className="text-3xl">🎵</span>}
                      {w.kind === "text" && <p className="line-clamp-3 px-3 font-display text-sm italic">{w.text}</p>}
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{w.title}</div>
                        <div className="flex items-center gap-1 text-[11px] text-mute">{w.unmasked ? "Unmasked" : <><VenetianMask size={11} /> as {w.alias}</>}</div>
                      </div>
                      <button onClick={() => removeWork(w.id)} className="text-mute hover:text-magenta" aria-label="Delete"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Account */}
          <Section title="Account">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <div className="flex items-center gap-1.5 font-medium"><BadgeCheck size={16} className="text-aqua" /> {phone}</div>
                <div className="text-xs text-mute">Verified by OTP · member since {new Date(account.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</div>
              </div>
              <Button size="sm" variant="soft" onClick={async () => { await logout(); router.push("/"); }}><LogOut size={14} /> Log out</Button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
