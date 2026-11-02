"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PublicProfileView } from "@/components/PublicProfileView";
import { Shimmer } from "@/components/ui";
import { demoProfile, isDemoId } from "@/lib/people-client";
import { useStore } from "@/lib/store";
import type { FriendStatus, MaskPost, PublicProfile } from "@/lib/types";

interface Loaded { person: PublicProfile; status: FriendStatus; friends?: number; mutual?: number; works?: MaskPost[]; canRecognise?: boolean; canChangeRole?: boolean }

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { account } = useStore();
  const myId = account?.id;
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch(`/api/people/${id}`)
      .then(async (r) => ({ ok: r.ok, d: await r.json() }))
      .then(({ ok, d }) => (ok ? setData(d) : setError(d.error ?? "Profile not found")))
      .catch(() => setError("Couldn't load this profile"));
  }, [id]);

  useEffect(() => {
    if (myId && id === myId) {
      router.replace("/profile");
      return;
    }
    if (isDemoId(id)) {
      const person = demoProfile(id);
      if (person) setData({ person, status: "none" });
      else setError("Profile not found");
      return;
    }
    setData(null);
    setError("");
    load();
  }, [id, myId, router, load]);

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-mute hover:text-fg"><ArrowLeft size={15} /> Back</button>
      {error ? <div className="card p-8 text-center text-mute">{error}</div> : !data ? <div className="card p-6"><Shimmer lines={6} /></div> : <PublicProfileView {...data} onChanged={load} />}
    </div>
  );
}
