// Real-world GPS <-> Black Rock City "clock & street" address conversion,
// built on a coordinate model derived from Burning Man's own official 2026
// GIS data (see scripts/derive-brc-geo-model.py) — not a guess. If that
// model can't be loaded, every function here degrades to returning null
// rather than inventing a position.

export interface BrcGeoModel {
  center: { lat: number; lng: number };
  rotation_deg: number; // real-world bearing (deg true north) of clock 12:00
  rings: Record<string, number>; // street letter -> radius in meters
  ring_full_names: Record<string, string>;
  city_span_clock: { start: string; end: string };
  generated_at: string;
  source: string;
}

const EARTH_R = 6371000;

function toRad(d: number) {
  return (d * Math.PI) / 180;
}
function toDeg(r: number) {
  return (r * 180) / Math.PI;
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const p1 = toRad(a.lat);
  const p2 = toRad(b.lat);
  const dphi = toRad(b.lat - a.lat);
  const dlmb = toRad(b.lng - a.lng);
  const h = Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dlmb / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

export function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const p1 = toRad(a.lat);
  const p2 = toRad(b.lat);
  const dlmb = toRad(b.lng - a.lng);
  const y = Math.sin(dlmb) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dlmb);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Destination point given a start point, bearing, and distance (spherical geodesic).
export function destinationPoint(start: { lat: number; lng: number }, bearingDegrees: number, distanceM: number): { lat: number; lng: number } {
  const dR = distanceM / EARTH_R;
  const brng = toRad(bearingDegrees);
  const p1 = toRad(start.lat);
  const l1 = toRad(start.lng);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(dR) + Math.cos(p1) * Math.sin(dR) * Math.cos(brng));
  const l2 = l1 + Math.atan2(Math.sin(brng) * Math.sin(dR) * Math.cos(p1), Math.cos(dR) - Math.sin(p1) * Math.sin(p2));
  return { lat: toDeg(p2), lng: toDeg(l2) };
}

// Parses a free-typed or RSL-sourced "2:35 & B" style address into its
// clock/street parts. Returns null for non-clock-address strings (deep
// playa descriptions, camp names) rather than guessing.
// The geo model keys the Esplanade ring as "ESP" (matching official GIS
// data); the source location strings spell it out — normalize so ring
// lookups actually match.
function normalizeStreetCode(street: string): string {
  const s = street.toUpperCase();
  return s === "ESPLANADE" ? "ESP" : s;
}

export function parseClockStreetAddress(raw: string): { clock: string; street: string } | null {
  const s = raw.trim();
  // "3:00 & E" — the common order.
  const clockFirst = s.match(/^(\d{1,2}:\d{2})\s*&\s*([A-Za-z]+)$/);
  if (clockFirst) return { clock: clockFirst[1], street: normalizeStreetCode(clockFirst[2]) };
  // "Esplanade & 5:45" — same address, reversed order (real, common in the
  // source data — not a typo to special-case away).
  const streetFirst = s.match(/^([A-Za-z]+)\s*&\s*(\d{1,2}:\d{2})$/);
  if (streetFirst) return { clock: streetFirst[2], street: normalizeStreetCode(streetFirst[1]) };
  return null;
}

export function parseClockPosition(clock: string): number | null {
  const m = clock.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10) % 12;
  const min = parseInt(m[2], 10);
  return h + min / 60;
}

export function formatClockPosition(decimalHours: number): string {
  let h = Math.floor(decimalHours);
  const min = Math.round((decimalHours - h) * 60);
  let mm = min;
  if (mm === 60) {
    mm = 0;
    h += 1;
  }
  if (h === 0) h = 12;
  if (h > 12) h -= 12;
  return `${h}:${String(mm).padStart(2, "0")}`;
}

// BRC clock/street address -> real-world lat/lng.
export function brcAddressToLatLng(model: BrcGeoModel, clock: string, street: string): { lat: number; lng: number } | null {
  const hours = parseClockPosition(clock);
  if (hours === null) return null;
  const radius = model.rings[street.toUpperCase()];
  if (radius === undefined) return null;
  const bearing = (hours * 30 + model.rotation_deg + 360) % 360;
  return destinationPoint(model.center, bearing, radius);
}

export interface ApproxAddress {
  clock: string;
  street: string;
  streetFullName: string;
  distanceFromCenterM: number;
  insideEsplanade: boolean;
  beyondCity: boolean;
}

// Real-world lat/lng -> nearest approximate BRC clock/street address.
// Always labeled approximate — nearest known ring, clock rounded to the
// nearest quarter hour (matching how RSL addresses are actually written).
export function latLngToBrcAddress(model: BrcGeoModel, point: { lat: number; lng: number }): ApproxAddress {
  const distance = haversineMeters(model.center, point);
  const bearing = bearingDeg(model.center, point);
  const rawHours = ((bearing - model.rotation_deg + 360) % 360) / 30;
  const roundedHours = Math.round(rawHours * 4) / 4; // nearest 15 min
  const clock = formatClockPosition(roundedHours === 0 ? 12 : roundedHours);

  let nearestStreet = "ESP";
  let nearestDelta = Infinity;
  for (const [letter, radius] of Object.entries(model.rings)) {
    const delta = Math.abs(radius - distance);
    if (delta < nearestDelta) {
      nearestDelta = delta;
      nearestStreet = letter;
    }
  }

  const maxRadius = Math.max(...Object.values(model.rings));
  const minRadius = Math.min(...Object.values(model.rings));

  return {
    clock,
    street: nearestStreet,
    streetFullName: model.ring_full_names[nearestStreet] ?? nearestStreet,
    distanceFromCenterM: Math.round(distance),
    insideEsplanade: distance < minRadius,
    beyondCity: distance > maxRadius + 200,
  };
}

export function metersToWalkMinutes(m: number): number {
  return Math.round(m / 80); // ~80 m/min walking pace on playa terrain
}

// Plain BRC-native walking directions — the two moves the grid is actually
// built from (in/out along a street's ring, and around along the clock arc)
// rather than a raw compass bearing, which isn't how anyone navigates BRC
// on foot.
export function describeWalkingDirection(
  model: BrcGeoModel,
  youClock: string,
  youStreet: string,
  nextClock: string,
  nextStreet: string,
): { radial: string; angular: string } | null {
  const youHours = parseClockPosition(youClock);
  const nextHours = parseClockPosition(nextClock);
  const youR = model.rings[youStreet.toUpperCase()];
  const nextR = model.rings[nextStreet.toUpperCase()];
  if (youHours === null || nextHours === null || youR === undefined || nextR === undefined) return null;

  // Plain street letter, not the ring's full name — "D" reads faster on
  // foot than "Delphi" when you're trying to just get somewhere.
  const nextStreetLetter = nextStreet.toUpperCase();
  const radiusDeltaM = Math.round(Math.abs(nextR - youR));
  const radial = radiusDeltaM < 20 ? `You're already on ${nextStreetLetter}` : `≈${radiusDeltaM}m ${nextR > youR ? "outward" : "inward, toward the Man"} to ${nextStreetLetter}`;

  let delta = nextHours - youHours;
  while (delta <= -6) delta += 12;
  while (delta > 6) delta -= 12;
  const nextClockLabel = formatClockPosition(nextHours);
  const angular = Math.abs(delta) < 0.2 ? `You're already near ${nextClockLabel}` : `walk ${delta > 0 ? "clockwise" : "counterclockwise"} to ${nextClockLabel}`;

  return { radial, angular };
}
