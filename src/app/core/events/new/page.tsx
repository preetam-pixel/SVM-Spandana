"use client";

import { ArrowLeft, ImagePlus, Lock, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button, Card, SectionHead, Shimmer, cx } from "@/components/ui";
import { AUDIENCE, EVENT_KINDS, LEVEL_LABEL, ROLE_PRESETS } from "@/lib/club";
import { DISCIPLINES } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { ClubEventKind, DisciplineId, EventDetail, EventLevel } from "@/lib/types";
import { uploadMedia } from "@/lib/upload-client";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-iris/60";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wider text-mute";

interface RoleDraft { id?: string; label: string; slots: number; stage: boolean }

// Dates are entered and shown in IST whatever time zone the organiser's device is set to.
const IST_MS = 330 * 60_000;
/** "YYYY-MM-DDTHH:mm" (IST) for a datetime-local input. */
const toLocalInput = (ms: number) => new Date(ms + IST_MS).toISOString().slice(0, 16);
const fromLocalInput = (v: string) => Date.parse(`${v}:00+05:30`);

function defaultStart() {
  const day = toLocalInput(Date.now() + 3 * 86_400_000).slice(0, 10);
  return `${day}T17:00`;
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<Card><Shimmer lines={6} /></Card>}>
      <EventForm />
    </Suspense>
  );
}

