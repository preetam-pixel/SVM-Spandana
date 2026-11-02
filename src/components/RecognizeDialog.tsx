"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Award, X } from "lucide-react";
import { useState } from "react";
import { RECOGNITION_TITLES } from "@/lib/club";
import { Button, cx } from "./ui";

/** Core members pick a recognition ("Backstage Hero"…) and add a personal note. */
export function RecognizeDialog({ open, name, eventTitle, initialTitle, onClose, onSubmit }: {
  open: boolean;
  name: string;
  eventTitle?: string;
  initialTitle?: string;
  onClose: () => void;
  onSubmit: (title: string, message: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(initialTitle ?? RECOGNITION_TITLES[0].title);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const first = name.split(" ")[0];

  const submit = async () => {
    setBusy(true);
    const ok = await onSubmit(title, message.trim());
    setBusy(false);
    if (ok) {
      setMessage("");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-end bg-fg/30 p-0 sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-night p-5 shadow-2xl sm:rounded-3xl"
            role="dialog" aria-label={`Recognise ${name}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-display text-lg font-semibold"><Award size={18} className="text-gold" /> Recognise {first}</div>
                <p className="text-xs text-mute">{eventTitle ? `For ${eventTitle}. ` : ""}It shows on their profile and the Wall of Fame.</p>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 text-mute hover:bg-fg/5" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {RECOGNITION_TITLES.map((r) => (
                <button key={r.title} onClick={() => setTitle(r.title)} className={cx("rounded-full border px-3 py-1.5 text-sm transition", title === r.title ? "border-iris bg-iris text-white" : "border-line bg-white hover:bg-fg/5")}>
                  {r.emoji} {r.title}
                </button>
              ))}
            </div>
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} rows={3}
              placeholder={`Say what ${first} did well (optional)`}
              className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-iris/60"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Recognise"}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
