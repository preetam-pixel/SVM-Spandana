"use client";

import { Award, Info, Instagram, Lock, Mail, Music, ShieldCheck, ShieldMinus, Trophy, Youtube } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MedalRow } from "@/components/AchievementBadge";
import { DnaRadar } from "@/components/DnaRadar";
import { FriendButton } from "@/components/FriendButton";
import { RecognizeDialog } from "@/components/RecognizeDialog";
import { Avatar, Badge, Button, Card, DiscIcon, Kn, SectionHead, cx } from "@/components/ui";
import { DIM_MAP, DISCIPLINES, LADDER } from "@/lib/data";
import { recognitionEmoji } from "@/lib/club";
import { archetype } from "@/lib/engine";
import { patchJSON, postJSON } from "@/lib/events-client";
import { useStore } from "@/lib/store";
import type { FriendStatus, MaskPost, PublicProfile } from "@/lib/types";

export function PublicProfileView({ person, status, friends, mutual, works, canRecognise, canChangeRole, onChanged }: {
  person: PublicProfile;
  status: FriendStatus;
  friends?: number;
  mutual?: number;
  works?: MaskPost[];
  canRecognise?: boolean; // the viewer is an SVM core member
  canChangeRole?: boolean; // ...and not the shared demo organiser
  onChanged?: () => void;
}) {
  const { toast } = useStore();
  const [recognising, setRecognising] = useState(false);
  const rung = LADDER[person.level] ?? LADDER[0];
  const first = person.name.split(" ")[0];
  const setRole = async (role: "core" | "member") => {
    if (!confirm(role === "core" ? `Make ${first} an SVM core member? They'll be able to post events and notices and recognise members.` : `Remove ${first} from the SVM core team?`)) return;
    const err = await patchJSON(`/api/people/${person.id}`, { role });
    if (err) return toast(err, "error");
    toast(role === "core" ? `${first} is now an SVM core member` : `${first} is a member again`, "info");
    onChanged?.();
  };
  return (
    <div className="space-y-6">
      {person.demo && (
        <div className="flex items-center gap-2 rounded-2xl border border-gold/40 bg-sand/20 p-3 text-sm">
          <Info size={16} className="shrink-0 text-gold" />
          Sample student from the simulated campus data. Find real members to add as friends in <b>People</b>.
        </div>
      )}

      <section className="card overflow-hidden p-0">
        <div className="h-24 bg-gradient-to-r from-sand/70 via-panel2 to-sand/40" />
        <div className="flex flex-wrap items-end gap-5 px-5 pb-5">
          <div className="-mt-12 rounded-full bg-white p-1 shadow-md"><Avatar name={person.name} src={person.avatar} size={96} hue={person.name.length * 37} /></div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold">{person.name}</h1>
            <div className="mt-0.5 text-sm text-mute">{person.dept} · Year {person.year}{person.usn ? ` · ${person.usn}` : ""}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {person.role === "core" && <Badge color="#8b3a3a"><ShieldCheck size={11} /> SVM Core</Badge>}
              <Badge color="#5c3a21">{rung.name} <Kn>{rung.kn}</Kn></Badge>
              {person.sparkDone && <Badge color="#a87a26">{archetype(person.dna)}</Badge>}
              {friends !== undefined && <Badge>{friends} friend{friends === 1 ? "" : "s"}{mutual ? ` · ${mutual} mutual` : ""}</Badge>}
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <div className="flex gap-2 text-center">
              {person.achievements && <div className="rounded-xl bg-panel2/60 px-3 py-2"><div className="font-display text-xl font-bold">{person.achievements.length}</div><div className="text-[11px] text-mute">badges</div></div>}
              <div className="rounded-xl bg-panel2/60 px-3 py-2"><div className="font-display text-xl font-bold">{person.points}</div><div className="text-[11px] text-mute">points</div></div>
              <div className="rounded-xl bg-panel2/60 px-3 py-2"><div className="font-display text-xl font-bold">{person.stamps.length}/9</div><div className="text-[11px] text-mute">stamps</div></div>
            </div>
            {!person.demo && <FriendButton userId={person.id} name={person.name} status={status} size="md" />}
          </div>
        </div>
      </section>

      {canRecognise && !person.demo && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-iris/25 bg-white/70 p-3">
          <span className="mr-auto text-xs font-semibold uppercase tracking-wider text-mute">Core member tools</span>
          <Button size="sm" onClick={() => setRecognising(true)}><Award size={14} /> Recognise {first}</Button>
          {canChangeRole && (person.role === "core" ? (
            <Button size="sm" variant="ghost" onClick={() => setRole("member")}><ShieldMinus size={14} /> Remove from core</Button>
          ) : (
            <Button size="sm" variant="soft" onClick={() => setRole("core")}><ShieldCheck size={14} /> Make core member</Button>
          ))}
        </div>
      )}

      {!person.demo && ((person.achievements?.length ?? 0) > 0 || (person.recognitions?.length ?? 0) > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionHead title="Achievements" right={<Link href="/achievements" className="text-xs text-mute hover:text-fg">All badges →</Link>} />
            {person.achievements?.length ? <MedalRow ids={person.achievements} /> : <p className="text-sm text-mute">No badges yet.</p>}
          </Card>
          <Card>
            <SectionHead title="Recognitions" sub="From the SVM core team" />
            {person.recognitions?.length ? (
              <div className="space-y-3">
                {person.recognitions.slice(0, 4).map((r) => (
                  <div key={r.id} className="rounded-2xl bg-sand/15 p-3">
                    <div className="text-sm font-semibold">{recognitionEmoji(r.title)} {r.title}{r.eventTitle && r.eventId ? <span className="font-normal text-mute"> · <Link href={`/events/${r.eventId}`} className="hover:underline">{r.eventTitle}</Link></span> : null}</div>
                    {r.message && <p className="mt-0.5 text-sm italic text-fg/80">“{r.message}”</p>}
                    <div className="mt-1 text-[11px] text-mute">by {r.by} · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                  </div>
                ))}
              </div>
            ) : <p className="flex items-center gap-2 text-sm text-mute"><Trophy size={14} /> None yet.</p>}
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <SectionHead title="About" />
            <p className={cx("text-sm leading-relaxed", !person.bio && "italic text-mute")}>{person.bio || "No bio yet."}</p>
            <div className="mt-4 space-y-2 text-sm">
              {person.instagram && <a href={`https://instagram.com/${person.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-magenta"><Instagram size={16} className="text-magenta" /> @{person.instagram}</a>}
              {person.youtube && <a href={person.youtube.startsWith("http") ? person.youtube : `https://${person.youtube}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate hover:text-magenta"><Youtube size={16} className="text-magenta" /> {person.youtube}</a>}
              {person.email ? (
                <a href={`mailto:${person.email}`} className="flex items-center gap-2 hover:text-magenta"><Mail size={16} className="text-magenta" /> {person.email}</a>
              ) : !person.demo && status !== "friends" ? (
                <div className="flex items-center gap-2 text-xs text-mute"><Lock size={13} /> Email and USN are visible to friends only</div>
              ) : null}
            </div>
          </Card>

          <Card>
            <SectionHead title="Art forms" />
            <div className="flex flex-wrap gap-2">
              {DISCIPLINES.filter((d) => person.declared.includes(d.id) || person.stamps.includes(d.id)).map((d) => (
                <span key={d.id} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-sm">
                  <DiscIcon id={d.id} size={14} /> {d.name}
                  {person.stamps.includes(d.id) && <span className="text-[10px] font-bold uppercase text-gold">stamped</span>}
                </span>
              ))}
              {person.declared.length + person.stamps.length === 0 && <span className="text-sm italic text-mute">Still exploring</span>}
            </div>
          </Card>
        </div>

        <Card>
          <SectionHead title="Creative DNA" />
          {person.sparkDone ? (
            <>
              <DnaRadar dna={person.dna} height={250} />
              {person.hiddenSpark && <p className="text-center text-sm text-mute">Hidden spark: <b style={{ color: DIM_MAP[person.hiddenSpark].color }}>{DIM_MAP[person.hiddenSpark].label}</b></p>}
            </>
          ) : <p className="text-sm text-mute">Hasn't taken the Creative Spark yet.</p>}
        </Card>
      </div>

      {works && (
        <Card>
          <SectionHead title="Unmasked works" sub="Only works the creator chose to reveal appear here. Masked uploads stay anonymous." />
          {works.length === 0 ? <p className="text-sm text-mute">Nothing unmasked yet.</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {works.map((w) => (
                <div key={w.id} className="overflow-hidden rounded-xl border border-line bg-white">
                  <div className="grid aspect-video place-items-center bg-panel2/60">
                    {w.kind === "photo" && w.media && <img src={w.media} alt={w.title} className="h-full w-full object-cover" />}
                    {w.kind === "video" && w.media && <video src={w.media} controls playsInline preload="metadata" className="h-full w-full bg-black object-cover" />}
                    {w.kind === "audio" && w.media && <div className="w-full p-3"><Music className="mx-auto mb-2 text-iris" /><audio src={w.media} controls preload="metadata" className="h-8 w-full" /></div>}
                    {w.kind === "text" && <p className="line-clamp-4 px-3 font-display text-sm italic">{w.text}</p>}
                  </div>
                  <div className="p-2.5 text-sm font-semibold">{w.title}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <RecognizeDialog
        open={recognising} name={person.name} onClose={() => setRecognising(false)}
        onSubmit={async (title, message) => {
          const err = await postJSON("/api/recognitions", { userId: person.id, title, message });
          if (err) {
            toast(err, "error");
            return false;
          }
          toast(`${recognitionEmoji(title)} ${first} recognised as ${title}`);
          onChanged?.();
          return true;
        }}
      />
    </div>
  );
}
