import { useState } from "react";

// Renders nothing if the artist has no sourced photo (most of the 1033
// unknown-signal roster doesn't) — no broken-image icon, no placeholder box,
// just quietly absent so list/detail layouts don't shift or look broken.
export function ArtistPhoto({ artistId, alt, className }: { artistId: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img className={className} src={`images/artists/${artistId}.jpg`} alt={alt} onError={() => setFailed(true)} />;
}
