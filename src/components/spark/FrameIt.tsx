"use client";

import { Crop } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui";

const W = 600;
const H = 400;
const SUBJECT = { x: 430, y: 262 }; // the boat
const HORIZON = 232;
const CW = 300;
const CH = 200;

function Scene({ viewBox = `0 0 ${W} ${H}` }: { viewBox?: string }) {
  return (
    <svg viewBox={viewBox} className="block h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b1c5a" />
          <stop offset="0.55" stopColor="#ff5e7e" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8a5b" stopOpacity="0.7" />
          <stop offset="1" stopColor="#1b1035" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sky)" />
      <circle cx="150" cy="200" r="38" fill="#ffe29a" opacity="0.95" />
      <path d="M0 232 L70 180 L140 215 L220 165 L310 222 L380 190 L470 226 L540 196 L600 220 L600 232 Z" fill="#2a1240" opacity="0.85" />
      <path d="M40 232 L40 206 L52 196 L52 186 L60 178 L68 186 L68 196 L80 206 L80 232 Z" fill="#1d0c30" />
      <rect y={HORIZON} width={W} height={H - HORIZON} fill="url(#lake)" />
      {[248, 264, 282, 304].map((y, i) => <rect key={y} x={120 - i * 6} y={y} width={60 + i * 12} height="3" rx="1.5" fill="#ffe29a" opacity={0.5 - i * 0.1} />)}
      <g transform={`translate(${SUBJECT.x - 30} ${SUBJECT.y - 34})`}>
        <path d="M0 30 L60 30 L50 42 L10 42 Z" fill="#120822" />
        <path d="M30 0 L30 30 L52 30 Z" fill="#fff4e0" />
        <path d="M28 6 L28 30 L12 30 Z" fill="#ffd8a8" />
        <rect x="29" y="0" width="2" height="31" fill="#120822" />
      </g>
      <path d="M260 120 l8 5 l8 -5 M290 104 l6 4 l6 -4 M232 140 l6 4 l6 -4" stroke="#2a1240" strokeWidth="2" fill="none" />
    </svg>
  );
}

function scoreFrame(cx: number, cy: number) {
  const rx = (SUBJECT.x - cx) / CW;
  const ry = (SUBJECT.y - cy) / CH;
  if (rx < 0 || rx > 1 || ry < 0 || ry > 1) return { score: 12, rx, ry };
  const pts = [[1 / 3, 1 / 3], [2 / 3, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 2 / 3]];
  const d = Math.min(...pts.map(([px, py]) => Math.hypot(rx - px, ry - py)));
  const subj = Math.max(15, 100 - d * 260);
  const hz = (HORIZON - cy) / CH;
  const hd = Math.min(Math.abs(hz - 1 / 3), Math.abs(hz - 2 / 3));
  const horizon = hz < 0 || hz > 1 ? 30 : Math.max(30, 100 - hd * 300);
  return { score: Math.round(subj * 0.8 + horizon * 0.2), rx, ry };
}

export function FrameIt({ onDone }: { onDone: (score: number) => void }) {
  const [pos, setPos] = useState({ x: 150, y: 100 }); // crop top-left in scene units
  const [result, setResult] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const onDown = (e: React.PointerEvent) => {
    if (result !== null) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !box.current) return;
    const k = W / box.current.clientWidth;
    const x = Math.max(0, Math.min(W - CW, drag.current.ox + (e.clientX - drag.current.sx) * k));
    const y = Math.max(0, Math.min(H - CH, drag.current.oy + (e.clientY - drag.current.sy) * k));
    setPos({ x, y });
  };
  const onUp = () => { drag.current = null; };

  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="font-display text-2xl font-semibold">Frame the shot</h2>
      <p className="mt-1 text-sm text-mute">Drag the frame to compose the best photo of this lake at sunset. Trust your eye.</p>

      <div ref={box} className="relative mx-auto mt-5 aspect-[3/2] w-full touch-none overflow-hidden rounded-2xl border border-line select-none">
        <Scene />
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="absolute cursor-grab border-2 border-white active:cursor-grabbing"
          style={{ left: `${(pos.x / W) * 100}%`, top: `${(pos.y / H) * 100}%`, width: `${(CW / W) * 100}%`, height: `${(CH / H) * 100}%`, boxShadow: "0 0 0 9999px rgba(8,4,18,0.62)" }}
        >
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-fg/25" />)}
          </div>
          <Crop size={16} className="pointer-events-none absolute -left-2 -top-2 rounded bg-white p-0.5 text-fg" />
        </div>
      </div>

      {result === null ? (
        <Button className="mt-5" onClick={() => setResult(scoreFrame(pos.x, pos.y).score)}>Lock my frame</Button>
      ) : (
        <div className="mt-5 grid items-center gap-4 sm:grid-cols-[200px_1fr]">
          <div className="mx-auto aspect-[3/2] w-48 overflow-hidden rounded-xl border border-line">
            <Scene viewBox={`${pos.x} ${pos.y} ${CW} ${CH}`} />
          </div>
          <div className="text-left">
            <div className="font-display text-4xl font-bold">{result}<span className="text-base text-mute"> / 100</span></div>
            <p className="mt-1 text-sm text-mute">
              {result > 78 ? "You placed the subject on a power point of the rule of thirds, the way pro photographers do." : result > 55 ? "Good instinct! Try placing the boat where the grid lines cross." : "Centred framing is common. Photographers often place subjects on the thirds for more drama."}
            </p>
            <Button className="mt-3" onClick={() => onDone(result)}>Continue →</Button>
          </div>
        </div>
      )}
    </div>
  );
}
