# CareerOps

Automated job-scanning for SAP Commerce Cloud / Hybris roles in Germany. Inspired by
[career-ops](https://github.com/santifer/career-ops) and
[ApplyPilot](https://github.com/Pickle-Pixel/ApplyPilot), scoped down to discovery only —
no CV generation, no auto-apply.

## What it does

1. Queries multiple job sources for openings matching the configured keywords/location.
2. Deduplicates results by URL.
3. Scores each job against `config/profile.json` (skill keyword overlap).
4. Writes:
   - `data/jobs.json` — full structured dataset
   - `reports/latest.md` — human-readable ranked table

A GitHub Actions workflow (`.github/workflows/job-scan.yml`) runs this daily at 06:00 UTC
and commits the updated report automatically. You can also trigger it manually from the
Actions tab ("Run workflow").

## Sources

| Source | Auth required | Notes |
|---|---|---|
| [Arbeitnow](https://www.arbeitnow.com/) | None | Free public API, Germany/EU-focused job board |
| [Adzuna](https://developer.adzuna.com/) | Free API key | Broader coverage; skipped silently if no key is set |

To enable Adzuna, register for a free API key at https://developer.adzuna.com/ and add
`ADZUNA_APP_ID` / `ADZUNA_APP_KEY` as repository secrets (Settings → Secrets and
variables → Actions).

More sources (company ATS boards, additional aggregators) can be added under
`scanner/sources/` — each just needs to export a function that takes `config` and
returns an array of normalized job objects.

## Configuration

- `config/search.json` — keywords, location hints, pagination limits
- `config/profile.json` — candidate skills used for scoring/ranking

## Running locally

```bash
node scanner/scan.js
```

Requires Node.js 18+ (uses the built-in `fetch`). No dependencies to install.

## Why not scrape Indeed/LinkedIn/StepStone directly?

Those sites actively block automated scraping (bot detection, CAPTCHAs, ToS
restrictions). This scanner uses official/public APIs instead, which is more reliable
and doesn't risk violating terms of service. Coverage is therefore a curated subset, not
a guaranteed complete index of every posting — use the job-board alerts mentioned in the
report alongside this for full coverage.

