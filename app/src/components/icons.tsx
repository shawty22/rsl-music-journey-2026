interface IconProps {
  size?: number;
  color?: string;
}

export function BackIcon({ size = 16, color = "#f2f2f7" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 20, color = "#0b0b12" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PinIcon({ size = 14, color = "#9797a8" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={12} cy={9} r={2.4} stroke={color} strokeWidth={2} />
    </svg>
  );
}

export function ClockIcon({ size = 14, color = "#9797a8" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShareIcon({ size = 15, color = "#f2f2f7" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={6} cy={12} r={2.4} stroke={color} strokeWidth={2} />
      <circle cx={17} cy={6} r={2.4} stroke={color} strokeWidth={2} />
      <circle cx={17} cy={18} r={2.4} stroke={color} strokeWidth={2} />
      <path d="M8.1 10.8l7-3.2M8.1 13.2l7 3.2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon({ size = 16, color = "#f2f2f7" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 11l8-6 8 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5V20h12v-9.5" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

export function PeopleIcon({ size = 14, color = "#9797a8" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={12} cy={8} r={3.2} stroke={color} strokeWidth={1.8} />
      <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

export function BookmarkIcon({ size = 14, color = "#9797a8" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 3h9l3 3v15l-6-3.5L6 21V3z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ size = 12, color = "#4fd1c5" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DerivedIcon({ size = 12, color = "#c084fc" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 18V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <circle cx={7} cy={18} r={2} stroke={color} strokeWidth={1.8} />
      <circle cx={17} cy={18} r={2} stroke={color} strokeWidth={1.8} />
    </svg>
  );
}

export function SearchIcon({ size = 16, color = "#5c5c6b" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <path d="M20 20l-4-4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function GearIcon({ size = 18, color = "#f2f2f7" }: IconProps) {
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
