import { useCallback, useEffect, useRef, useState } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracyM: number;
}

export type GeoPermissionState = "idle" | "requesting" | "granted" | "denied" | "unsupported";

// Only watches position while `active` is true (e.g. the Playa Map screen is
// open) — per the brief, don't continuously consume location/battery when
// navigation isn't in use.
export function useGeolocation(active: boolean) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [state, setState] = useState<GeoPermissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setState("unsupported");
      return;
    }
    setState("requesting");
    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState("granted");
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy });
      },
      (err) => {
        setState("denied");
        setError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }, []);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (active) start();
    else stop();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { position, state, error, requestAgain: start };
}
