"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { COLLAB_LINKS, DISC_MAP, STUDENTS } from "@/lib/data";

interface GNode { id: string; name: string; color: string; val: number; me?: boolean; x?: number; y?: number }
interface GLink { source: string | GNode; target: string | GNode; cross: boolean; mine?: boolean }

export default function Constellation({ myLinks = [], height = 360 }: { myLinks?: string[]; height?: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const fg = useRef<ForceGraphMethods<GNode, GLink> | undefined>(undefined);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    const active = STUDENTS.filter((s) => s.level >= 1);
    const byId = new Map(active.map((s) => [s.id, s]));
    const nodes: GNode[] = active.map((s) => ({ id: s.id, name: `${s.name} · ${DISC_MAP[s.primary].name}`, color: DISC_MAP[s.primary].color, val: 1 + s.level }));
    const links: GLink[] = COLLAB_LINKS.filter((l) => byId.has(l.source) && byId.has(l.target)).map((l) => ({
      source: l.source, target: l.target, cross: byId.get(l.source)!.primary !== byId.get(l.target)!.primary,
    }));
    if (myLinks.length) {
      nodes.push({ id: "me", name: "You", color: "#a87a26", val: 7, me: true });
      for (const id of myLinks) {
        if (!byId.has(id)) {
          const s = STUDENTS.find((x) => x.id === id);
          if (s) nodes.push({ id: s.id, name: `${s.name} · ${DISC_MAP[s.primary].name}`, color: DISC_MAP[s.primary].color, val: 1 + s.level });
        }
        links.push({ source: "me", target: id, cross: true, mine: true });
      }
    }
    return { nodes, links };
  }, [myLinks]);

  return (
    <div ref={wrap} className="relative w-full overflow-hidden rounded-2xl" style={{ height }}>
      <ForceGraph2D<GNode, GLink>
        ref={fg}
        graphData={data}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel="name"
        cooldownTicks={140}
        onEngineStop={() => fg.current?.zoomToFit(400, 30)}
        linkColor={(l) => (l.mine ? "rgba(168,122,38,0.9)" : l.cross ? "rgba(139,58,58,0.35)" : "rgba(92,58,33,0.12)")}
        linkWidth={(l) => (l.mine ? 2.5 : l.cross ? 1 : 0.6)}
        linkDirectionalParticles={(l) => (l.mine ? 3 : 0)}
        linkDirectionalParticleColor={() => "#a87a26"}
        nodeCanvasObject={(n, ctx, scale) => {
          const r = Math.sqrt(n.val) * 2.6;
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, r + (n.me ? 6 : 2.5), 0, 2 * Math.PI);
          ctx.fillStyle = `${n.color}33`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI);
          ctx.fillStyle = n.color;
          ctx.fill();
          if (n.me) {
            ctx.font = `${Math.max(10, 13 / scale)}px sans-serif`;
            ctx.fillStyle = "#a87a26";
            ctx.textAlign = "center";
            ctx.fillText("YOU", n.x!, n.y! - r - 8);
          }
        }}
      />
    </div>
  );
}
