export type SignalTier = "ESTABLISHED" | "EMERGING" | "UNKNOWN";

export type PerformanceType =
  | "DJ"
  | "LIVE"
  | "HYBRID"
  | "B2B"
  | "LIVE_BAND"
  | "VOCALIST"
  | "PERFORMANCE_MULTIMEDIA"
  | "UNKNOWN";

export type DiscoveryRole = "CORE_MATCH" | "ADJACENT" | "WILDCARD" | "MAJOR_ACT" | "LOCAL_GEM" | "UNKNOWN";

export interface Artist {
  artist_id: string;
  artist: string;
  artist_normalized: string;
  appearance_count: number | null;

  artist_type: string | null;
  gender_identity: string | null;
  country: string | null;
  state_region: string | null;
  city: string | null;
  origin_type: string | null;
  current_base: string | null;
  home_scene: string | null;

  genre_tags: string[];
  style_tags: string[];
  performance_type: PerformanceType;
  instruments: string[];
  languages: string[];

  career_stage: string | null;
  labels: string | null;
  notable_releases: string | null;
  notable_collaborations: string | null;
  bio: string | null;

  signal_status: string;
  spotify_found: string | null;
  soundcloud_found: string | null;
  bandcamp_found: string | null;
  apple_music_found: string | null;
  catalogue_signal: string | null;
  external_signal: string | null;

  website: string | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  bandcamp_url: string | null;
  apple_music_url: string | null;

  rsl_recommended: boolean;
  bipoc_beats_artist: boolean;
  bipoc_beats_friend: boolean;
  live_music_stage: boolean;
  mutant_vehicle: boolean;
  wheelchair_friendly: boolean;

  camp_affiliations: string[];
  burning_man_history: string | null;

  discovery_character: string | null;
  discovery_note: string | null;

  research_confidence: string;
  sources: string[];
  last_verified: string | null;
}

export interface Performance {
  performance_id: string;
  artist_id: string;
  artist_display_name: string;

  day_raw: string;
  day_start: string | null;
  day_end: string | null;

  set_time_raw: string;
  set_time_valid: boolean;
  set_time_hour24: number | null;
  set_time_minute: number | null;
  global_sort_key: number | null;

  overall_event_time: string | null;

  camp: string;
  event: string | null;
  theme: string | null;
  location: string | null;
  stage: string | null;

  performance_type: PerformanceType;
  rsl_flags: string[];

  source_page: number | null;
  source_text: string | null;

  is_possible_duplicate: boolean;
  duplicate_group_size: number | null;
}

export interface Location {
  location_string: string;
  normalized_location: string;
  address_components: { clock: string; street: string } | null;
  latitude: number | null;
  longitude: number | null;
  location_type: "clock_address" | "deep_playa" | "named_area";
  performance_count: number;
}

export interface Taxonomy {
  genre_tags: string[];
  performance_types: PerformanceType[];
  signal_tiers: SignalTier[];
  discovery_roles: DiscoveryRole[];
  gender_identities: string[];
  rsl_flags: string[];
  electronic_bias_weights: Record<string, string[]>;
  discovery_mix_defaults: {
    strong_match_weight: number;
    adjacent_weight: number;
    wildcard_weight: number;
  };
}

// A taste-reference artist: someone a user can add as a favorite even though
// they're NOT in the RSL 2026 lineup (e.g. Bonobo, Carl Cox). Enough
// lightweight metadata to inform genre matching — not a claim of biography.
export interface TasteReference {
  artist: string;
  genres: string[];
  styles: string[];
  performance_characteristics: PerformanceType[];
  country: string | null;
  scene: string | null;
}

export interface DatasetMetadata {
  dataset_version: string;
  source: string;
  generated_at: string;
  record_count: number;
  artist_count: number;
  camp_count: number;
  enrichment_status: string;
}

export interface TasteProfile {
  favorite_artists: string[];
  favorite_genres: string[];
  favorite_styles: string[];
  preferred_performance_types: PerformanceType[];
  discovery_level: number; // 0-1, higher = more adjacent/wildcard
  wildcard_level: number; // 0-1
  max_travel_minutes: number;
  major_act_preference: "avoid" | "neutral" | "seek";
  live_hybrid_preference: "avoid" | "neutral" | "seek";
  avoid_genres: string[];
}

// Where a recommendation reason came from — shown to the user so they're
// never confused about whether they picked something or the system inferred
// it. user_selected = they picked this exact genre/artist/preference.
// derived = inferred from a taste-reference artist they added (one that
// isn't playing RSL 2026). system = a broader heuristic (signal tier,
// electronic bias, RSL flags).
export type ReasonProvenance = "user_selected" | "derived" | "system";

export interface Reason {
  text: string;
  provenance: ReasonProvenance;
}

export interface ScoredRecommendation {
  performance: Performance;
  artist: Artist;
  role: DiscoveryRole;
  reasons: Reason[];
  score: number;
}

export interface SavedJourney {
  id: string;
  created_at: string;
  day: string;
  start_time_label: string;
  duration_hours: number;
  stops: ScoredRecommendation[];
}
