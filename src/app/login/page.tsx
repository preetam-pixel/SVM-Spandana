"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, OtpStep, PhoneInput, requestOtp } from "@/components/auth/OtpFlow";
import { Button } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Account } from "@/lib/types";

export default function LoginPage() {
  const { applyAccount, toast } = useStore();
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoCode, setDemoCode] = useState<string>();

  const send = async () => {
    setBusy(true);
    setError("");
    const r = await requestOtp(phone, "login");
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDemoCode(r.demoCode);
    setStep("otp");
  };

  const verify = async (code: string) => {
    const res = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code, mode: "login" }) });
    const d = await res.json();
    if (!res.ok) return d.error as string;
    const user = d.user as Account;
    applyAccount(user);
    toast(`Welcome back, ${user.name.split(" ")[0]}!`);
    router.push(user.profile.sparkDone ? "/home" : "/spark");
    return null;
  };

  return (
    <AuthShell
      title={step === "phone" ? "Welcome back" : "Verify it's you"}
      sub={step === "phone" ? "Log in with your registered mobile number." : "Quick check, then you're in."}
      footer={<>New to Spandana? <Link href="/register" className="font-semibold text-iris hover:underline">Create an account</Link></>}
    >
      {step === "phone" ? (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (/^[6-9]\d{9}$/.test(phone)) void send(); }}>
          <PhoneInput value={phone} onChange={setPhone} autoFocus />
          {error && <p className="text-sm text-magenta">{error}</p>}
          <Button size="lg" className="w-full" disabled={!/^[6-9]\d{9}$/.test(phone) || busy}>{busy ? "Sending OTP…" : <>Send OTP <ArrowRight size={18} /></>}</Button>
          <p className="text-center text-xs text-mute">Demo account: 90000 00001</p>
        </form>
      ) : (
        <OtpStep
          phone={phone}
          demoCode={demoCode}
          onVerify={verify}
          onBack={() => setStep("phone")}
          onResend={async () => {
            const r = await requestOtp(phone, "login");
            if (r.ok) setDemoCode(r.demoCode);
            else toast(r.error, "error");
          }}
        />
      )}
    </AuthShell>
  );
}
