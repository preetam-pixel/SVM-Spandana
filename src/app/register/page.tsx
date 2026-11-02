"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, OtpStep, PhoneInput, requestOtp } from "@/components/auth/OtpFlow";
import { Button } from "@/components/ui";
import { DEPTS } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { Dept } from "@/lib/types";

export default function RegisterPage() {
  const { applyAccount, toast } = useStore();
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [usn, setUsn] = useState("");
  const [dept, setDept] = useState<Dept>("CSE");
  const [year, setYear] = useState(1);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoCode, setDemoCode] = useState<string>();

  const send = async () => {
    setBusy(true);
    setError("");
    const r = await requestOtp(phone, "register");
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDemoCode(r.demoCode);
    setStep("otp");
  };

  const verify = async (code: string) => {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, mode: "register", details: { name, usn, dept, year } }),
    });
    const d = await res.json();
    if (!res.ok) return d.error as string;
    applyAccount(d.user);
    toast("Mobile verified. Welcome to Spandana!");
    router.push("/spark");
    return null;
  };

  const valid = name.trim().length >= 2 && /^[6-9]\d{9}$/.test(phone) && agree;

  return (
    <AuthShell
      title={step === "details" ? "Create your account" : "Verify your mobile"}
      sub={step === "details" ? "Join SVM's creative community in under a minute." : "We'll never share your number."}
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-iris hover:underline">Log in</Link></>}
    >
      {step === "details" ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ananya Kulkarni" className="w-full rounded-xl border border-line bg-white px-3 py-3 outline-none focus:border-iris/60" />
          </label>
          <PhoneInput value={phone} onChange={setPhone} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">USN <span className="font-normal text-mute">(optional)</span></span>
            <input value={usn} onChange={(e) => setUsn(e.target.value.toUpperCase())} maxLength={12} placeholder="University seat number" className="w-full rounded-xl border border-line bg-white px-3 py-3 uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal focus:border-iris/60" />
          </label>
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="mb-1.5 block text-sm font-medium">Branch</span>
              <select value={dept} onChange={(e) => setDept(e.target.value as Dept)} className="w-full rounded-xl border border-line bg-white px-3 py-3 outline-none">
                {DEPTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="w-32">
              <span className="mb-1.5 block text-sm font-medium">Year</span>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full rounded-xl border border-line bg-white px-3 py-3 outline-none">
                {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </label>
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-mute">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#5c3a21]" />
            I agree to keep feedback kind and respect other creators' work.
          </label>
          {error && <p className="text-sm text-magenta">{error}</p>}
          <Button size="lg" className="w-full" disabled={!valid || busy} onClick={send}>{busy ? "Sending OTP…" : <>Send OTP <ArrowRight size={18} /></>}</Button>
        </div>
      ) : (
        <OtpStep
          phone={phone}
          demoCode={demoCode}
          onVerify={verify}
          onBack={() => setStep("details")}
          onResend={async () => {
            const r = await requestOtp(phone, "register");
            if (r.ok) setDemoCode(r.demoCode);
            else toast(r.error, "error");
          }}
        />
      )}
    </AuthShell>
  );
}
