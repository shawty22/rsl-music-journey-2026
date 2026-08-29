import { useRef, useState } from "react";
import { parseClockPosition, type BrcGeoModel } from "../lib/geo";
import type { DisplayRole } from "../lib/recommend";

export interface MapStopMarker {
  key: string;
  clock: string;
  street: string;
  label: string;
  role: DisplayRole;
  isNext?: boolean;
  onSelect?: () => void;
}

const ROLE_COLOR: Record<DisplayRole, string> = {
  STRONG_MATCH: "var(--accent-2)",
  DISCOVERY: "var(--accent)",
  WILDCARD: "var(--wildcard)",
};

function polarToXY(clockHours: number, radiusFrac: number, center: number, maxR: number) {
  // 12:00 = up, clockwise, matching standard map/clock convention.
  const angle = (clockHours / 12) * 2 * Math.PI - Math.PI / 2;
  return { x: center + Math.cos(angle) * radiusFrac * maxR, y: center + Math.sin(angle) * radiusFrac * maxR };
}

// Shared clock-diagram renderer behind both the Home mini-map and the full
// Playa Map screen — one visual language for "where things are" everywhere
// in the app. `interactive` adds touch drag-to-pan + pinch/wheel-to-zoom
// (hand-rolled, no map SDK — this is a schematic clock diagram, not a real
// tile map).
export function PlayaMapCanvas({
  geoModel,
  you,
  stops,
  size = 280,
  interactive = false,
}: {
  geoModel: BrcGeoModel | null;
  you: { clock: string; street: string } | null;
  stops: MapStopMarker[];
  size?: number;
  interactive?: boolean;
}) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (!interactive) return;
    // setPointerCapture can throw (e.g. "no active pointer with the given
    // id") depending on how the pointer session started — never let that
    // abort the rest of the handler, or dragging silently stops working.
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // capture is a nice-to-have (keeps the drag going if the finger
      // leaves the element); the pan/zoom logic below works without it.
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragRef.current = { lastX: e.clientX, lastY: e.clientY };
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      pinchRef.current = { startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), startScale: transform.scale };
      dragRef.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!interactive || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scale = Math.min(3, Math.max(0.6, pinchRef.current.startScale * (dist / pinchRef.current.startDist)));
      setTransform((t) => ({ ...t, scale }));
    } else if (pointers.current.size === 1 && dragRef.current) {
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current = { lastX: e.clientX, lastY: e.clientY };
      setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!interactive) return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 1) {
      const [p] = Array.from(pointers.current.values());
      dragRef.current = { lastX: p.x, lastY: p.y };
    } else {
      dragRef.current = null;
    }
  }

  function onWheel(e: React.WheelEvent) {
    if (!interactive) return;
    setTransform((t) => ({ ...t, scale: Math.min(3, Math.max(0.6, t.scale - e.deltaY * 0.001)) }));
  }

  // Every offset below is tuned for the full-size (280px) map; scale
  // proportionally so the same component also works as a small compact
  // preview (the Home mini-map) without labels clipping against the edge.
  const scale = size / 280;
  const margin = 24 * scale;
  const center = size / 2;
  const maxR = size / 2 - margin;
  const compact = size < 200;
  const markerR = Math.max(3.5, 7 * scale);
  const markerRSmall = Math.max(3, 5.5 * scale);
  const fontMain = Math.max(8, 11 * scale);
  const fontSmall = Math.max(7.5, 9.5 * scale);

  const youHours = you ? parseClockPosition(you.clock) : null;
  const youRadiusFrac = you && geoModel ? Math.min(1, geoModel.rings[you.street] / Math.max(...Object.values(geoModel.rings))) : 0.5;
  const youXY = youHours !== null ? polarToXY(youHours, youRadiusFrac, center, maxR) : null;

  const plottedStops = stops.map((s) => {
    const hours = parseClockPosition(s.clock);
    const radiusFrac = geoModel ? Math.min(1, geoModel.rings[s.street] / Math.max(...Object.values(geoModel.rings))) : 0.5;
    const xy = hours !== null ? polarToXY(hours, radiusFrac, center, maxR) : null;
    return { ...s, hours, xy };
  });

  const allHours = [youHours, ...plottedStops.map((s) => s.hours)];
  const hoursNear = (target: number) => allHours.some((h) => h !== null && Math.min(Math.abs(h - target), 12 - Math.abs(h - target)) < 0.75);
  const hide12 = hoursNear(0);
  const hide6 = hoursNear(6);

  const pathPoints = [youXY, ...plottedStops.map((s) => s.xy)].filter((p): p is { x: number; y: number } => p !== null);

  return (
    <div
      className={`map-canvas-wrap ${interactive ? "map-canvas-interactive" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center center" }}
      >
        {[0.35, 0.6, 0.8, 1].map((f) => (
          <circle key={f} cx={center} cy={center} r={f * maxR} fill="none" stroke="var(--border)" strokeWidth={1} />
        ))}
        <line x1={center} y1={center - maxR - 10 * scale} x2={center} y2={center + maxR + 10 * scale} stroke="var(--border)" strokeWidth={1} />
        <line x1={center - maxR - 10 * scale} y1={center} x2={center + maxR + 10 * scale} y2={center} stroke="var(--border)" strokeWidth={1} />
        {!compact && !hide12 && (
          <text x={center} y={center - maxR - 16 * scale} textAnchor="middle" fontSize={fontMain} fill="var(--text-faint)" fontWeight="700">
            12:00
          </text>
        )}
        {!compact && !hide6 && (
          <text x={center} y={center + maxR + 26 * scale} textAnchor="middle" fontSize={fontMain} fill="var(--text-faint)" fontWeight="700">
            6:00
          </text>
        )}

        {pathPoints.length > 1 && (
          <polyline
            points={pathPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--text-faint)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}

        {youXY && (
          <g>
            <circle cx={youXY.x} cy={youXY.y} r={markerR} fill="var(--text)" />
            {!compact && (
              <text x={youXY.x} y={youXY.y - 12 * scale} textAnchor="middle" fontSize={fontMain} fill="var(--text)" fontWeight="800">
                YOU
              </text>
            )}
          </g>
        )}

        {plottedStops.map(
          (s) =>
            s.xy && (
              <g key={s.key} onClick={s.onSelect} style={{ cursor: s.onSelect ? "pointer" : "default" }}>
                {s.isNext ? (
                  <circle cx={s.xy.x} cy={s.xy.y} r={markerR} fill={ROLE_COLOR[s.role]} />
                ) : (
                  <circle cx={s.xy.x} cy={s.xy.y} r={markerRSmall} fill="var(--bg)" stroke={ROLE_COLOR[s.role]} strokeWidth={2} />
                )}
                {!compact && (
                  <text
                    x={s.xy.x}
                    y={s.xy.y - (s.isNext ? 12 : 11) * scale}
                    textAnchor="middle"
                    fontSize={s.isNext ? fontMain : fontSmall}
                    fill={ROLE_COLOR[s.role]}
                    fontWeight="800"
                  >
                    {s.isNext ? "NEXT" : s.label}
                  </text>
                )}
              </g>
            ),
        )}
      </svg>

      {interactive && (transform.x !== 0 || transform.y !== 0 || transform.scale !== 1) && (
        <button className="map-recenter-btn" onClick={() => setTransform({ x: 0, y: 0, scale: 1 })} aria-label="Recenter map">
          ⌖
        </button>
      )}
    </div>
  );
}
