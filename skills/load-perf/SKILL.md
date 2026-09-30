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
| Client timings: `first_load` (page boot; recorded since 2026-09-22 on staging, 2026-09-23 on prod) | PostHog MCP, `execute-sql` | prod project **45972**, staging **45921**. 45919 is the MCP default and is empty |
| Sync worker connect steps | Cloudflare Analytics Engine via Grafana (`scripts/ae.sh`) | `GRAFANA_TOKEN` env var, a viewer service-account token with Query on the AE datasource |
| Deploy times | `origin/production` deploy commits, PR merge times | `git`, `gh` |

Who reports: staff (`@tldraw.com`) always, everyone else through the `load_rum` percentage flag. Staging is 1-5 staff, production hundreds of users a day.

## Workflow

1. **Generate the comparison.** Run `scripts/compare-sql.mjs <staging|production|both> --out <dir> [--since YYYY-MM-DD] [--hours 48] [--settle 1] [pr ...]`. Put `<dir>` in your scratchpad.
   - It prints notes per env, and writes `<env>.sql` (to read) and `<env>.call` (to send).
   - It takes deploy times from `scripts/pr-deploys.mjs`, then compares equal windows before and after each deploy: up to 48h each side, cut short at a neighbouring deploy, the start of `first_load` data, or now.
   - It skips the first hour after a deploy (`--settle`), when cold caches slow every load. Deploys within 2h of each other are measured together.
   - It adds an `overall` row: the first 48h of data vs the last 48h.
2. **Run it** on PostHog, per env. The data and schema are known, so skip the MCP's `metric-list` / `read-data-schema` preamble.
   - Send `call switch-project {"projectId": N}` through the PostHog MCP `exec` tool. The notes give N.
   - Then send the contents of `<env>.call`, as-is, as the `exec` command.
   - The notes list the expected rows. A change with no row had no loads in either window, so say so rather than dropping it.
3. **Server steps.** Run `scripts/server-steps.sh <env> [since]` for daily p50/p90 of the connect path, and line the changes up with the deploy times.
4. **Report**, per env. Lead with board visible, one row per PR (or group): `p50 before → after (±%)`, the same for p90, n before/after, and the verdict. Negative % = faster.
   - **Production verdicts** come from 95% confidence intervals of each percentile (`*_ci`, before -> after). `faster` or `slower` means the intervals don't overlap. `no clear change` means the difference is within noise. Don't round it up to a win.
   - **Staging verdicts** show direction only (`looks faster` / `looks slower` / `flat`, at ±10%). Staging is a few staff loads, so treat it as an early signal before production, not proof.
   - Mention `population_shift` (the cold share moved by more than 0.1) and any large `weekend_before` / `weekend_after` difference. Both change who is loading, not just the code.
   - Explain *why* using the other metrics: zero preloaded, sync connected, token → sync, and the server steps.
   - Then the `overall` row, and what now gates board visible.
   - Pass on the notes that affect a verdict: short windows (time of day differs under a day), hotfix bundles (the row measures the whole bundle), and PRs shipped before `first_load` existed.
   - Always include the raw result table and the paths to `<env>.sql`, so the reader can check the numbers or rerun them.

`scripts/pr-deploys.mjs <pr ...>` prints when each PR reached staging and production, and which hotfix carried it. `scripts/deploys.sh [since]` prints the full deploy timeline when you need to know what else shipped around a PR. `references/first-load-daily.sql` gives a daily trend for spotting a single bad day.

## Reading the numbers

- `t_*` is ms since navigation start. `srv_*` is the server echo for the same connect.
- Board visible ≈ max(zero preloaded, sync connected) + editor mount. Whichever of the two lands later is what gates the board. If `t_sync_token_fetched` comes after `t_zero_preloaded`, the sync socket is waiting on Zero rather than running in parallel with it.
- `d_*` is the gap to whichever step happened just before, not a fixed predecessor. For the connect path as the client sees it, use `t_sync_connected - t_sync_token_fetched` (the "token to sync" metric) and compare it with `on_request_total` from AE.
- Token to sync is usually much larger than `on_request_total`. The worker handler is only part of the connect: there's also the WebSocket upgrade, waking the DO, and the first message round trip. `first_load` has them as `srv_d_route`, `srv_d_do_init`, `srv_d_get_room`, `srv_d_client_connect` and `srv_d_handshake`.
- A flat, day-after-day p90 in `on_request_total` means a fixed tail in one or more steps, usually Postgres. Compare each step's p90 in `server-steps.sh` to find which one.
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
