import type { ReactElement } from "react";

// Semantic icons for the mood/genre tiles — replacing ambiguous emoji.
// Each is a distinct, recognizable silhouette at small size: a leaf, a
// spiral, a flask, a globe, a speaker, a house (with sound waves, so it
// doesn't collide with the plain HomeIcon nav glyph), a lightning bolt.
interface MoodIconProps {
  size?: number;
  color?: string;
}

export function LeafIcon({ size = 20, color = "#ff6b35" }: MoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 20c8 0 13-5 13-14-9 0-13 5-13 14z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M8 18c2-4 5-7 9-10" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export function SwirlIcon({ size = 20, color = "#ff6b35" }: MoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 12c3 0 3-4 0-4s-3 4 0 4-3 4 0 4 3-4 0-4 5-2 5 2-5 2-5 2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FlaskIcon({ size = 20, color = "#ff6b35" }: MoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <circle cx={10.5} cy={15.5} r={0.9} fill={color} />
      <circle cx={14} cy={17} r={0.7} fill={color} />
    </svg>
  );
}

export function GlobeIcon({ size = 20, color = "#ff6b35" }: MoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={1.8} />
      <ellipse cx={12} cy={12} rx={3.6} ry={8.5} stroke={color} strokeWidth={1.6} />
      <path d="M3.5 12h17" stroke={color} strokeWidth={1.6} />
    </svg>
  );
}

export function SpeakerIcon({ size = 20, color = "#9797a8" }: MoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 10h3l5-4v12l-5-4H5v-4z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M17 9c1.3 1.3 1.3 4.7 0 6M19.3 6.7c2.6 2.6 2.6 8 0 10.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export function HouseMusicIcon({ size = 20, color = "#9797a8" }: MoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 11l8-6 8 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10.5V20h12v-9.5" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M18.5 8c1 1 1 3.2 0 4.2" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

export function LightningIcon({ size = 20, color = "#9797a8" }: MoodIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M13 2 5 14h5l-1 8 8-12h-5l1-8z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

export const MOOD_ICONS: Record<string, (p: MoodIconProps) => ReactElement> = {
  organic: LeafIcon,
  psychedelic: SwirlIcon,
  experimental: FlaskIcon,
  global: GlobeIcon,
  bass: SpeakerIcon,
  house: HouseMusicIcon,
  techno: LightningIcon,
};
