import { useEffect, useRef, useState, useCallback } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { GraphNode, GraphEdge } from '@nothingraph/shared';

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function GraphView() {
  const graph = useVaultStore((s) => s.graph);
  const selectNote = useVaultStore((s) => s.selectNote);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const animRef = useRef<number>();

  // Initialize positions
  useEffect(() => {
    if (!graph || graph.nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const w = size.w;
    const h = size.h;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.35;

    const initial: SimNode[] = graph.nodes.map((n, i) => {
      const angle = (i / graph.nodes.length) * Math.PI * 2;
      return {
        ...n,
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      };
    });

    setNodes(initial);
    setEdges(graph.edges);
  }, [graph, size.w, size.h]);

  // Simple force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const tick = () => {
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));

        // Repulsion between nodes
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i];
            const b = next[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = 80;
            if (dist < minDist) {
              const force = ((minDist - dist) / dist) * 0.6;
              dx *= force;
              dy *= force;
              a.vx -= dx;
              a.vy -= dy;
              b.vx += dx;
              b.vy += dy;
            }
          }
        }

        // Attraction along edges
        for (const edge of edges) {
          const a = next.find((n) => n.id === edge.source);
          const b = next.find((n) => n.id === edge.target);
          if (!a || !b) continue;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 140) * 0.01;
          dx = (dx / dist) * force;
          dy = (dy / dist) * force;
          a.vx += dx;
          a.vy += dy;
          b.vx -= dx;
          b.vy -= dy;
        }

        // Center gravity + damping + bounds
        const cx = size.w / 2;
        const cy = size.h / 2;
        for (const n of next) {
          n.vx += (cx - n.x) * 0.003;
          n.vy += (cy - n.y) * 0.003;
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x += n.vx;
          n.y += n.vy;

          // Soft bounds
          n.x = Math.max(40, Math.min(size.w - 40, n.x));
          n.y = Math.max(40, Math.min(size.h - 40, n.y));
        }

        return next;
      });

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [nodes.length, edges, size]);

  // Resize observer
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleNodeClick = useCallback(
    (id: string) => {
      selectNote(id);
    },
    [selectNote]
  );

  if (!graph) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        No graph data
      </div>
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        Vault is empty
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-zinc-800 text-sm text-zinc-400 flex items-center gap-4">
        <span>
          {graph.nodes.length} notes · {graph.edges.length} links
        </span>
        <span className="text-zinc-600">Click a node to open the note</span>
      </div>

      <div ref={canvasRef} className="flex-1 relative overflow-hidden bg-zinc-950">
        <svg width={size.w} height={size.h} className="absolute inset-0">
          {/* Edges */}
          {edges.map((edge, i) => {
            const a = nodes.find((n) => n.id === edge.source);
            const b = nodes.find((n) => n.id === edge.target);
            if (!a || !b) return null;
            const isHighlighted =
              hovered === edge.source || hovered === edge.target;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isHighlighted ? '#818cf8' : '#3f3f46'}
                strokeWidth={isHighlighted ? 2 : 1}
                opacity={isHighlighted ? 0.9 : 0.5}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isHovered = hovered === node.id;
            const radius = 12 + Math.min(node.linkCount * 2, 16);
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleNodeClick(node.id)}
              >
                <circle
                  r={radius}
                  fill={isHovered ? '#6366f1' : '#312e81'}
                  stroke={isHovered ? '#a5b4fc' : '#4f46e5'}
                  strokeWidth={2}
                />
                <text
                  y={radius + 14}
                  textAnchor="middle"
                  className="fill-zinc-300 text-[11px] pointer-events-none"
                  style={{ fontSize: 11 }}
                >
                  {node.title.length > 18
                    ? node.title.slice(0, 16) + '…'
                    : node.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
