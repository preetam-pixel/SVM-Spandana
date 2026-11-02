"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Clock, EyeOff, Gamepad2, LogIn, Medal, UserPlus, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Kn } from "@/components/ui";
import { DISCIPLINES } from "@/lib/data";
import { useStore } from "@/lib/store";

const FEATURES = [
  { icon: Gamepad2, q: "“I don't have any talent.”", a: "Creative Spark finds hidden talent through 3 minutes of play: rhythm, pitch, framing, words. No forms, no auditions." },
  { icon: EyeOff, q: "“What if people judge me?”", a: "Mask Mode lets you share photos, music and reels anonymously, and unmask only when you feel ready." },
  { icon: Clock, q: "“I don't have time, exams.”", a: "Timetable-aware micro-gigs of 20–45 minutes. Exam Mode pauses your streak, so there's no guilt." },
  { icon: Users, q: "“I don't know anyone there.”", a: "AI Squad Builder puts you in a cross-branch team where your skill fills a real gap." },
  { icon: Medal, q: "“What's in it for me?”", a: "Kala Passport and a verified Cultural Portfolio. Backstage work counts as much as the spotlight." },
  { icon: BarChart3, q: "“Who even shows up?”", a: "The Organizer Cockpit finds engagement gaps and dormant talent, then plans events with AI." },
];

function DemoLink({ busy, onClick, className = "" }: { busy: boolean; onClick: () => void; className?: string }) {
  return (
    <button disabled={busy} onClick={onClick} className={`font-semibold text-iris underline-offset-4 hover:underline disabled:opacity-50 ${className}`}>
      {busy ? "Opening demo…" : "Explore with a demo account →"}
    </button>
  );
}

// Sampled from the artwork so the page continues its parchment seamlessly.
const PARCHMENT = "#f8c556";
const glass = "border border-[#8b5a2b]/25 bg-[#fff8ea]/85 backdrop-blur-md";

