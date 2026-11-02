"use client";

import { Info, Instagram, Lock, Mail, Music, Youtube } from "lucide-react";
import { DnaRadar } from "@/components/DnaRadar";
import { FriendButton } from "@/components/FriendButton";
import { Avatar, Badge, Card, DiscIcon, Kn, SectionHead, cx } from "@/components/ui";
import { DIM_MAP, DISCIPLINES, LADDER } from "@/lib/data";
import { archetype } from "@/lib/engine";
import type { FriendStatus, MaskPost, PublicProfile } from "@/lib/types";

export function PublicProfileView({ person, status, friends, mutual, works }: {
  person: PublicProfile;
  status: FriendStatus;
  friends?: number;
  mutual?: number;
  works?: MaskPost[];
}) {
  const rung = LADDER[person.level] ?? LADDER[0];
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
              <Badge color="#5c3a21">{rung.name} <Kn>{rung.kn}</Kn></Badge>
              {person.sparkDone && <Badge color="#a87a26">{archetype(person.dna)}</Badge>}
              {friends !== undefined && <Badge>{friends} friend{friends === 1 ? "" : "s"}{mutual ? ` · ${mutual} mutual` : ""}</Badge>}
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            <div className="flex gap-2 text-center">
              <div className="rounded-xl bg-panel2/60 px-3 py-2"><div className="font-display text-xl font-bold">{person.points}</div><div className="text-[11px] text-mute">points</div></div>
              <div className="rounded-xl bg-panel2/60 px-3 py-2"><div className="font-display text-xl font-bold">{person.stamps.length}/9</div><div className="text-[11px] text-mute">stamps</div></div>
            </div>
            {!person.demo && <FriendButton userId={person.id} name={person.name} status={status} size="md" />}
          </div>
        </div>
      </section>

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
    </div>
  );
}
