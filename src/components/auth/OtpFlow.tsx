"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MessageSquareText, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

export function AuthShell({ title, sub, children, footer }: { title: string; sub: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="rangoli-dots grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mx-auto mb-6 block w-44"><Image src="/svm-logo.png" alt="SVM" width={1086} height={861} priority className="h-auto w-full" /></Link>
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-mute">{sub}</p>
          <div className="mt-6">{children}</div>
        </div>
        <div className="mt-5 text-center text-sm text-mute">{footer}</div>
      </div>
    </main>
  );
}

export function PhoneInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">Mobile number</span>
      <div className="flex overflow-hidden rounded-xl border border-line bg-white focus-within:border-iris/60">
        <span className="grid place-items-center border-r border-line bg-panel2 px-3 text-sm font-semibold text-iris">+91</span>
        <input
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          maxLength={10}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="98450 12345"
          className="w-full bg-transparent px-3 py-3 tracking-wider outline-none"
        />
      </div>
    </label>
  );
}

/** Six-box OTP entry with paste support, resend timer and demo-mode code display. */
export function OtpStep({ phone, demoCode, onVerify, onResend, onBack }: {
  phone: string;
  demoCode?: string;
  onVerify: (code: string) => Promise<string | null>;
  onResend: () => Promise<void>;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(30);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const submit = async (code: string) => {
    setBusy(true);
    setError("");
    const err = await onVerify(code);
    setBusy(false);
    if (err) {
      setError(err);
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    }
  };

  const set = (i: number, v: string) => {
    const chars = v.replace(/\D/g, "");
    if (!chars) {
      setDigits((d) => d.map((x, k) => (k === i ? "" : x)));
      return;
    }
    const next = [...digits];
    for (let k = 0; k < chars.length && i + k < 6; k++) next[i + k] = chars[k];
    setDigits(next);
    const focus = Math.min(5, i + chars.length);
    refs.current[focus]?.focus();
    if (next.every(Boolean)) void submit(next.join(""));
  };

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-mute hover:text-fg"><ArrowLeft size={14} /> Change number</button>
      <p className="text-sm">Enter the 6-digit code sent to <b>+91 {phone.slice(0, 5)} {phone.slice(5)}</b></p>

      {demoCode && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-start gap-3 rounded-2xl border border-gold/40 bg-sand/25 p-3">
          <MessageSquareText size={18} className="mt-0.5 shrink-0 text-gold" />
          <div className="text-sm">
            <div className="font-semibold">SVM: Your Spandana OTP is <span className="font-mono tracking-widest">{demoCode}</span></div>
            <div className="text-xs text-mute">Demo mode: no SMS provider is configured, so the code is shown here.</div>
          </div>
        </motion.div>
      )}

      <div className="mt-5 flex justify-between gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={6}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }}
            className="h-14 w-12 rounded-xl border border-line bg-white text-center font-display text-2xl font-bold outline-none focus:border-iris focus:ring-2 focus:ring-iris/15"
          />
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-magenta">{error}</p>}

      <Button size="lg" className="mt-5 w-full" disabled={busy || !digits.every(Boolean)} onClick={() => submit(digits.join(""))}>
        <ShieldCheck size={18} /> {busy ? "Verifying…" : "Verify & continue"}
      </Button>
      <div className="mt-4 text-center text-sm text-mute">
        {wait > 0 ? <>Resend code in {wait}s</> : (
          <button className="font-semibold text-iris hover:underline" onClick={async () => { await onResend(); setWait(30); setDigits(["", "", "", "", "", ""]); }}>Resend OTP</button>
        )}
      </div>
    </div>
  );
}

export async function requestOtp(phone: string, mode: "login" | "register") {
  const res = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, mode }) });
  const d = await res.json();
  return res.ok ? { ok: true as const, demoCode: d.demoCode as string | undefined } : { ok: false as const, error: d.error as string };
}
