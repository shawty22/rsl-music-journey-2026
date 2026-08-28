#!/usr/bin/env python3
"""
Derives a compact, accurate BRC coordinate model from the official 2026
Burning Man GIS data (street_lines.geojson) instead of guessing or bundling
the raw ~230KB+ GIS files. Produces:

  data/brc_geo_model.json:
    {
      center: {lat, lng},               # Golden Spike
      rotation_deg: <float>,             # real-world bearing (deg true north) of clock 12:00
      rings: {"Esplanade": <radius_m>, "A": <radius_m>, ...},
      generated_at, source
    }

This is enough to convert any BRC "clock & street" address to a real
lat/lng (and back), without shipping the full GIS dataset in the app.
"""
import json
import math
from datetime import datetime, timezone

GOLDEN_SPIKE = (40.783242, -119.207871)  # lat, lng — official 2026 value
EARTH_R = 6371000.0

RING_NAMES = {
    "ESP": "Esplanade",
    "A": "Ararat", "B": "Bodhi", "C": "Ceiba", "D": "Delphi", "E": "Eternal",
    "F": "Fulcrum", "G": "Great Oak", "H": "Heiau", "I": "Iroko", "J": "Jiba", "K": "Kundalini",
}


def haversine_m(lat1, lng1, lat2, lng2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))


def bearing_deg(lat1, lng1, lat2, lng2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlmb = math.radians(lng2 - lng1)
    y = math.sin(dlmb) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dlmb)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def clock_to_hours(clock_str):
    # "4:30" -> 4.5
    h, m = clock_str.split(":")
    return int(h) % 12 + int(m) / 60.0


def circular_mean_deg(degs):
    x = sum(math.cos(math.radians(d)) for d in degs)
    y = sum(math.sin(math.radians(d)) for d in degs)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


with open("/Users/dooj/WhiteMirror/10_PROJECTS/RSL BM 2026/data/brc-gis-2026/street_lines.geojson") as f:
    data = json.load(f)

ring_points = {}   # name -> list of (lat,lng)
radial_points = {}  # clock_str -> list of (lat,lng)

for feat in data["features"]:
    props = feat["properties"]
    name = props.get("name")
    kind = props.get("source")
    coords = feat["geometry"]["coordinates"]
    if feat["geometry"]["type"] != "LineString" or not name:
        continue
    pts = [(c[1], c[0]) for c in coords]  # (lat, lng)
    if kind == "annular":
        ring_points.setdefault(name, []).extend(pts)
    elif kind == "radial" and ":" in name:
        radial_points.setdefault(name, []).extend(pts)

# --- ring radii (meters from Golden Spike), keyed by letter (matches how
# the app already parses RSL address strings like "10:00 & F") ---
rings = {}
ring_full_names = {}
for letter, pts in ring_points.items():
    radii = [haversine_m(GOLDEN_SPIKE[0], GOLDEN_SPIKE[1], lat, lng) for lat, lng in pts]
    key = "ESP" if letter == "ESP" else letter
    rings[key] = round(sum(radii) / len(radii), 1)
    ring_full_names[key] = RING_NAMES.get(letter, letter)

# --- rotation offset: fit bearing = clock_hours*30 + rotation (mod 360) ---
residuals = []
for clock_str, pts in radial_points.items():
    hours = clock_to_hours(clock_str)
    expected_angle = hours * 30.0  # clock-face angle, 12:00 = 0
    bearings = [bearing_deg(GOLDEN_SPIKE[0], GOLDEN_SPIKE[1], lat, lng) for lat, lng in pts]
    # only use points reasonably far from center (avoid near-center noise)
    far = [(b, lat, lng) for b, (lat, lng) in zip(bearings, pts)
           if haversine_m(GOLDEN_SPIKE[0], GOLDEN_SPIKE[1], lat, lng) > 200]
    if not far:
        continue
    mean_bearing = circular_mean_deg([b for b, _, _ in far])
    residual = (mean_bearing - expected_angle + 360) % 360
    residuals.append(residual)

rotation_deg = circular_mean_deg(residuals) if residuals else 0.0

model = {
    "center": {"lat": GOLDEN_SPIKE[0], "lng": GOLDEN_SPIKE[1]},
    "rotation_deg": round(rotation_deg, 2),
    "rings": rings,
    "ring_full_names": ring_full_names,
    "city_span_clock": {"start": "2:00", "end": "10:00"},
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "source": "Derived from official Burning Man 2026 GIS data (burningmantech/innovate-GIS-data, 2026/GeoJSON/street_lines.geojson). Golden Spike per innovate.burningman.org.",
}

out_path = "/Users/dooj/WhiteMirror/10_PROJECTS/RSL BM 2026/data/normalized/brc_geo_model.json"
with open(out_path, "w") as f:
    json.dump(model, f, indent=2)

print(f"Rings found: {len(rings)}")
for k, v in sorted(rings.items(), key=lambda kv: kv[1]):
    print(f"  {k}: {v}m")
print(f"Radial samples: {len(radial_points)} distinct clock positions, {len(residuals)} used for fit")
print(f"Rotation offset: {rotation_deg:.2f} deg (bearing of clock 12:00 from true north)")
print(f"Wrote {out_path}")
