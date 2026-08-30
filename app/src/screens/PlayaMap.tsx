import { useMemo } from "react";
import { HomeIcon, BackIcon } from "../components/icons";
import { PlayaMapCanvas, type MapStopMarker } from "../components/PlayaMapCanvas";
import { useGeolocation } from "../lib/useGeolocation";
import { useCompassHeading } from "../lib/useCompassHeading";
import { toDisplayRole } from "../lib/recommend";
import {
  type BrcGeoModel,
  parseClockStreetAddress,
  brcAddressToLatLng,
  latLngToBrcAddress,
  haversineMeters,
  bearingDeg,
  metersToWalkMinutes,
  describeWalkingDirection,
} from "../lib/geo";
import type { ScoredRecommendation } from "../types";

export function PlayaMapScreen({
  geoModel,
  startAddress,
  stops,
  actNumberOffset = 0,
  onSelectStop,
  onBack,
  onHome,
}: {
  geoModel: BrcGeoModel | null;
  startAddress: string;
  // The remaining route, in order — stops[0] is the immediate next stop.
  // Reused for both "show this one act on the map" (length 1) and "show the
  // rest of tonight's journey" (length N) so there's one map data contract.
  stops: ScoredRecommendation[];
  actNumberOffset?: number;
  onSelectStop?: (index: number) => void;
  onBack: () => void;
  onHome: () => void;
}) {
  const gps = useGeolocation(true);
  const compass = useCompassHeading(true);

  const startParsed = parseClockStreetAddress(startAddress);
  const next = stops[0] ?? null;
  const nextParsed = next?.performance.location ? parseClockStreetAddress(next.performance.location) : null;

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
    const nextPoint = brcAddressToLatLng(geoModel, nextParsed.clock, nextParsed.street);
    if (!you || !nextPoint) return null;
    return { distanceM: haversineMeters(you, nextPoint), bearing: bearingDeg(you, nextPoint) };
  }, [geoModel, youClock, youStreet, nextParsed]);

  const arrowRotation = bearingAndDistance !== null && compass.heading !== null ? (bearingAndDistance.bearing - compass.heading + 360) % 360 : null;

  const walkingDirection = useMemo(() => {
    if (!geoModel || !youClock || !youStreet || !nextParsed) return null;
    return describeWalkingDirection(geoModel, youClock, youStreet, nextParsed.clock, nextParsed.street);
  }, [geoModel, youClock, youStreet, nextParsed]);

  const markers: MapStopMarker[] = stops
    .map((s, i): MapStopMarker | null => {
      const parsed = s.performance.location ? parseClockStreetAddress(s.performance.location) : null;
      if (!parsed) return null;
      return {
        key: s.performance.performance_id,
        clock: parsed.clock,
        street: parsed.street,
        label: i === 0 ? "NEXT" : `ACT ${actNumberOffset + i + 1}`,
        role: toDisplayRole(s.role),
        isNext: i === 0,
        onSelect: onSelectStop ? () => onSelectStop(i) : undefined,
      };
    })
    .filter((m): m is MapStopMarker => m !== null);

  return (
    <div className="screen">
      <div className="screen-top">
        <div className="nav-cluster">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
          <button className="icon-btn icon-btn-labeled" onClick={onHome} aria-label="Home">
            <HomeIcon />
            <span className="icon-btn-label">Home</span>
          </button>
        </div>
        <span className="wordmark">PLAYA MAP</span>
        <div className="icon-btn-spacer" />
      </div>

      <div className="map-wrap">
        <PlayaMapCanvas
          geoModel={geoModel}
          you={youClock && youStreet ? { clock: youClock, street: youStreet } : null}
          stops={markers}
          interactive
        />

        {arrowRotation !== null && (
          <div className="compass-block">
            <div className="walk-this-way">WALK THIS WAY</div>
            <div className="compass-arrow" style={{ transform: `rotate(${arrowRotation}deg)` }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v14M12 3l-5 6M12 3l5 6" stroke="var(--accent)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
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

      {bearingAndDistance && next && (
        <div className="map-distance-card">
          <div className="map-distance-main">
            ~{Math.round(bearingAndDistance.distanceM)}m · {metersToWalkMinutes(bearingAndDistance.distanceM)} min walk
          </div>
          <div className="map-distance-sub">
            to {next.artist.artist} at {next.performance.camp}
            {next.performance.location ? ` · ${next.performance.location}` : ""}
          </div>
          {walkingDirection && (
            <div className="map-directions">
              <div>{walkingDirection.angular}</div>
              <div>{walkingDirection.radial}</div>
            </div>
          )}
        </div>
      )}

      {stops.length > 1 && <div className="map-route-note">Showing the rest of tonight's route — tap a stop to jump to it.</div>}

      {compass.state === "needs_request" && (
        <button className="btn-secondary" onClick={compass.requestPermission}>
          Enable compass
        </button>
      )}
      {compass.state === "unsupported" && <div className="empty">Compass not available on this device — direction shown on the map above.</div>}

      <div className="map-source-note">Real 2026 Black Rock City geometry (Golden Spike + street layout, Burning Man Innovate GIS data).</div>

      <div className="bottom-nav-spacer" />
    </div>
  );
}
