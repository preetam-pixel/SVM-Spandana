"use client";

import { AnimatePresence, motion } from "framer-motion";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { COLLAB_LINKS, DISC_MAP, LADDER, STUDENTS } from "@/lib/data";

type Kind = "demo" | "me" | "friend";
interface GNode { id: string; name: string; sub: string; color: string; val: number; kind: Kind; x?: number; y?: number; fx?: number; fy?: number }
interface GLink { source: string | GNode; target: string | GNode; cross: boolean; mine?: boolean }

export interface ConstellationFriend { id: string; name: string; dept: string; year: number }

// Dots never shrink below ~3.5px on screen, however far the graph is zoomed out.
const radius = (n: GNode, scale: number) => Math.max(Math.sqrt(n.val) * 2.6, 3.5 / scale);

/**
 * Campus creative network. Clicking any dot asks whether to open that person's profile.
 * Real friends are drawn as named gold-ringed dots linked to "You".
 */
export default function Constellation({ myLinks = [], friends = [], height = 360 }: { myLinks?: string[]; friends?: ConstellationFriend[]; height?: number }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const fg = useRef<ForceGraphMethods<GNode, GLink> | undefined>(undefined);
  const [width, setWidth] = useState(600);
  const [pick, setPick] = useState<GNode | null>(null);

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    const active = STUDENTS.filter((s) => s.level >= 1);
    const byId = new Map(active.map((s) => [s.id, s]));
    const demoNode = (s: (typeof STUDENTS)[number]): GNode => ({
      id: s.id, name: s.name, sub: `${DISC_MAP[s.primary].name} · ${s.dept} ${s.year} yr · ${LADDER[s.level].name}`,
      color: DISC_MAP[s.primary].color, val: 1 + s.level, kind: "demo",
    });
    const nodes: GNode[] = active.map(demoNode);
    const links: GLink[] = COLLAB_LINKS.filter((l) => byId.has(l.source) && byId.has(l.target)).map((l) => ({
      source: l.source, target: l.target, cross: byId.get(l.source)!.primary !== byId.get(l.target)!.primary,
    }));
    if (myLinks.length || friends.length) {
      nodes.push({ id: "me", name: "You", sub: "Your profile", color: "#a87a26", val: 7, kind: "me", fx: 0, fy: 0 });
      for (const id of myLinks) {
        if (!byId.has(id)) {
          const s = STUDENTS.find((x) => x.id === id);
          if (s) nodes.push(demoNode(s));
        }
        links.push({ source: "me", target: id, cross: true, mine: true });
      }
      for (const f of friends) {
        nodes.push({ id: f.id, name: f.name, sub: `Friend · ${f.dept} ${f.year} yr`, color: "#5c3a21", val: 5, kind: "friend" });
        links.push({ source: "me", target: f.id, cross: true, mine: true });
      }
    }
    return { nodes, links };
  }, [myLinks, friends]);

  // Fit once the layout has roughly settled too, so dots are big enough to tap even if the
  // simulation is still drifting (onEngineStop alone can take a while on slow devices).
  useEffect(() => {
    const t = setTimeout(() => fg.current?.zoomToFit(500, 30), 1500);
    return () => clearTimeout(t);
  }, [data, width]);

  const open = (n: GNode) => router.push(n.kind === "me" ? "/profile" : `/u/${n.id}`);

  return (
    <div ref={wrap} className="relative w-full overflow-hidden rounded-2xl" style={{ height }}>
      <ForceGraph2D<GNode, GLink>
        ref={fg}
        graphData={data}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel={(n) => `${n.name} · ${n.sub}`}
        cooldownTicks={140}
        onEngineStop={() => fg.current?.zoomToFit(400, 30)}
        onNodeClick={(n) => setPick(n)}
        onBackgroundClick={() => setPick(null)}
        linkColor={(l) => (l.mine ? "rgba(168,122,38,0.9)" : l.cross ? "rgba(139,58,58,0.35)" : "rgba(92,58,33,0.12)")}
        linkWidth={(l) => (l.mine ? 2.5 : l.cross ? 1 : 0.6)}
        linkDirectionalParticles={(l) => (l.mine ? 3 : 0)}
        linkDirectionalParticleColor={() => "#a87a26"}
        nodePointerAreaPaint={(n, color, ctx, scale) => {
          // Generous hit area (at least ~11px on screen) so dots are easy to tap on phones.
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, Math.max(radius(n, scale) + 4, 11 / scale), 0, 2 * Math.PI);
          ctx.fill();
        }}
        nodeCanvasObject={(n, ctx, scale) => {
          const r = radius(n, scale);
          const selected = pick?.id === n.id;
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, r + (n.kind === "demo" ? 2.5 : 6), 0, 2 * Math.PI);
          ctx.fillStyle = `${n.color}33`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI);
          ctx.fillStyle = n.color;
          ctx.fill();
          if (n.kind === "friend" || selected) {
            ctx.lineWidth = 2 / scale;
            ctx.strokeStyle = "#a87a26";
            ctx.beginPath();
            ctx.arc(n.x!, n.y!, r + 2.5, 0, 2 * Math.PI);
            ctx.stroke();
          }
          if (n.kind !== "demo") {
            // "YOU" sits above the centre dot; friend names go below theirs so the two don't collide.
            const fontPx = Math.max(9, 12 / scale);
            const label = n.kind === "me" ? "YOU" : n.name.split(" ")[0];
            const ly = n.kind === "me" ? n.y! - r - 8 : n.y! + r + 4 + fontPx;
            ctx.font = `600 ${fontPx}px sans-serif`;
            ctx.textAlign = "center";
            ctx.lineWidth = 3 / scale;
            ctx.strokeStyle = "rgba(255,255,255,0.9)"; // halo keeps names readable over other dots
            ctx.strokeText(label, n.x!, ly);
            ctx.fillStyle = n.kind === "me" ? "#a87a26" : "#5c3a21";
            ctx.fillText(label, n.x!, ly);
          }
        }}
      />

      <AnimatePresence>
        {pick && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute inset-x-3 bottom-3 mx-auto flex max-w-md flex-col gap-2.5 rounded-2xl border border-line bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: pick.color }} />
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug">{pick.kind === "me" ? "Open your profile?" : `Open ${pick.name}'s profile?`}</div>
                <div className="truncate text-xs text-mute">{pick.sub}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1">
              <button onClick={() => setPick(null)} className="rounded-full px-3 py-2 text-xs font-semibold text-mute hover:bg-fg/5">Cancel</button>
              <button onClick={() => open(pick)} className="flex items-center gap-1.5 rounded-full grad-bg px-3.5 py-2 text-xs font-semibold shadow"><UserRound size={14} /> Open profile</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
