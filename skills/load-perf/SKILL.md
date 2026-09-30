---
name: load-perf
description: Check tldraw.com page and board load times on staging or production and attribute changes to deployed PRs. Use when the user invokes load-perf, asks whether first load or file open got faster, whether a perf PR helped, or wants load timings compared before and after a deploy. Uses PostHog first_load events and sync worker Analytics Engine data via Grafana.
---

# Load perf

Answer "did this PR make loading faster?" with before → after numbers around each deploy.

Arguments are all optional: `load-perf [staging|production] [#PR ...] [since YYYY-MM-DD]`.

- No env: do both, staging first, since it shows a PR's effect before production.
- No PRs: every `perf` PR merged since `since`.
- No `since`: the last 10 days.

## Data sources

| What | Where | Access |
| --- | --- | --- |
| Client timings: `first_load` (page boot) | PostHog MCP, `execute-sql` | prod project **45972**, staging **45921**. 45919 is empty: `switch-project` first |
| Sync worker connect steps | Cloudflare Analytics Engine via Grafana (`scripts/ae.sh`) | `GRAFANA_TOKEN` env var, a viewer service-account token with Query on the AE datasource |
| Deploy times | `origin/production` deploy commits, PR merge times | `git`, `gh` |

Who reports: staff (`@tldraw.com`) always, everyone else through the `load_rum` percentage flag. Staging is 1-5 staff, production hundreds of users a day.

## Workflow

1. **Generate the comparison.** Run `scripts/compare-sql.mjs <env> [--since YYYY-MM-DD] [--hours 48] [--settle 1] [pr ...]` and save the output to a file.
   - It takes each PR's deploy time from `scripts/pr-deploys.sh` and compares the 48h before the deploy with the 48h after it. The after window skips the first hour after the deploy (`--settle`), when cold caches slow every load.
   - A window stops early at the next or previous deploy. Deploys within 2h of each other are measured together.
   - It adds an `overall` row: the first 48h of data vs the last 48h.
   - Its `-- note:` lines list PRs that aren't deployed yet, shortened windows, and grouped PRs.
2. **Run it** with PostHog `execute-sql` on the env's project. Drop the `--` comment lines first.
3. **Server steps.** Run `scripts/server-steps.sh <env> [since]` for daily p50/p90 of the connect path, and line the changes up with the deploy times.
4. **Report**, per env. Lead with board visible, one row per PR (or group): `p50 before → after (±%)`, the same for p90, n before/after, and the verdict. Negative % = faster.
   - **Production verdicts** come from 95% confidence intervals of each percentile (`*_ci`, before -> after). `faster` or `slower` means the intervals don't overlap. `no clear change` means the difference is within noise. Don't round it up to a win.
   - **Staging verdicts** show direction only (`looks faster` / `looks slower` / `flat`, at ±10%). Staging is a few staff loads, so treat it as an early signal before production, not proof.
   - Mention `population_shift` (the cold share moved by more than 0.1) and any large `weekend_before` / `weekend_after` difference. Both change who is loading, not just the code.
   - Explain *why* using the other metrics: zero preloaded, sync connected, token → sync, and the server steps.
   - Then the `overall` row, and what now gates board visible.
   - Always include the raw result table, the `-- note:` lines, and the path to the saved SQL, so the reader can check the numbers or rerun them.

`scripts/deploys.sh [since]` prints the full deploy timeline when you need to know what else shipped around a PR. `references/first-load-daily.sql` gives a daily trend for spotting a single bad day.

## Reading the numbers

- `t_*` is ms since navigation start. `srv_*` is the server echo for the same connect.
- Board visible ≈ max(zero preloaded, sync connected) + editor mount. Sync used to start only after Zero preloaded. Since #10880 the socket opens in parallel, so check which of the two is later.
- `d_*` is the gap to whichever step happened just before, not a fixed predecessor. For the connect path as the client sees it, use `t_sync_connected - t_sync_token_fetched` (the "token to sync" metric) and compare it with `on_request_total` from AE.
- A high `t_js_started` means slow navigation TTFB (look at `nav_ttfb`), usually just after a production deploy on `root-redirect`. Not an app problem.
- `srv_cold` means there was no live room in the DO. A load from R2/Postgres shows as `srv_boot_*`.
- Zero stalls show up as 30-90s p90s with a normal p50, so always read the p90. Its interval is wide, so a p90 verdict needs a large effect.
- The comparison defaults to `route_kind = 'file'` (direct board links, the cleanest population). Use `--route root-redirect` for `/` loads.

## AE gotchas

- Filter by `blob2 = '<production|staging>-tldraw-multiplayer'`. `blob1` is the event name and `double1` the duration.
- Use `quantileWeighted(q, double1, _sample_interval)`, quantile first, and `sum(_sample_interval)` for counts.
- `toDateTime` needs a full `YYYY-MM-DD HH:MM:SS`.
- To list event names: `scripts/ae.sh "SELECT blob1, sum(_sample_interval) n FROM MEASURE WHERE timestamp > now() - INTERVAL '3' DAY AND blob2 = 'production-tldraw-multiplayer' GROUP BY blob1 ORDER BY n DESC"`.
- `db_load_*` only runs when a room's SQLite is cold (~2% of connects). Don't read it as a per-open cost.
