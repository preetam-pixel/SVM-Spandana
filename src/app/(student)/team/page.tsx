"use client";

import { Clock, Info, Instagram, Mail, MapPin, MessageCircle, Phone, Users } from "lucide-react";
import Image from "next/image";
import { Avatar, Badge, Card, DiscIcon, Kn, SectionHead, cx } from "@/components/ui";
import { DISC_MAP } from "@/lib/data";
import { FACULTY_COORDINATORS, STUDENT_COORDINATORS, SVM_INFO, WING_HEADS, type Official } from "@/lib/officials";

const isPlaceholder = (s?: string) => !!s && /^\[.*\]$/.test(s.trim());
const digits = (s?: string) => (s ?? "").replace(/\D/g, "").slice(-10);

function Contacts({ o, compact = false }: { o: Official; compact?: boolean }) {
  const items = [
    o.phone && { href: `tel:+91${digits(o.phone)}`, icon: Phone, label: "Call" },
    (o.whatsapp || o.phone) && { href: `https://wa.me/91${digits(o.whatsapp || o.phone)}`, icon: MessageCircle, label: "WhatsApp" },
    o.email && { href: `mailto:${o.email}`, icon: Mail, label: "Email" },
    o.instagram && { href: `https://instagram.com/${o.instagram.replace(/^@/, "")}`, icon: Instagram, label: "Instagram" },
  ].filter(Boolean) as { href: string; icon: typeof Phone; label: string }[];
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <a key={i.label} href={i.href} target={i.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
          className={cx("inline-flex items-center gap-1.5 rounded-full border border-line bg-white text-xs font-semibold text-iris transition hover:bg-iris hover:text-white", compact ? "p-2" : "px-3 py-1.5")}
          aria-label={i.label} title={i.label}>
          <i.icon size={14} /> {!compact && i.label}
        </a>
      ))}
    </div>
  );
}

function Photo({ o, size }: { o: Official; size: number }) {
  return o.photo ? (
    <Image src={o.photo} alt={o.name} width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />
  ) : (
    <Avatar name={isPlaceholder(o.name) ? "S V" : o.name} size={size} hue={o.name.length * 41} />
  );
}

export default function TeamPage() {
  const all = [...FACULTY_COORDINATORS, ...STUDENT_COORDINATORS, ...WING_HEADS];
  const pending = all.filter((o) => isPlaceholder(o.name)).length;

  return (
    <div className="space-y-6">
      {pending > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-gold/40 bg-sand/20 p-3 text-sm">
          <Info size={16} className="mt-0.5 shrink-0 text-gold" />
          <span>{pending} names are still placeholders. Edit <code className="rounded bg-white px-1">src/lib/officials.ts</code> to add the real coordinators.</span>
        </div>
      )}

      <section className="card relative overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-sand/50 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <Image src="/svm-logo.png" alt="SVM" width={1086} height={861} className="h-24 w-auto shrink-0" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">SVM Team <Kn className="text-lg font-normal text-mute">ತಂಡ</Kn></h1>
            <p className="mt-1 text-sm leading-relaxed text-mute">{SVM_INFO.about}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs sm:justify-start">
              {!isPlaceholder(SVM_INFO.room) && <Badge color="#5c3a21"><MapPin size={11} /> {SVM_INFO.room}</Badge>}
              {!isPlaceholder(SVM_INFO.meets) && <Badge color="#5c3a21"><Clock size={11} /> {SVM_INFO.meets}</Badge>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            {SVM_INFO.whatsappGroup && <a href={SVM_INFO.whatsappGroup} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full grad-bg px-4 py-2.5 text-sm font-semibold shadow"><MessageCircle size={16} /> Join WhatsApp group</a>}
            {SVM_INFO.instagram && <a href={`https://instagram.com/${SVM_INFO.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-iris"><Instagram size={16} /> @{SVM_INFO.instagram}</a>}
            {SVM_INFO.email && <a href={`mailto:${SVM_INFO.email}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-iris"><Mail size={16} /> Email SVM</a>}
          </div>
        </div>
      </section>

      <section>
        <SectionHead title="Faculty coordinators" sub="Guides and mentors of SVM" />
        <div className="grid gap-4 md:grid-cols-2">
          {FACULTY_COORDINATORS.map((o, i) => (
            <Card key={i} className="flex items-center gap-4">
              <Photo o={o} size={76} />
              <div className="min-w-0 flex-1">
                <div className={cx("font-display text-lg font-semibold", isPlaceholder(o.name) && "italic text-mute")}>{o.name}</div>
                <div className="text-sm font-medium text-iris">{o.role}</div>
                {o.dept && <div className="text-xs text-mute">{o.dept}</div>}
                {o.note && <div className="mt-1 text-xs text-fg/80">{o.note}</div>}
                <div className="mt-2.5"><Contacts o={o} /></div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHead title="Student coordinators" sub="Reach out for events, auditions and collaborations" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STUDENT_COORDINATORS.map((o, i) => (
            <Card key={i} className="flex flex-col items-center text-center">
              <Photo o={o} size={72} />
              <div className={cx("mt-3 font-display text-base font-semibold", isPlaceholder(o.name) && "italic text-mute")}>{o.name}</div>
              <div className="text-sm font-medium text-iris">{o.role}</div>
              <div className="text-xs text-mute">{[o.dept, o.year && `Year ${o.year}`].filter(Boolean).join(" · ")}</div>
              {o.note && <div className="mt-1 text-xs text-fg/80">{o.note}</div>}
              <div className="mt-3"><Contacts o={o} compact /></div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHead title="Wing heads" sub="One go-to person for every art form" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WING_HEADS.map((o) => {
            const d = DISC_MAP[o.discipline];
            return (
              <Card key={o.discipline} className="flex items-center gap-3 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${d.color}1f` }}><DiscIcon id={d.id} size={22} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: d.color }}>{d.name} <Kn className="normal-case tracking-normal">{d.kn}</Kn></div>
                  <div className={cx("truncate font-semibold", isPlaceholder(o.name) && "italic text-mute")}>{o.name}</div>
                  <div className="text-xs text-mute">{[o.dept, o.year && `Year ${o.year}`].filter(Boolean).join(" · ")}</div>
                </div>
                <Contacts o={o} compact />
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
        <Users className="shrink-0 text-iris" size={28} />
        <div className="flex-1">
          <div className="font-display text-lg font-semibold">Want to help run SVM?</div>
          <p className="text-sm text-mute">Wing heads are picked from active members. Climb the Confidence Ladder to Performer or Mentor and message any coordinator above.</p>
        </div>
      </Card>
    </div>
  );
}
