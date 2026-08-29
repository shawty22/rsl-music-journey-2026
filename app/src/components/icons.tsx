interface IconProps {
  size?: number;
  color?: string;
}

export function BackIcon({ size = 16, color = "var(--text)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 20, color = "var(--bg)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PinIcon({ size = 14, color = "var(--text-dim)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={12} cy={9} r={2.4} stroke={color} strokeWidth={2} />
    </svg>
  );
}

export function ClockIcon({ size = 14, color = "var(--text-dim)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShareIcon({ size = 15, color = "var(--text)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={6} cy={12} r={2.4} stroke={color} strokeWidth={2} />
      <circle cx={17} cy={6} r={2.4} stroke={color} strokeWidth={2} />
      <circle cx={17} cy={18} r={2.4} stroke={color} strokeWidth={2} />
      <path d="M8.1 10.8l7-3.2M8.1 13.2l7 3.2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon({ size = 16, color = "var(--text)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 11l8-6 8 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5V20h12v-9.5" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

export function PeopleIcon({ size = 14, color = "var(--text-dim)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={12} cy={8} r={3.2} stroke={color} strokeWidth={1.8} />
      <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

export function BookmarkIcon({ size = 14, color = "var(--text-dim)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 3h9l3 3v15l-6-3.5L6 21V3z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ size = 12, color = "var(--accent-2)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DerivedIcon({ size = 12, color = "var(--wildcard)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 18V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <circle cx={7} cy={18} r={2} stroke={color} strokeWidth={1.8} />
      <circle cx={17} cy={18} r={2} stroke={color} strokeWidth={1.8} />
    </svg>
  );
}

export function SearchIcon({ size = 16, color = "var(--text-faint)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <path d="M20 20l-4-4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function PulseIcon({ size = 18, color = "var(--text)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={12} cy={12} r={2} fill={color} />
      <path d="M16.5 7.5a6.36 6.36 0 0 1 0 9" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M7.5 7.5a6.36 6.36 0 0 0 0 9" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M19.5 4.5a10.6 10.6 0 0 1 0 15" stroke={color} strokeWidth={1.8} strokeLinecap="round" opacity={0.55} />
      <path d="M4.5 4.5a10.6 10.6 0 0 0 0 15" stroke={color} strokeWidth={1.8} strokeLinecap="round" opacity={0.55} />
    </svg>
  );
}

export function RadarIcon({ size = 18, color = "var(--text)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.6} opacity={0.5} />
      <circle cx={12} cy={12} r={5.5} stroke={color} strokeWidth={1.6} opacity={0.7} />
      <path d="M12 12L12 3.5A8.5 8.5 0 0 1 20.5 12z" fill={color} opacity={0.35} />
      <circle cx={12} cy={12} r={1.6} fill={color} />
    </svg>
  );
}

export function RouteIcon({ size = 18, color = "var(--text)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={5} cy={6} r={2} stroke={color} strokeWidth={1.8} />
      <circle cx={19} cy={18} r={2} stroke={color} strokeWidth={1.8} />
      <path d="M5 8v3a4 4 0 0 0 4 4h6a4 4 0 0 1 4 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeDasharray="1 3.5" />
    </svg>
  );
}

export function HeartIcon({ size = 16, color = "var(--text-dim)", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"}>
      <path
        d="M12 20.5s-7.5-4.6-10-9.3C.5 7.8 2.3 4.5 5.7 4c2-.3 3.8.6 5 2.3 1.2-1.7 3-2.6 5-2.3 3.4.5 5.2 3.8 3.7 7.2-2.5 4.7-10 9.3-10 9.3z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GearIcon({ size = 18, color = "var(--text)" }: IconProps) {
  // An actual toothed cog silhouette (not a sun/starburst) so it doesn't get
  // mistaken for a light/dark toggle — the hub is a real cut hole via
  // evenodd fill, not a background-dependent knockout.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.51,2.62 L13.49,2.62 L14.76,5.35 L17.58,4.31 L19.69,6.42 L18.65,9.24 L21.38,10.51 L21.38,13.49 L18.65,14.76 L19.69,17.58 L17.58,19.69 L14.76,18.65 L13.49,21.38 L10.51,21.38 L9.24,18.65 L6.42,19.69 L4.31,17.58 L5.35,14.76 L2.62,13.49 L2.62,10.51 L5.35,9.24 L4.31,6.42 L6.42,4.31 L9.24,5.35 Z M15.2,12 A3.2,3.2 0 1,0 8.8,12 A3.2,3.2 0 1,0 15.2,12 Z"
        fill={color}
      />
    </svg>
  );
}
