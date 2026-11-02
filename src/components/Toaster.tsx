"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";

const STYLE = {
  good: "border-aqua/40 text-aqua",
  info: "border-line text-fg",
  level: "border-gold/50 text-gold",
  error: "border-magenta/40 text-magenta",
};
const ICON = { good: CheckCircle2, info: Info, level: Trophy, error: AlertCircle };

export function Toaster() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm font-medium shadow-xl shadow-iris/10 ${STYLE[t.tone]}`}
            >
              <Icon size={16} />
              {t.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
