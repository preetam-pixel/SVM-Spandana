"use client";

import { Check, Clock, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { friendAction, type FriendAction } from "@/lib/people-client";
import { useStore } from "@/lib/store";
import type { FriendStatus } from "@/lib/types";

/** Add / requested / accept-decline / friends button that keeps its own status in sync with the server. */
export function FriendButton({ userId, name, status: initial, size = "sm", onChange }: {
  userId: string;
  name: string;
  status: FriendStatus;
  size?: "sm" | "md";
  onChange?: (s: FriendStatus) => void;
}) {
  const { toast } = useStore();
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => setStatus(initial), [initial]); // follow fresh data from the parent
  const first = name.split(" ")[0];

  const run = async (action: FriendAction, done: string) => {
    setBusy(true);
    const r = await friendAction(userId, action);
    setBusy(false);
    if (r.error || !r.status) return toast(r.error ?? "Something went wrong", "error");
    setStatus(r.status);
    onChange?.(r.status);
    toast(done, r.status === "friends" ? "good" : "info");
  };

  if (status === "self") return null;
  if (status === "friends")
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-aqua/10 px-3 py-1.5 text-xs font-semibold text-aqua"><UserCheck size={14} /> Friends</span>
        <button disabled={busy} onClick={() => confirm(`Remove ${first} from your friends?`) && run("remove", `Removed ${first}`)} className="rounded-full p-1.5 text-mute hover:bg-fg/5 hover:text-magenta" aria-label="Remove friend"><UserMinus size={15} /></button>
      </div>
    );
  if (status === "incoming")
    return (
      <div className="flex gap-1.5">
        <Button size={size} disabled={busy} onClick={() => run("accept", `You and ${first} are now friends 🎉`)}><Check size={14} /> Accept</Button>
        <Button size={size} variant="soft" disabled={busy} onClick={() => run("decline", "Request declined")} aria-label="Decline"><X size={14} /></Button>
      </div>
    );
  if (status === "outgoing")
    return (
      <Button size={size} variant="soft" disabled={busy} onClick={() => run("cancel", "Request cancelled")} title="Cancel request">
        <Clock size={14} /> Requested
      </Button>
    );
  return (
    <Button size={size} disabled={busy} onClick={() => run("request", `Friend request sent to ${first}`)}>
      <UserPlus size={14} /> Add friend
    </Button>
  );
}
