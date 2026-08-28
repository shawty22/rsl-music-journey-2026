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

// "Right now" as journey-draft defaults — day/hour/minute/meridiem read off
// the device clock, rounded to the nearest quarter hour (matching the app's
// time picker granularity). Always just a starting point: every field stays
// fully editable, same as Google Maps defaulting to "current location" but
// letting you type a different one.
export function currentDraftTime(): { day: (typeof DAY_OPTIONS)[number]; hour: number; minute: number; meridiem: "AM" | "PM" } {
  const now = new Date();
  const day = DAY_OPTIONS[now.getDay()];
  let hour24 = now.getHours();
  let minute = Math.round(now.getMinutes() / 15) * 15;
  if (minute === 60) {
    minute = 0;
    hour24 = (hour24 + 1) % 24;
  }
  const meridiem: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { day, hour: hour12, minute, meridiem };
}
