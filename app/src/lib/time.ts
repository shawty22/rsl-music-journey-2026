// Mirrors the overnight-sort convention used in scripts/normalize.mjs:
// PM hours sort before AM hours within the same "day_start" bucket, and AM
// hours are pushed +24h so a THU-night set list stays chronological through
// sunrise on FRI morning.

export function nightMinutesFromHour24(hour24: number, minute: number): number {
  const base = hour24 * 60 + minute;
  return hour24 < 12 ? base + 24 * 60 : base;
}

export function parseTimeInputToNightMinutes(hour12: number, minute: number, meridiem: "AM" | "PM"): number {
  let hour24: number;
  if (meridiem === "PM") hour24 = hour12 === 12 ? 12 : hour12 + 12;
  else hour24 = hour12 === 12 ? 0 : hour12;
  return nightMinutesFromHour24(hour24, minute);
}

export function formatNightMinutes(nightMinutes: number): string {
  const total = ((nightMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const meridiem = hour24 >= 12 && hour24 < 24 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}:${String(minute).padStart(2, "0")}${meridiem}`;
}

export const DAY_OPTIONS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
