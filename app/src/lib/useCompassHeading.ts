import { useCallback, useEffect, useRef, useState } from "react";

export type CompassPermissionState = "idle" | "needs_request" | "requesting" | "granted" | "denied" | "unsupported";

interface DeviceOrientationEventIOS {
  requestPermission?: () => Promise<"granted" | "denied">;
}

// True compass heading in degrees (0 = north, 90 = east), where supported.
// iOS Safari exposes `webkitCompassHeading` directly on 'deviceorientation'
// events and requires an explicit user-gesture permission request. Android/
// other browsers use the 'deviceorientationabsolute' event's `alpha`.
// Falls back to unsupported rather than guessing — no compass arrow is shown
// when we can't get a real heading.
export function useCompassHeading(active: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [state, setState] = useState<CompassPermissionState>("idle");
  const handlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  const iosCtor = window.DeviceOrientationEvent as unknown as (DeviceOrientationEventIOS & typeof DeviceOrientationEvent) | undefined;
  const needsIOSPermission = typeof iosCtor?.requestPermission === "function";

  const attach = useCallback(() => {
    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    const handler = (e: DeviceOrientationEvent) => {
      const webkitHeading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === "number") {
        setHeading(webkitHeading);
      } else if (e.alpha !== null && (e.absolute || eventName === "deviceorientationabsolute")) {
        setHeading((360 - e.alpha) % 360);
      }
    };
    handlerRef.current = handler;
    window.addEventListener(eventName, handler as EventListener);
    setState("granted");
  }, []);

  const requestPermission = useCallback(async () => {
    if (!window.DeviceOrientationEvent) {
      setState("unsupported");
      return;
    }
    if (needsIOSPermission) {
      setState("requesting");
      try {
        const result = await iosCtor!.requestPermission!();
        if (result === "granted") attach();
        else setState("denied");
      } catch {
        setState("denied");
      }
    } else {
      attach();
    }
  }, [attach, iosCtor, needsIOSPermission]);

  useEffect(() => {
    if (!active) {
      if (handlerRef.current) {
        window.removeEventListener("deviceorientation", handlerRef.current as EventListener);
        window.removeEventListener("deviceorientationabsolute", handlerRef.current as EventListener);
        handlerRef.current = null;
      }
      return;
    }
    if (!window.DeviceOrientationEvent) {
      setState("unsupported");
      return;
    }
    if (needsIOSPermission) {
      setState("needs_request"); // must be triggered by a user tap
    } else {
      attach();
    }
    return () => {
      if (handlerRef.current) {
        window.removeEventListener("deviceorientation", handlerRef.current as EventListener);
        window.removeEventListener("deviceorientationabsolute", handlerRef.current as EventListener);
        handlerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { heading, state, requestPermission };
}
