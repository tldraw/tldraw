# Grafana dashboards and alerts

**TL;DR:** `resources/` is the source of truth for our Grafana Cloud dashboards and alert rules. CI pushes it with `gcx` on every merge to `main` that touches these files. Edit here, not in Grafana — UI edits get overwritten by the next deploy.

This directory currently provisions:

- Eleven dashboards: `Zero on Fly.io — service health` (`zero-fly-health`), `Zero slow queries` (`slow-queries`), and `Zero-cache HTTP edge (Fly.io)` (`ni7hhgd`) in the `Zero` folder; `Anthropic scrape overview` in the `Anthropic` folder; `Dotcom events` (`ni5k8zc`), `Dotcom events V1` (`adgumkhou3chsd`), `File effect outbox`, `MCP server (shared boards)` (`mcp-server`), `MCP app sessions` (`kotx6wj`), and `Bemo analytics` in the `Dotcom` folder; and `Cloudflare platform metrics` (`nivs2rl`), which sits at the root rather than in a folder. The events pipeline currently reports from **staging** — set the environment variable accordingly when a dashboard looks empty.
- All 13 Grafana-managed alert rules (Zero replication/errors/backups, Fly.io container health, Anthropic cost/usage, file room DO exceptions)
- The folders `Zero` (dashboards + 9 rules), `Dotcom` (6 dashboards + 1 rule), and `Anthropic` (1 dashboard + 3 cost rules)
- The `discord` and `email` notification templates (`templates/*.gotmpl`, defining `tldraw.discord.title` / `tldraw.discord.text` and `tldraw.email.subject` / `tldraw.email.message`), which compress alert notifications to severity + summary + links (no Silence link on Discord: silence URLs carry one matcher per label and blow Discord’s 2000-char message cap on multi-instance alerts, truncating mid-link) and explain `DatasourceNoData` as a likely metrics-source outage. Templates can't go through `gcx resources push` — gcx ignores the `notifications.alerting.grafana.app` API group — so they live in `templates/` instead of `resources/` and the deploy workflow PUTs them through the classic provisioning API. Each contact point's optional Title/Subject and Message fields reference these templates; those references are set by hand (contact points stay hand-managed), so the templates only take effect while a contact point points at them.

There are two MCP dashboards, for two different servers. `MCP server (shared boards)` covers the public server on the sync worker at `POST /app/mcp` (`apps/dotcom/sync-worker`), which reads its protocol metrics from the `MEASURE` dataset. `MCP app sessions` covers the separate tldraw MCP app worker (`apps/mcp-app`) and its own `MCP_ANALYTICS` dataset. Neither one's panels belong on `Dotcom events` — that dashboard covers the sync worker's own events.

`Dotcom events V1` holds only the catch-all `Room events` panel and `max attempts before persistence success`; new panels go on `Dotcom events`.

Contact points, notification policies, and data sources are hand-managed in Grafana on purpose.

## Conventions

Every provisioned dashboard carries the tags `provisioned` and `repo:tldraw/tldraw`, so anyone looking at it in Grafana knows where it's managed from. Add both tags when adopting a new dashboard into this tree.

## Making a change

1. Edit the files under `resources/`.
2. Open a PR. CI validates the resources and dry-runs the push so you can see what would change. (The alerting API doesn't support server-side dry-run, so alert rules show as "skipped: client-side check only" — that's expected, not an error.)
3. Merge. The deploy workflow (`.github/workflows/deploy-grafana.yml`) pushes to Grafana Cloud.

## Adding a new alert rule

A rule file carrying `grafana.com/group` labels cannot be _created_ by the push. Grafana rejects it with `cannot set group when creating a new rule` — the resource API can only update a rule that is already in a group. Nothing catches this earlier: alerting has no server-side dry-run, so the PR reports the rule as "skipped" and goes green.

Bootstrap the group once by hand, then let the push adopt it:

    gcx api /api/v1/provisioning/folder/<folder uid>/rule-groups/<group> \
      -X PUT -H 'X-Disable-Provenance: true' -d @group.json

`group.json` uses the classic provisioning shape (`{title, folderUid, interval, rules: [...]}`), which is not the shape of the file in this tree: `spec.expressions` becomes a `data` array, the expression carrying `source: true` becomes `condition`, and `spec.trigger.interval` becomes the group's `interval` in seconds. `X-Disable-Provenance: true` is what leaves provenance clear so the push can take ownership afterwards.

`dotcom-file-do-exceptions` was created this way on 2026-08-18, after PR #10052's deploy failed on it.

## Pulling fresh state

If you prototyped a dashboard in the Grafana UI and want to adopt it, pull it into the tree with a local gcx context (`gcx login`):

    gcx resources pull dashboards/<uid> -p internal/grafana/resources -o yaml
    gcx resources pull alertrules -p internal/grafana/resources -o yaml

Note the alert rules selector is `alertrules` — bare `rules` routes to the Asserts product and 403s on our stack.

Don't hand-reformat gcx output; it needs to round-trip. Exception: `zero-fly-health` is stored as JSON because gcx 1.0.0's YAML writer emits an invalid escape for emoji variation selectors in row titles (its own reader then rejects the file). If a pulled YAML file fails `gcx resources validate`, re-pull that resource with `-o json`.

Alert rules created through Grafana's "import Prometheus rules" flow can't be pushed: they carry `converted_prometheus` provenance, and Grafana only accepts writes to a rule from the tool that owns its provenance. To adopt one, strip the `alerting.grafana.app/prometheus-rule-definition` annotation and set `grafana.com/provenance: ''` in the pulled file, then recreate the rule in Grafana with clear provenance so the push can take ownership: delete the imported group (`gcx api /api/convert/prometheus/config/v1/rules/<folder title>/<group> -X DELETE`), recreate it via `gcx api /api/v1/provisioning/folder/<folder uid>/rule-groups/<group> -X PUT -H 'X-Disable-Provenance: true' -d @group.json`, and push. Recreating grouped rules must go through that group endpoint — the resource API gcx pushes with can't add rules to groups, only update rules already in one. The three Anthropic cost rules went through this adoption on 2026-08-10 and are repo-owned now — don't re-run the integration's rule import for them, which would recreate the imported group alongside the adopted one and bring the provenance clash back.

## Deleting a resource

Deleting a file here does **not** delete it in Grafana. Remove the file and run `gcx resources delete <type>/<uid>` manually.

## Service account access

CI authenticates with a Grafana service account token (`GRAFANA_SERVER` / `GRAFANA_TOKEN` repo secrets). The `zero-fly-health` dashboard has restricted permissions: the service account needs an explicit grant on it (or admin role) or pulls and pushes will 403.