export default function Landing() {
  const { ready, configured, account, profile, loadDemo, toast } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const openDemo = async () => {
    setBusy(true);
    const err = await loadDemo();
    setBusy(false);
    if (err) toast(err, "error");
    else router.push("/home");
  };

  return (
    <main className="min-h-dvh" style={{ background: PARCHMENT }}>
      {/* ---------- Hero: the Sangeeta Vrinda artwork ---------- */}
      <section className="relative isolate overflow-hidden wide:h-dvh wide:min-h-[680px]">
        {/* Wide screens: artwork fills the whole hero */}
        <Image
          src="/sangeeta-vrinda.webp"
          alt="Sangeeta Vrinda: classical dancers, musicians and Nataraja on parchment"
          fill
          priority
          sizes="100vw"
          className="-z-10 hidden object-cover object-center wide:block"
        />
        {/* Gentle vignette, plus a warm glow at the bottom so the card reads clearly */}
        <div className="pointer-events-none absolute inset-0 -z-10 hidden bg-[radial-gradient(ellipse_at_50%_45%,transparent_60%,rgba(92,58,33,0.22))] wide:block" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 hidden h-[34%] bg-gradient-to-t from-[#f8c556]/90 via-[#f8c556]/40 to-transparent wide:block" />

        {/* Above the banner on phones; floating over the artwork's top corner on wide screens */}
        <header className="relative z-20 flex justify-end gap-2 px-3 py-2.5 text-xs sm:px-6 sm:text-sm wide:absolute wide:inset-x-0 wide:top-0 wide:py-4">
          <Link href="/live" className={`${glass} rounded-full px-3 py-1.5 font-medium text-iris shadow-sm hover:bg-[#fff8ea]`}>Live Stage</Link>
          <Link href="/cockpit" className={`${glass} rounded-full px-3.5 py-1.5 font-semibold text-fg shadow-sm hover:bg-[#fff8ea]`}>Organizer Cockpit</Link>
        </header>

        {/* Narrow / portrait screens: show the full artwork as a banner */}
        <div className="relative wide:hidden">
          <Image src="/sangeeta-vrinda.webp" alt="Sangeeta Vrinda: classical dancers, musicians and Nataraja on parchment" width={1672} height={940} priority sizes="100vw" className="h-auto w-full" />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#f8c556] to-transparent" />
        </div>

        {/* Welcome card: sits under the music staff on wide screens, below the banner on phones */}
        <div className="relative z-10 px-4 pb-10 pt-2 wide:absolute wide:inset-x-0 wide:bottom-[2.5vh] wide:p-0 wide:px-6">
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className={`${glass} mx-auto max-w-[860px] rounded-[1.75rem] p-5 shadow-[0_24px_60px_-24px_rgba(59,36,22,0.6)] sm:p-6 wide:px-6 wide:py-4`}
          >
            <div className="flex flex-col items-center gap-4 text-center wide:flex-row wide:gap-6 wide:text-left">
              <Image src="/svm-logo.png" alt="SVM — Sangeet Vrinda x Madhyam" width={1086} height={861} className="h-24 w-auto shrink-0 wide:h-[88px]" />

              <div className="min-w-0 flex-1">
                <div className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  Spandana <Kn className="text-xl font-normal text-mute sm:text-2xl">ಸ್ಪಂದನ</Kn>
                </div>
                <p className="mt-1 font-display text-base italic text-iris sm:text-lg">Everyone has a spark. Find your art. Find your people.</p>
                <p className="mt-1.5 text-xs leading-relaxed text-mute sm:text-[13px]">
                  The home of music, dance, photography, film, art, writing, anchoring and theatre at KLE Institute of Technology.
                  <span className="hidden wide:inline"> · Secure sign-in with mobile OTP</span>
                </p>
              </div>

              <div className="w-full shrink-0 wide:w-52">
                {ready && account ? (
                  <div className="text-center">
                    <div className="text-xs text-mute">Welcome back</div>
                    <div className="truncate font-display text-lg font-semibold">{account.name}</div>
                    <Button size="lg" className="mt-2 w-full" onClick={() => router.push(profile.sparkDone ? "/home" : "/spark")}>
                      {profile.sparkDone ? "Continue" : "Take the Spark"} <ArrowRight size={18} />
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2 wide:gap-1.5">
                    <Link href="/register"><Button size="lg" className="w-full wide:py-2.5"><UserPlus size={18} /> Register</Button></Link>
                    <Link href="/login"><Button size="lg" variant="soft" className="w-full bg-white/90 wide:py-2.5"><LogIn size={18} /> Login</Button></Link>
                    <DemoLink busy={busy} className="hidden text-center text-[11px] wide:block" onClick={openDemo} />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-[#8b5a2b]/15 pt-3 text-xs text-mute sm:flex-row wide:hidden">
              <span>Secure sign-in with mobile OTP · <Kn>ನಿಮ್ಮ ಕಲೆ, ನಿಮ್ಮ ಜನ</Kn></span>
              {!(ready && account) && <DemoLink busy={busy} onClick={openDemo} />}
            </div>
            {ready && !configured && (
              <div className="mt-3 rounded-xl border border-magenta/30 bg-white p-3 text-left text-xs text-magenta">
                <b>Database not connected.</b> Add the Supabase keys to <code>.env</code> and run <code>supabase/schema.sql</code> (see README).
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ---------- Below the fold ---------- */}
      <section className="relative border-t border-[#8b5a2b]/20 bg-[#fbf2df]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f8c556]/45 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap justify-center gap-2">
            {DISCIPLINES.map((d) => (
              <span key={d.id} className="rounded-full border border-[#8b5a2b]/20 bg-white/80 px-3 py-1 text-xs text-iris">
                <Kn>{d.kn}</Kn> · {d.name}
              </span>
            ))}
          </div>
          <h2 className="mt-10 text-center font-display text-2xl font-semibold sm:text-3xl">Built around why students stay away</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-mute">Most club apps list events and rank winners. Spandana is built for the shy majority who've never stepped on a stage.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((b, i) => (
              <motion.div key={b.q} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="card p-5">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-sand/40 text-iris">
                  <b.icon size={20} />
                </div>
                <div className="font-display text-lg font-semibold">{b.q}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-mute">{b.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <footer className="relative pb-6 text-center text-xs text-mute">SVM · Sangeet Vrinda x Madhyam · KLE Institute of Technology, Hubballi</footer>
      </section>
    </main>
  );
}
