import type { Artist, DatasetMetadata, Location, Performance, TasteReference, Taxonomy } from "../types";
import type { BrcGeoModel } from "../lib/geo";

export interface Dataset {
  artists: Artist[];
  performances: Performance[];
  locations: Location[];
  taxonomy: Taxonomy;
  metadata: DatasetMetadata;
  artistsById: Map<string, Artist>;
  geoModel: BrcGeoModel | null;
  tasteReferences: TasteReference[];
  tasteReferencesByName: Map<string, TasteReference>;
}

let cached: Dataset | null = null;
let inflight: Promise<Dataset> | null = null;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function loadDataset(): Promise<Dataset> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = (async () => {
    const [artists, performances, locations, taxonomy, metadata] = await Promise.all([
      fetchJson<Artist[]>("/data/artists.json"),
      fetchJson<Performance[]>("/data/performances.json"),
      fetchJson<Location[]>("/data/locations.json"),
      fetchJson<Taxonomy>("/data/taxonomy.json"),
      fetchJson<DatasetMetadata>("/data/metadata.json"),
    ]);
    const geoModel = await fetchJson<BrcGeoModel>("/data/brc_geo_model.json").catch(() => null);
    const tasteReferences = await fetchJson<TasteReference[]>("/data/taste_references.json").catch(() => []);
    const artistsById = new Map(artists.map((a) => [a.artist_id, a]));
    const tasteReferencesByName = new Map(tasteReferences.map((r) => [r.artist.toLowerCase(), r]));
    cached = { artists, performances, locations, taxonomy, metadata, artistsById, geoModel, tasteReferences, tasteReferencesByName };
    return cached;
  })();

  return inflight;
}
