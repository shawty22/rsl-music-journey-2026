// A small, deliberately bounded lookup of well-known electronic/festival
// artists to their broad genre character — used ONLY to power "derived from
// a taste-reference artist" reasons when a user adds a favorite who isn't
// playing RSL 2026 (so we have no enrichment record for them). This is a
// hand-curated hint list, not a claim of biographical fact, and it is
// intentionally small — no scraping, no ML, no external lookup.
export const KNOWN_ARTIST_GENRES: Record<string, string[]> = {
  "bonobo": ["organic electronic", "downtempo"],
  "carl cox": ["techno", "tech house"],
  "the polish ambassador": ["global bass", "organic electronic"],
  "govinda": ["organic electronic", "world fusion"],
  "desert dwellers": ["organic electronic", "world fusion"],
  "beats antique": ["global bass", "experimental electronic"],
  "gramatik": ["glitch-hop"],
  "bassnectar": ["dubstep", "bass house"],
  "griz": ["glitch-hop", "funk"],
  "odesza": ["melodic house", "experimental electronic"],
  "rufus du sol": ["melodic house", "progressive house"],
  "lane 8": ["progressive house", "melodic house"],
  "tycho": ["ambient", "downtempo"],
  "boards of canada": ["ambient", "experimental electronic"],
  "aphex twin": ["experimental electronic", "acid"],
  "four tet": ["experimental electronic", "downtempo"],
  "bicep": ["techno", "melodic house"],
  "jamie xx": ["house", "experimental electronic"],
  "disclosure": ["house", "bass house"],
  "duke dumont": ["house", "tech house"],
  "chris lake": ["tech house", "bass house"],
  "fisher": ["tech house"],
  "amelie lens": ["techno"],
  "charlotte de witte": ["techno"],
  "adam beyer": ["techno"],
  "nina kraviz": ["techno", "acid"],
  "jamie jones": ["tech house"],
  "eric prydz": ["progressive house"],
  "hernan cattaneo": ["progressive house"],
  "shpongle": ["psychedelic", "world fusion"],
  "infected mushroom": ["psytechno", "psychedelic"],
  "ott": ["psychedelic", "dubstep"],
  "android jones": ["psychedelic"],
  "opiuo": ["glitch-hop", "bass house"],
  "big gigantic": ["glitch-hop", "funk"],
  "gogo penguin": ["experimental electronic", "downtempo"],
  "emancipator": ["downtempo", "organic electronic"],
  "pretty lights": ["glitch-hop", "hip-hop"],
  "flume": ["experimental electronic", "bass house"],
  "sofi tukker": ["house", "global bass"],
  "thievery corporation": ["downtempo", "global bass"],
  "kruder & dorfameister": ["downtempo"],
  "nicolas jaar": ["experimental electronic", "downtempo"],
  "recondite": ["techno", "ambient"],
  "extrawelt": ["techno", "experimental electronic"],
  "burnt friedman": ["experimental electronic", "world fusion"],
};

export function lookupKnownArtistGenres(name: string): string[] | null {
  const key = name.trim().toLowerCase();
  return KNOWN_ARTIST_GENRES[key] ?? null;
}
