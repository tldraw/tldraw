---
name: load-perf
description: Check tldraw.com page and board load times on staging or production and attribute changes to deployed PRs. Use when the user invokes load-perf, asks whether first load or file open got faster, whether a perf PR helped, or wants load timings compared before and after a deploy. Uses PostHog first_load/file_load events and sync worker Analytics Engine data via Grafana.
---

# Load perf

Measure tldraw.com load times per deploy era and say which PRs moved them.

Arguments are all optional: `load-perf [staging|production] [#PR ...] [since YYYY-MM-DD]`.

- No env: do both, staging first. It gets every merge within minutes, so it shows the effect before production.
- No PRs: cut eras at every perf-related deploy from `scripts/deploys.sh`.
- PRs given: cut eras only at those PRs' deploy times from `scripts/pr-deploys.sh`.
- No `since`: the last 10 days.

## Data sources

| What | Where | Access |
| --- | --- | --- |
| Client timings: `first_load` (page boot), `file_load` (every file open, `load_kind` first/switch/remount) | PostHog MCP, `execute-sql` | prod project **45972**, staging **45921**. 45919 is empty: `switch-project` first |
| Sync worker connect steps | Cloudflare Analytics Engine via Grafana (`scripts/ae.sh`) | `GRAFANA_TOKEN` env var, a viewer service-account token with Query on the AE datasource |
| Deploy times | `origin/production` deploy commits, PR merge times | `git`, `gh` |

Who reports: staff (`@tldraw.com`) always, everyone else through the `load_rum` percentage flag. Staging is 1-4 staff, often reloading the same board. Production has hundreds of users a day.

## Workflow

1. **Deploy timeline.** Run `scripts/deploys.sh [since]`, or `scripts/pr-deploys.sh <pr...>` when PRs are given. Staging goes live ~15 min after merge. Production goes live at the `Deploy from` time. Say which PRs are not in production yet.
2. **Client timings.** Adapt `references/first-load-by-era.sql` with the cut points and run it on each project. Split by `route_kind` (`file` = direct board link, `root-redirect` = `/` then redirected to a board) and by `is_signed_in`. Drop buckets with n < 10 in prod. Staging has to accept tiny n.
3. **Sanity check.** Run `references/first-load-daily.sql`. If an era change is just one bad day, or tracks `cold` or n, it's a population shift, not the PR.
4. **Server steps.** Run `scripts/server-steps.sh <production|staging> [since]` and match the step changes to the deploy times.
5. **Report.** Give a table per env with era, n, the key p50s, and p90 for board visible and zero preloaded. Then one line per PR on what it moved, and what is gating board visible now.

## Reading the numbers

- `t_*` is ms since navigation start. `d_*` is ms since the previous step. `srv_*` is the server echo for the same connect.
- Board visible ≈ max(zero preloaded, sync connected) + editor mount. Sync used to start only after Zero preloaded. Since #10880 the socket opens in parallel, so check which of the two is later.
- `d_sync_connected` = token fetched → socket connected, i.e. the connect path as the client sees it. Compare it with `on_request_total` from AE.
- A high `t_js_started` means slow navigation TTFB (look at `nav_ttfb`), usually just after a production deploy on `root-redirect`. Not an app problem.
- `srv_cold` means the room DO booted for this connect. Hold `cold` roughly constant across eras before crediting a PR.
- Watch the p90 as well as the p50. Zero stalls show up as 30-90s p90s with a normal p50.

## AE gotchas

- Filter by `blob2 = '<production|staging>-tldraw-multiplayer'`. `blob1` is the event name and `double1` the duration.
- Use `quantileWeighted(q, double1, _sample_interval)`, quantile first, and `sum(_sample_interval)` for counts.
- `toDateTime` needs a full `YYYY-MM-DD HH:MM:SS`.
- To list event names: `scripts/ae.sh "SELECT blob1, sum(_sample_interval) n FROM MEASURE WHERE timestamp > now() - INTERVAL '3' DAY AND blob2 = 'production-tldraw-multiplayer' GROUP BY blob1 ORDER BY n DESC"`.
- `db_load_*` only runs when a room's SQLite is cold (~2% of connects). Don't read it as a per-open cost.
