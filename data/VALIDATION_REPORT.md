# RSL 2026 Data Validation Report

Generated: 2026-08-28T07:45:30.985Z

## Duplicate artist_normalized
None found.

## Possible duplicate performance records (same artist/day/set_time/camp)
8 rows flagged (not removed):
- idlis-on-the-mic__sat-pm-sun-am__5am: Idlis on the Mic — SAT PM — SUN AM @ 5am, Black Rock Travel Agency
- kosmozoo-downtempo__sat-pm-sun-am__10am: Kosmozoo Downtempo — SAT PM — SUN AM @ 10am, Black Rock Travel Agency
- children-s-hour-radio-theater__sun-pm-mon-am__6pm: Children's Hour Radio Theater — SUN PM — MON AM @ 6pm, Black Rock Travel Agency
- contessa__sun-pm-mon-am__8pm: Contessa — SUN PM — MON AM @ 8pm, Black Rock Travel Agency
- idlis-on-the-mic__sat-pm-sun-am__5am__2: Idlis on the Mic — SAT PM — SUN AM @ 5am, Black Rock Travel Agency
- kosmozoo-downtempo__sat-pm-sun-am__10am__2: Kosmozoo Downtempo — SAT PM — SUN AM @ 10am, Black Rock Travel Agency
- children-s-hour-radio-theater__sun-pm-mon-am__6pm__2: Children's Hour Radio Theater — SUN PM — MON AM @ 6pm, Black Rock Travel Agency
- contessa__sun-pm-mon-am__8pm__2: Contessa — SUN PM — MON AM @ 8pm, Black Rock Travel Agency

## Malformed set_time values
None found.

## Missing/unparseable day
None found.

## Orphaned performances (no matching artist_id)
None found.

## Missing location
- hypnotic-groove-underground-techno__wed-pm-thu-am__9pm: Hypnotic, Groove, Underground Techno @ Primitive Obsession
- hypnotic-groove-underground-techno__wed-pm-thu-am__5am: Hypnotic, Groove, Underground Techno @ Primitive Obsession

## Missing event_theme
403 / 1604 performances have no theme recorded (expected — not every RSL entry lists one).

## Invalid performance_type values
None found.

Note: 1604 / 1604 performances are currently classified UNKNOWN — the RSL PDF encodes DJ/live/hybrid via icons that were not text-extracted in this seed. Classification is pending enrichment, not an error.

## Artist enrichment coverage
284 / 1180 artists have any enrichment field populated beyond the raw RSL extraction.

## Summary
- Performances: 1604
- Artists: 1180
- Possible duplicate performances flagged: 8
- Malformed times: 0
- Orphaned performances: 0
