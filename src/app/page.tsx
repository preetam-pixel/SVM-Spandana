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

export default function Landing() {
  const { ready, account, profile, loadDemo } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <main className="rangoli-dots min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-end gap-1 px-4 py-4 text-sm sm:px-6">
        <Link href="/live" className="rounded-full px-3 py-2 text-mute hover:text-fg">Live Stage</Link>
        <Link href="/cockpit" className="rounded-full border border-line bg-white/70 px-3.5 py-2 font-medium hover:bg-white">Organizer Cockpit</Link>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-14 text-center sm:px-6">
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="w-full max-w-[520px]">
          <Image src="/svm-logo.png" alt="SVM — Sangeet Vrinda x Madhyam" width={1086} height={861} priority className="h-auto w-full drop-shadow-[0_18px_30px_rgba(92,58,33,0.18)]" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <div className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-5xl">
            Spandana <Kn className="text-2xl font-normal text-mute sm:text-3xl">ಸ್ಪಂದನ</Kn>
          </div>
          <p className="mt-3 font-display text-lg italic text-iris sm:text-xl">Everyone has a spark. Find your art. Find your people.</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-mute sm:text-base">
            The home of music, dance, photography, film, art, writing, anchoring and theatre at KLE Institute of Technology.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }} className="mt-8 w-full max-w-sm">
          {ready && account ? (
            <div className="card p-5">
              <div className="text-sm text-mute">Welcome back</div>
              <div className="font-display text-xl font-semibold">{account.name}</div>
              <Button size="lg" className="mt-4 w-full" onClick={() => router.push(profile.sparkDone ? "/home" : "/spark")}>
                {profile.sparkDone ? "Continue to Spandana" : "Take your Creative Spark"} <ArrowRight size={18} />
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              <Link href="/register"><Button size="lg" className="w-full"><UserPlus size={18} /> Register</Button></Link>
              <Link href="/login"><Button size="lg" variant="soft" className="w-full bg-white"><LogIn size={18} /> Login</Button></Link>
              <button
                disabled={busy}
                onClick={async () => { setBusy(true); await loadDemo(); router.push("/home"); }}
                className="mt-1 text-sm text-mute underline-offset-4 hover:text-fg hover:underline disabled:opacity-50"
              >
                {busy ? "Opening demo…" : "Explore with a demo account →"}
              </button>
            </div>
          )}
          <p className="mt-4 text-xs text-mute">Secure sign-in with mobile OTP · <Kn>ನಿಮ್ಮ ಕಲೆ, ನಿಮ್ಮ ಜನ</Kn></p>
        </motion.div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {DISCIPLINES.map((d) => (
            <span key={d.id} className="rounded-full border border-line bg-white/70 px-3 py-1 text-xs text-iris">
              <Kn>{d.kn}</Kn> · {d.name}
            </span>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-white/50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">Built around why students stay away</h2>
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
      </section>
      <footer className="py-6 text-center text-xs text-mute">SVM · Sangeet Vrinda x Madhyam · KLE Institute of Technology, Hubballi</footer>
    </main>
  );
}
