import type { PerformanceType, Reason } from "../types";
import type { DisplayRole } from "../lib/recommend";
import { CheckIcon, ClockIcon, DerivedIcon } from "./icons";

// Signal status: a FACT about the artist (independent of any recommendation).
// Established/Emerging/Unknown, always the same three colors everywhere.
export function SignalBadge({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const s = status?.toUpperCase();
  const meta =
    s === "ESTABLISHED"
      ? { label: "Established", className: "signal-established" }
      : s === "EMERGING"
        ? { label: "Emerging", className: "signal-emerging" }
        : { label: "Unknown", className: "signal-unknown" };
  return (
    <span className={`signal-badge signal-badge-${size} ${meta.className}`}>
      <span className="signal-dot" />
      {meta.label}
    </span>
  );
}

// Discovery role: a JUDGMENT about how this recommendation fits — separate
// from signal status. isFinale appends a narrative suffix to the label
// without introducing a fourth color.
const ROLE_META: Record<DisplayRole, { label: string; className: string }> = {
  STRONG_MATCH: { label: "STRONG MATCH", className: "role-strong" },
  DISCOVERY: { label: "DISCOVERY", className: "role-discovery" },
  WILDCARD: { label: "WILDCARD", className: "role-wildcard" },
};

export function RoleBadge({ role, isFinale }: { role: DisplayRole; isFinale?: boolean }) {
  const meta = ROLE_META[role];
  return (
    <span className={`role-badge ${meta.className}`}>
      <span className="role-badge-dot" />
      {meta.label}
      {isFinale ? " · FINALE" : ""}
    </span>
  );
}

const PERF_TYPE_LABEL: Record<PerformanceType, string> = {
  DJ: "DJ",
  LIVE: "LIVE",
  HYBRID: "HYBRID",
  B2B: "B2B",
  LIVE_BAND: "LIVE BAND",
  VOCALIST: "VOCALIST",
  PERFORMANCE_MULTIMEDIA: "MULTIMEDIA",
  UNKNOWN: "TYPE UNKNOWN",
};

export function PerformanceTypeTag({ type, inline }: { type: PerformanceType; inline?: boolean }) {
  const label = type === "UNKNOWN" ? "type unknown" : PERF_TYPE_LABEL[type];
  if (inline) return <span className={type === "UNKNOWN" ? "tag-chip-dim" : undefined}>{label}</span>;
  return <span className={`tag-chip ${type === "UNKNOWN" ? "tag-chip-dim" : ""}`}>{label}</span>;
}

// A single reason, prefixed with an icon that tells the user WHERE it came
// from — never leave them guessing whether they picked this or the system did.
export function ReasonRow({ reason }: { reason: Reason }) {
  const icon =
    reason.provenance === "user_selected" ? (
      <CheckIcon size={12} color="var(--accent-2)" />
    ) : reason.provenance === "derived" ? (
      <DerivedIcon size={12} color="var(--wildcard)" />
    ) : (
      <ClockIcon size={12} color="var(--text-dim)" />
    );
  return (
    <div className="reason-row">
      {icon}
      <span>{reason.text}</span>
    </div>
  );
}