function EventForm() {
  const { account, toast } = useStore();
  const router = useRouter();
  const editId = useSearchParams().get("id");
  const [loaded, setLoaded] = useState(!editId);
  const [title, setTitle] = useState("");
  const [discipline, setDiscipline] = useState<DisciplineId>("vocal");
  const [kind, setKind] = useState<ClubEventKind>("performance");
  const [level, setLevel] = useState<EventLevel>("open");
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [durationMin, setDuration] = useState(90);
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState<RoleDraft[]>([{ label: "Performer", slots: 8, stage: true }, { label: "Stage crew", slots: 4, stage: false }]);
  const [poster, setPoster] = useState<{ path?: string; preview: string } | null>(null);
  const [hadPoster, setHadPoster] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/events/${editId}`)
      .then((r) => r.json())
      .then((d: EventDetail & { error?: string }) => {
        if (!d.event) return toast(d.error ?? "Couldn't load the event", "error");
        const e = d.event;
        setTitle(e.title); setDiscipline(e.discipline); setKind(e.kind); setLevel(e.level); setStartsAt(toLocalInput(e.startsAt));
        setDuration(e.durationMin); setVenue(e.venue); setDescription(e.description);
        setRoles(e.roles.filter((r) => r.id !== AUDIENCE.id).map(({ id, label, slots, stage }) => ({ id, label, slots, stage })));
        if (e.poster) {
          setPoster({ preview: e.poster });
          setHadPoster(true);
        }
        setLoaded(true);
      })
      .catch(() => toast("Couldn't load the event", "error"));
  }, [editId, toast]);

  if (account?.role !== "core")
    return (
      <Card className="mx-auto max-w-md py-10 text-center">
        <Lock className="mx-auto text-mute" />
        <p className="mt-3 text-sm text-mute">Only SVM core members can post events. If you&apos;re organising something, message a coordinator on the SVM Team page.</p>
        <Link href="/team" className="mt-4 inline-block"><Button size="sm" variant="soft">SVM Team</Button></Link>
      </Card>
    );
  if (!loaded) return <Card><Shimmer lines={6} /></Card>;

  const setRole = (i: number, patch: Partial<RoleDraft>) => setRoles((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addPreset = (p: (typeof ROLE_PRESETS)[number]) => setRoles((rs) => (rs.some((r) => r.label === p.label) || rs.length >= 10 ? rs : [...rs, { ...p }]));

  const pickPoster = async (file: File) => {
    setPoster({ preview: URL.createObjectURL(file) });
    const r = await uploadMedia(file, "photo");
    if ("error" in r) {
      setPoster(null);
      return toast(r.error, "error");
    }
    setPoster({ path: r.path, preview: URL.createObjectURL(file) });
  };

  const submit = async () => {
    if (title.trim().length < 3) return toast("Give the event a title", "error");
    if (poster && !poster.path && poster.preview.startsWith("blob:")) return toast("The poster is still uploading", "info");
    setBusy(true);
    const body = {
      title, discipline, kind, level, venue, description, durationMin,
      startsAt: fromLocalInput(startsAt),
      roles: roles.filter((r) => r.label.trim()),
      ...(poster?.path ? { posterPath: poster.path } : {}),
      ...(editId && hadPoster && !poster ? { removePoster: true } : {}),
    };
    const res = await fetch(editId ? `/api/events/${editId}` : "/api/events", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Couldn't save the event", "error");
    toast(editId ? "Event updated" : "Event posted! Now invite people 🎉");
    router.push(`/events/${editId ?? d.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={editId ? `/events/${editId}` : "/events"} className="flex items-center gap-1 text-sm text-mute hover:text-fg"><ArrowLeft size={15} /> Back</Link>
      <Card>
        <SectionHead title={editId ? "Edit event" : "Post an event"} sub="Members see it in Events and on their Pulse. You can invite suggested members once it's posted." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="ev-title">Title</label>
            <input id="ev-title" className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Unplugged Night" />
          </div>
          <div>
            <label className={label} htmlFor="ev-disc">Art form</label>
            <select id="ev-disc" className={input} value={discipline} onChange={(e) => setDiscipline(e.target.value as DisciplineId)}>
              {DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="ev-kind">Type</label>
            <select id="ev-kind" className={input} value={kind} onChange={(e) => setKind(e.target.value as ClubEventKind)}>
              {EVENT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="ev-start">Date & time (IST)</label>
            <input id="ev-start" type="datetime-local" className={input} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="ev-dur">Duration</label>
            <select id="ev-dur" className={input} value={durationMin} onChange={(e) => setDuration(Number(e.target.value))}>
              {[30, 45, 60, 90, 120, 180, 240, 360].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} hour${m === 60 ? "" : "s"}`}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="ev-venue">Venue</label>
            <input id="ev-venue" className={input} value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={80} placeholder="e.g. Open Air Theatre" />
          </div>
          <div>
            <label className={label} htmlFor="ev-level">Who it&apos;s for</label>
            <select id="ev-level" className={input} value={level} onChange={(e) => setLevel(e.target.value as EventLevel)}>
              {(Object.keys(LEVEL_LABEL) as EventLevel[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="ev-desc">Description</label>
            <textarea id="ev-desc" className={input} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1500} rows={4} placeholder="What happens, what to bring, who should come" />
          </div>
          <div className="sm:col-span-2">
            <span className={label}>Poster (optional)</span>
            {poster ? (
              <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster.preview} alt="Poster preview" className="aspect-[16/9] w-full object-cover" />
                {!poster.path && poster.preview.startsWith("blob:") && <div className="absolute inset-0 grid place-items-center bg-white/60 text-sm">Uploading…</div>}
                <button onClick={() => setPoster(null)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-mute hover:text-magenta" aria-label="Remove poster"><X size={14} /></button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-fg/15 p-4 text-sm text-mute hover:bg-fg/[0.03]">
                <ImagePlus size={18} /> Add a poster image (JPG/PNG, up to 10 MB)
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && pickPoster(e.target.files[0])} />
              </label>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <SectionHead title="Call for participants" sub="The roles you need filled. Anyone can also join as audience." />
        <div className="space-y-2">
          {roles.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-2.5">
              <input className={cx(input, "min-w-0 flex-1 py-2")} value={r.label} onChange={(e) => setRole(i, { label: e.target.value })} maxLength={40} placeholder="Role, e.g. Singer" aria-label="Role name" />
              <label className="flex items-center gap-1.5 text-xs text-mute">
                Spots
                <input type="number" min={0} max={500} className={cx(input, "w-20 py-2")} value={r.slots} onChange={(e) => setRole(i, { slots: Math.max(0, Number(e.target.value) || 0) })} aria-label="Spots" />
              </label>
              <div className="flex overflow-hidden rounded-full border border-line text-xs">
                <button onClick={() => setRole(i, { stage: true })} className={cx("px-3 py-1.5", r.stage ? "bg-iris text-white" : "text-mute")}>On stage</button>
                <button onClick={() => setRole(i, { stage: false })} className={cx("px-3 py-1.5", !r.stage ? "bg-iris text-white" : "text-mute")}>Backstage</button>
              </div>
              <button onClick={() => setRoles((rs) => rs.filter((_, j) => j !== i))} className="p-1.5 text-mute hover:text-magenta" aria-label="Remove role"><Trash2 size={15} /></button>
            </div>
          ))}
          <p className="text-[11px] text-mute">Spots 0 = no limit.</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ROLE_PRESETS.filter((p) => !roles.some((r) => r.label === p.label)).map((p) => (
            <button key={p.label} onClick={() => addPreset(p)} className="flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs hover:bg-fg/5"><Plus size={12} /> {p.label}</button>
          ))}
          <button onClick={() => setRoles((rs) => (rs.length >= 10 ? rs : [...rs, { label: "", slots: 2, stage: false }]))} className="flex items-center gap-1 rounded-full border border-dashed border-fg/25 px-2.5 py-1 text-xs text-mute hover:bg-fg/5"><Plus size={12} /> Custom role</button>
        </div>
      </Card>

      <div className="flex justify-end gap-2 pb-4">
        <Link href={editId ? `/events/${editId}` : "/events"}><Button variant="ghost">Cancel</Button></Link>
        <Button size="lg" onClick={submit} disabled={busy}>{busy ? "Saving…" : editId ? "Save changes" : "Post event"}</Button>
      </div>
    </div>
  );
}
