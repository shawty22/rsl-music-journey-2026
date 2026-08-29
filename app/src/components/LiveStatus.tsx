import { useEffect, useState } from "react";
import { useGeolocation } from "../lib/useGeolocation";
import { latLngToBrcAddress, type BrcGeoModel } from "../lib/geo";
import { formatLiveClock } from "../lib/time";
import { PinIcon, ClockIcon } from "./icons";

// A persistent "where and when am I" readout — macOS-menu-bar style — so you
// never have to remember what day/time it is or type your location by hand.
// Ticks off the device clock; location comes from live GPS reverse-geocoded
// through the real BRC geometry model, never guessed.
export function LiveStatusBar({ geoModel }: { geoModel: BrcGeoModel | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const gps = useGeolocation(true);
  const addr = gps.position && geoModel ? latLngToBrcAddress(geoModel, gps.position) : null;

  let locationText: string;
  if (addr && !addr.beyondCity) locationText = `${addr.clock} & ${addr.street}`;
  else if (addr && addr.beyondCity) locationText = "Outside city grid";
  else if (gps.state === "requesting") locationText = "Locating…";
  else locationText = "Location off";

  return (
    <div className="live-status-bar">
      <span className="live-status-item">
        <ClockIcon size={12} color="var(--text-dim)" />
        {formatLiveClock(now)}
      </span>
      <span className="live-status-item">
        <PinIcon size={12} color="var(--accent)" />
        {locationText}
      </span>
    </div>
  );
}
