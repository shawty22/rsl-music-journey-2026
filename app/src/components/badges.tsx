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
const ROLE_META: Record<DisplayRole, { emoji: string; label: string; className: string }> = {
  STRONG_MATCH: { emoji: "⭐", label: "STRONG MATCH", className: "role-strong" },
  DISCOVERY: { emoji: "🧭", label: "DISCOVERY", className: "role-discovery" },
  WILDCARD: { emoji: "🧪", label: "WILDCARD", className: "role-wildcard" },
};

export function RoleBadge({ role, isFinale }: { role: DisplayRole; isFinale?: boolean }) {
  const meta = ROLE_META[role];
  return (
    <span className={`role-badge ${meta.className}`}>
      {meta.emoji} {meta.label}
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

export function PerformanceTypeTag({ type }: { type: PerformanceType }) {
  if (type === "UNKNOWN") return <span className="tag-chip tag-chip-dim">Type unknown</span>;
  return <span className="tag-chip">{PERF_TYPE_LABEL[type]}</span>;
}

// A single reason, prefixed with an icon that tells the user WHERE it came
// from — never leave them guessing whether they picked this or the system did.
export function ReasonRow({ reason }: { reason: Reason }) {
  const icon =
    reason.provenance === "user_selected" ? (
      <CheckIcon size={12} color="#4fd1c5" />
    ) : reason.provenance === "derived" ? (
      <DerivedIcon size={12} color="#c084fc" />
    ) : (
      <ClockIcon size={12} color="#9797a8" />
    );
  return (
    <div className="reason-row">
      {icon}
      <span>{reason.text}</span>
    </div>
  );
}
