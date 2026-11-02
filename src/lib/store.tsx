"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_PROFILE } from "./data";
import { levelFor } from "./engine";
import type { Account, Contribution, Profile } from "./types";

interface Toast {
  id: number;
  text: string;
  tone: "good" | "info" | "level" | "error";
}

interface Store {
  ready: boolean;
  /** False when the Supabase keys are missing from .env. */
  configured: boolean;
  account: Account | null;
  profile: Profile;
  update: (fn: (p: Profile) => Profile) => void;
  addContribution: (c: Omit<Contribution, "date">) => void;
  /** Saves account columns (name, usn, bio…). Returns an error message or null. */
  saveAccount: (fields: Partial<Omit<Account, "profile" | "id" | "phone">>) => Promise<string | null>;
  applyAccount: (a: Account | null) => void;
  loadDemo: (as?: "student" | "core") => Promise<string | null>;
  logout: () => Promise<void>;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevLevel = useRef<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Profile | null>(null);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const applyAccount = useCallback((a: Account | null) => {
    prevLevel.current = null; // switching accounts is not a level-up
    setAccount(a);
    setProfile(a ? a.profile : EMPTY_PROFILE);
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(d.configured !== false);
        applyAccount(d.user ?? null);
      })
      .catch(() => applyAccount(null))
      .finally(() => setReady(true));
  }, [applyAccount]);

  // Debounced save of engagement state to the database.
  const flush = useCallback(() => {
    if (!pending.current) return;
    const body = JSON.stringify({ profile: pending.current });
    pending.current = null;
    fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body }).catch(() => {});
  }, []);

  const update = useCallback(
    (fn: (p: Profile) => Profile) => {
      setProfile((prev) => {
        const next = fn(prev);
        const withLevel = { ...next, level: levelFor(next) };
        pending.current = withLevel;
        return withLevel;
      });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, 400);
    },
    [flush],
  );

  useEffect(() => {
    if (!ready) return;
    if (prevLevel.current !== null && profile.level > prevLevel.current && profile.sparkDone) {
      setTimeout(() => toast("Level up! You climbed the Confidence Ladder", "level"), 400);
    }
    prevLevel.current = profile.level;
  }, [profile.level, profile.sparkDone, ready, toast]);

  const addContribution = useCallback(
    (c: Omit<Contribution, "date">) => {
      const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      update((p) =>
        c.ref && p.contributions.some((x) => x.ref === c.ref)
          ? p // already counted (e.g. unmask, mask again, unmask)
          : {
              ...p,
              contributions: [{ ...c, date }, ...p.contributions],
              stamps: c.discipline && !p.stamps.includes(c.discipline) ? [...p.stamps, c.discipline] : p.stamps,
              streakWeeks: Math.max(1, p.streakWeeks),
            },
      );
    },
    [update],
  );

  const saveAccount = useCallback(async (fields: Partial<Omit<Account, "profile" | "id" | "phone">>) => {
    const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) });
    const d = await res.json();
    if (!res.ok) return d.error ?? "Couldn't save";
    setAccount(d.user);
    setProfile((p) => ({ ...p, name: d.user.name, dept: d.user.dept, year: d.user.year }));
    return null;
  }, []);

  const loadDemo = useCallback(async (as: "student" | "core" = "student") => {
    const res = await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ as }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.user) return (d.error as string) ?? "Couldn't open the demo account";
    applyAccount(d.user);
    return null;
  }, [applyAccount]);

  const logout = useCallback(async () => {
    flush();
    await fetch("/api/auth/logout", { method: "POST" });
    applyAccount(null);
  }, [applyAccount, flush]);

  const value = useMemo(
    () => ({ ready, configured, account, profile, update, addContribution, saveAccount, applyAccount, loadDemo, logout, toasts, toast }),
    [ready, configured, account, profile, update, addContribution, saveAccount, applyAccount, loadDemo, logout, toasts, toast],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
