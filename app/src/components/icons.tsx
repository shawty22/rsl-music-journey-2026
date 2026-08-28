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

export function GearIcon({ size = 18, color = "#f2f2f7" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      <path
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
