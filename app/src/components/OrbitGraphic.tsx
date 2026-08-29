import { useId } from "react";

// Purely decorative — a slow-turning gold core with two orbiting accent
// dots, matching the reference mockup's Journey-screen flourish. Carries no
// data/meaning of its own (nothing here is computed from the user's taste),
// so it never risks implying a fact that isn't real.
export function OrbitGraphic({ size = 180 }: { size?: number }) {
  const gradId = useId();
  const c = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="orbit-graphic">
      <defs>
        <radialGradient id={`orbit-core-${gradId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbe7ab" />
          <stop offset="45%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="rgba(243, 200, 91, 0)" />
        </radialGradient>
        <radialGradient id={`orbit-halo-${gradId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(243, 200, 91, 0.12)" />
          <stop offset="100%" stopColor="rgba(243, 200, 91, 0)" />
        </radialGradient>
      </defs>

      <circle cx={c} cy={c} r={size * 0.48} fill={`url(#orbit-halo-${gradId})`} />
      <circle cx={c} cy={c} r={size * 0.42} fill="none" stroke="rgba(243, 200, 91, 0.16)" strokeWidth={1} />
      <circle cx={c} cy={c} r={size * 0.3} fill="none" stroke="rgba(243, 200, 91, 0.24)" strokeWidth={1} />
      <circle cx={c} cy={c} r={size * 0.15} fill={`url(#orbit-core-${gradId})`} />

      <g className="orbit-spin-slow" style={{ transformOrigin: `${c}px ${c}px` }}>
        <circle cx={c + size * 0.42} cy={c} r={3.5} fill="var(--wildcard)" />
      </g>
      <g className="orbit-spin-fast" style={{ transformOrigin: `${c}px ${c}px` }}>
        <circle cx={c} cy={c - size * 0.3} r={3} fill="var(--accent-2)" />
      </g>
    </svg>
  );
}
