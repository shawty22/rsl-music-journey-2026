import { PulseIcon, RadarIcon, RouteIcon, BookmarkIcon, PinIcon } from "./icons";

export type PrimaryTab = "now" | "radar" | "journey" | "saved" | "map";

const TABS: { key: PrimaryTab; label: string; Icon: typeof PulseIcon }[] = [
  { key: "now", label: "Now", Icon: PulseIcon },
  { key: "radar", label: "Radar", Icon: RadarIcon },
  { key: "journey", label: "Journey", Icon: RouteIcon },
  { key: "saved", label: "Saved", Icon: BookmarkIcon },
  { key: "map", label: "Map", Icon: PinIcon },
];

// Persistent primary navigation — always visible on the 5 tab-root screens.
// Active state is never color-alone: the active tab also gets a filled
// background chip and bold label weight.
export function BottomNav({ active, onSelect }: { active: PrimaryTab; onSelect: (tab: PrimaryTab) => void }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ key, label, Icon }) => {
        const isActive = key === active;
        return (
          <button key={key} className={`bottom-nav-item ${isActive ? "bottom-nav-item-active" : ""}`} onClick={() => onSelect(key)} aria-current={isActive}>
            <span className="bottom-nav-icon">
              <Icon size={20} color={isActive ? "#ff6b35" : "#9797a8"} />
            </span>
            <span className="bottom-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
