import { useMemo } from "react";
import { HomeIcon, BackIcon } from "../components/icons";
import { useGeolocation } from "../lib/useGeolocation";
import { useCompassHeading } from "../lib/useCompassHeading";
import {
  type BrcGeoModel,
  parseClockStreetAddress,
  parseClockPosition,
  brcAddressToLatLng,
  latLngToBrcAddress,
  haversineMeters,
  bearingDeg,
  metersToWalkMinutes,
} from "../lib/geo";

function polarToXY(clockHours: number, radiusFrac: number, center: number, maxR: number) {
  // 12:00 = up, clockwise, matching standard map/clock convention.
  const angle = (clockHours / 12) * 2 * Math.PI - Math.PI / 2;
  return { x: center + Math.cos(angle) * radiusFrac * maxR, y: center + Math.sin(angle) * radiusFrac * maxR };
}

export function PlayaMapScreen({
  geoModel,
  startAddress,
  nextStopAddress,
  nextStopLabel,
  onBack,
  onHome,
}: {
  geoModel: BrcGeoModel | null;
  startAddress: string;
  nextStopAddress: string | null;
  nextStopLabel: string;
  onBack: () => void;
  onHome: () => void;
}) {
  const gps = useGeolocation(true);
  const compass = useCompassHeading(true);

  const startParsed = parseClockStreetAddress(startAddress);
  const nextParsed = nextStopAddress ? parseClockStreetAddress(nextStopAddress) : null;

  const gpsAddress = useMemo(() => {
    if (!gps.position || !geoModel) return null;
    return latLngToBrcAddress(geoModel, gps.position);
  }, [gps.position, geoModel]);

  // "You" defaults to GPS-derived address when available, else the manually
  // entered start address — never invented.
  const youClock = gpsAddress?.clock ?? startParsed?.clock ?? null;
  const youStreet = gpsAddress?.street ?? startParsed?.street ?? null;

  const bearingAndDistance = useMemo(() => {
    if (!geoModel || !youClock || !youStreet || !nextParsed) return null;
    const you = brcAddressToLatLng(geoModel, youClock, youStreet);
    const next = brcAddressToLatLng(geoModel, nextParsed.clock, nextParsed.street);
    if (!you || !next) return null;
    return { distanceM: haversineMeters(you, next), bearing: bearingDeg(you, next) };
  }, [geoModel, youClock, youStreet, nextParsed]);

  const arrowRotation = bearingAndDistance !== null && compass.heading !== null ? (bearingAndDistance.bearing - compass.heading + 360) % 360 : null;

  const size = 280;
  const center = size / 2;
  const maxR = size / 2 - 24;

  const youHours = youClock ? parseClockPosition(youClock) : null;
  const nextHours = nextParsed ? parseClockPosition(nextParsed.clock) : null;
  const youRadiusFrac = youStreet && geoModel ? Math.min(1, geoModel.rings[youStreet] / Math.max(...Object.values(geoModel.rings))) : 0.5;
  const nextRadiusFrac = nextParsed && geoModel ? Math.min(1, geoModel.rings[nextParsed.street] / Math.max(...Object.values(geoModel.rings))) : 0.5;

  const youXY = youHours !== null ? polarToXY(youHours, youRadiusFrac, center, maxR) : null;
  const nextXY = nextHours !== null ? polarToXY(nextHours, nextRadiusFrac, center, maxR) : null;

  return (
    <div className="screen">
      <div className="screen-top">
        <div className="nav-cluster">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
          <button className="icon-btn" onClick={onHome} aria-label="Home">
            <HomeIcon />
          </button>
        </div>
        <span className="wordmark">PLAYA MAP</span>
        <div className="icon-btn-spacer" />
      </div>

      <div className="map-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {[0.35, 0.6, 0.8, 1].map((f) => (
            <circle key={f} cx={center} cy={center} r={f * maxR} fill="none" stroke="var(--border)" strokeWidth={1} />
          ))}
          <line x1={center} y1={center - maxR - 10} x2={center} y2={center + maxR + 10} stroke="var(--border)" strokeWidth={1} />
          <line x1={center - maxR - 10} y1={center} x2={center + maxR + 10} y2={center} stroke="var(--border)" strokeWidth={1} />
          <text x={center} y={center - maxR - 16} textAnchor="middle" fontSize="11" fill="var(--text-faint)" fontWeight="700">
            12:00
          </text>
          <text x={center} y={center + maxR + 26} textAnchor="middle" fontSize="11" fill="var(--text-faint)" fontWeight="700">
            6:00
          </text>

          {youXY && nextXY && <line x1={youXY.x} y1={youXY.y} x2={nextXY.x} y2={nextXY.y} stroke="var(--wildcard)" strokeWidth={1.5} strokeDasharray="4 4" />}

          {youXY && (
            <g>
              <circle cx={youXY.x} cy={youXY.y} r={7} fill="var(--text)" />
              <text x={youXY.x} y={youXY.y - 12} textAnchor="middle" fontSize="11" fill="var(--text)" fontWeight="800">
                YOU
              </text>
            </g>
          )}
          {nextXY && (
            <g>
              <circle cx={nextXY.x} cy={nextXY.y} r={7} fill="var(--accent-2)" />
              <text x={nextXY.x} y={nextXY.y - 12} textAnchor="middle" fontSize="11" fill="var(--accent-2)" fontWeight="800">
                NEXT
              </text>
            </g>
          )}
        </svg>

        {arrowRotation !== null && (
          <div className="compass-arrow" style={{ transform: `rotate(${arrowRotation}deg)` }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v14M12 3l-5 6M12 3l5 6" stroke="var(--accent)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      <div className="map-status">
        {gps.state === "requesting" && <div className="empty">Finding your location…</div>}
        {gps.state === "denied" && <div className="empty">Location unavailable — showing your entered start point instead.</div>}
        {gpsAddress && (
          <div className="map-you-line">
            📍 You're near <b>{gpsAddress.clock} &amp; {gpsAddress.street}</b> ({gpsAddress.streetFullName})
            {gpsAddress.beyondCity && " — beyond the city grid"}
          </div>
        )}
        {!gps.position && startParsed && (
          <div className="map-you-line">
            📍 Starting point: <b>{startAddress}</b>
          </div>
        )}
      </div>

      {bearingAndDistance && (
        <div className="map-distance-card">
          <div className="map-distance-main">
            ~{Math.round(bearingAndDistance.distanceM)}m · {metersToWalkMinutes(bearingAndDistance.distanceM)} min walk
          </div>
          <div className="map-distance-sub">to {nextStopLabel}</div>
        </div>
      )}

      {compass.state === "needs_request" && (
        <button className="btn-secondary" onClick={compass.requestPermission}>
          Enable compass
        </button>
      )}
      {compass.state === "unsupported" && <div className="empty">Compass not available on this device — direction shown on the map above.</div>}

      <div className="map-source-note">Real 2026 Black Rock City geometry (Golden Spike + street layout, Burning Man Innovate GIS data).</div>
    </div>
  );
}
