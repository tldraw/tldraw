# Grafana dashboards and alerts

**TL;DR:** `resources/` is the source of truth for our Grafana Cloud dashboards and alert rules. CI pushes it with `gcx` on every merge to `main` that touches these files. Edit here, not in Grafana — UI edits get overwritten by the next deploy.

This directory currently provisions:

- Nine dashboards: `Zero on Fly.io — service health` (`zero-fly-health`), `Zero slow queries` (`slow-queries`), and `Zero-cache HTTP edge (Fly.io)` (`ni7hhgd`) in the `Zero` folder; `Anthropic scrape overview` in the `Anthropic` folder; `Dotcom events` (`ni5k8zc`), `Dotcom events V1` (`adgumkhou3chsd`), `File effect outbox`, `MCP app sessions`, and `Bemo analytics` in the root folder. The events pipeline currently reports from **staging** — set the environment variable accordingly when a dashboard looks empty.
- All 12 Grafana-managed alert rules (Zero replication/errors/backups, Fly.io container health, Anthropic cost/usage)
- The folders `Zero` (dashboard + 9 rules) and `Anthropic` (3 cost rules)

Contact points, notification policies, and data sources are hand-managed in Grafana on purpose.

## Conventions

Every provisioned dashboard carries the tags `provisioned` and `repo:tldraw/tldraw`, so anyone looking at it in Grafana knows where it's managed from. Add both tags when adopting a new dashboard into this tree.

## Making a change

1. Edit the files under `resources/`.
2. Open a PR. CI validates the resources and dry-runs the push so you can see what would change. (The alerting API doesn't support server-side dry-run, so alert rules show as "skipped: client-side check only" — that's expected, not an error.)
3. Merge. The deploy workflow (`.github/workflows/deploy-grafana.yml`) pushes to Grafana Cloud.

## Pulling fresh state

If you prototyped a dashboard in the Grafana UI and want to adopt it, pull it into the tree with a local gcx context (`gcx login`):

    gcx resources pull dashboards/<uid> -p internal/grafana/resources -o yaml
    gcx resources pull alertrules -p internal/grafana/resources -o yaml

Note the alert rules selector is `alertrules` — bare `rules` routes to the Asserts product and 403s on our stack.

Don't hand-reformat gcx output; it needs to round-trip. Exception: `zero-fly-health` is stored as JSON because gcx 1.0.0's YAML writer emits an invalid escape for emoji variation selectors in row titles (its own reader then rejects the file). If a pulled YAML file fails `gcx resources validate`, re-pull that resource with `-o json`.

## Deleting a resource

Deleting a file here does **not** delete it in Grafana. Remove the file and run `gcx resources delete <type>/<uid>` manually.

## Service account access

CI authenticates with a Grafana service account token (`GRAFANA_SERVER` / `GRAFANA_TOKEN` repo secrets). The `zero-fly-health` dashboard has restricted permissions: the service account needs an explicit grant on it (or admin role) or pulls and pushes will 403.
