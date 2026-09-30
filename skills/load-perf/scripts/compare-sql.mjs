#!/usr/bin/env node
// Prints PostHog HogQL comparing first_load timings in equal windows before and after each PR's
// deploy, plus an overall start-vs-now row. Paste the output into the PostHog MCP `execute-sql`.
//
// usage: compare-sql.mjs <production|staging> [--hours 48] [--since YYYY-MM-DD] [--route file] [pr ...]
// With no PRs, uses every `perf` PR merged to main since --since.
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HOUR = 3600_000
// Deploys closer than this get merged into one change: their windows would be too short to separate.
const MERGE_WITHIN_MS = 2 * HOUR
const MIN_LOADS = 30

const args = process.argv.slice(2)
const env = args.shift()
if (env !== 'production' && env !== 'staging') {
	console.error('usage: compare-sql.mjs <production|staging> [--hours 48] [--since YYYY-MM-DD] [--route file] [pr ...]')
	process.exit(1)
}
const opt = (name, fallback) => {
	const i = args.indexOf(`--${name}`)
	if (i === -1) return fallback
	const [, value] = args.splice(i, 2)
	return value
}
const hours = Number(opt('hours', '48'))
const since = opt('since', new Date(Date.now() - 10 * 24 * HOUR).toISOString().slice(0, 10))
const route = opt('route', 'file')
let prs = args.map((a) => a.replace(/^#/, ''))

if (prs.length === 0) {
	const out = execFileSync('gh', [
		'pr', 'list', '--state', 'merged', '--limit', '200',
		'--search', `merged:>=${since} -base:hotfixes`,
		'--json', 'number,title', '--jq', '.[] | select(.title | test("^perf")) | .number',
	]).toString()
	prs = out.trim().split('\n').filter(Boolean)
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const deployLines = execFileSync(join(scriptDir, 'pr-deploys.sh'), prs).toString().trim().split('\n')

const notes = []
const points = []
for (const line of deployLines) {
	const [prCol, stagingCol, prodCol, title] = line.split('\t')
	const at = (env === 'production' ? prodCol : stagingCol)?.replace(/^(staging|prod) /, '')
	if (!at || !/^\d{4}-/.test(at)) {
		notes.push(`${prCol} not in ${env} yet`)
		continue
	}
	// Staging serves a merge ~15 min later.
	const deployedAt = Date.parse(`${at}:00Z`) + (env === 'staging' ? 15 * 60_000 : 0)
	points.push({ pr: prCol, title, at: deployedAt })
}
points.sort((a, b) => a.at - b.at)

const changes = []
for (const p of points) {
	const last = changes.at(-1)
	if (last && p.at - last.at < MERGE_WITHIN_MS) last.prs.push(p.pr)
	else changes.push({ prs: [p.pr], at: p.at })
}
for (const c of changes) {
	if (c.prs.length > 1)
		notes.push(`${c.prs.join(' + ')} deployed within ${MERGE_WITHIN_MS / HOUR}h of each other; measured together`)
}

const now = Date.now()
const fmt = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
const windows = []
changes.forEach((c, i) => {
	const prev = changes[i - 1]?.at ?? -Infinity
	const next = changes[i + 1]?.at ?? now
	const from = Math.max(c.at - hours * HOUR, prev)
	const to = Math.min(c.at + hours * HOUR, next, now)
	const label = c.prs.join(' + ')
	const short = []
	if (c.at - from < hours * HOUR) short.push(`${Math.round((c.at - from) / HOUR)}h before`)
	if (to - c.at < hours * HOUR) short.push(`${Math.round((to - c.at) / HOUR)}h after`)
	if (short.length) notes.push(`${label}: only ${short.join(', ')} (next or previous change, or now)`)
	windows.push([label, 'before', from, c.at, c.at], [label, 'after', c.at, to, c.at])
})
const sinceAt = Date.parse(`${since}T00:00:00Z`)
// first_load may start after --since, so the overall baseline begins at the first event.
const firstEvent = `(SELECT min(timestamp) FROM events WHERE event = 'first_load' AND timestamp >= toDateTime('${fmt(sinceAt)}'))`
const dt = (ms) => `toDateTime('${fmt(ms)}')`
const tuples = windows
	.map(([label, side, from, to, order]) => `('${label}', '${side}', ${dt(from)}, ${dt(to)}, ${dt(order)})`)
	.concat([
		`('overall', 'before', ${firstEvent}, ${firstEvent} + INTERVAL ${hours} HOUR, ${dt(now)})`,
		`('overall', 'after', ${dt(now - hours * HOUR)}, ${dt(now)}, ${dt(now)})`,
	])
	.join(',\n        ')

console.log(`-- ${env}: first_load, route_kind = '${route}', signed in. ${hours}h before vs ${hours}h after each deploy.
-- overall = first ${hours}h of data since ${since} vs the last ${hours}h. change = (after / before - 1), negative = faster.
-- Flag any side with n < ${MIN_LOADS} as too few loads, and a cold shift of more than ~0.1 as a population change.
${notes.map((n) => `-- note: ${n}`).join('\n')}
SELECT
  change,
  metric,
  anyIf(n, side = 'before') AS n_before,
  anyIf(n, side = 'after') AS n_after,
  anyIf(cold, side = 'before') AS cold_before,
  anyIf(cold, side = 'after') AS cold_after,
  anyIf(p50, side = 'before') AS p50_before,
  anyIf(p50, side = 'after') AS p50_after,
  round(100 * (p50_after / p50_before - 1)) AS p50_change_pct,
  anyIf(p90, side = 'before') AS p90_before,
  anyIf(p90, side = 'after') AS p90_after,
  round(100 * (p90_after / p90_before - 1)) AS p90_change_pct
FROM (
  SELECT
    tupleElement(w, 1) AS change,
    tupleElement(w, 2) AS side,
    tupleElement(w, 5) AS ordered_at,
    tupleElement(m, 1) AS metric,
    count() AS n,
    round(avg(cold), 2) AS cold,
    round(quantile(0.5)(tupleElement(m, 2))) AS p50,
    round(quantile(0.9)(tupleElement(m, 2))) AS p90
  FROM (
    SELECT
      properties.srv_cold = true AS cold,
      arrayJoin(arrayFilter(x -> timestamp >= tupleElement(x, 3) AND timestamp < tupleElement(x, 4), [
        ${tuples}
      ])) AS w,
      arrayJoin([
        ('1 board visible', toFloat(properties.t_board_visible)),
        ('2 zero preloaded', toFloat(properties.t_zero_preloaded)),
        ('3 sync connected', toFloat(properties.t_sync_connected)),
        -- d_sync_connected is the gap to the previous step, not the token
        ('4 token to sync', toFloat(properties.t_sync_connected) - toFloat(properties.t_sync_token_fetched))
      ]) AS m
    FROM events
    WHERE event = 'first_load'
      AND timestamp >= ${dt(Math.min(sinceAt, ...windows.map((w) => w[2])))}
      AND properties.route_kind = '${route}'
      AND properties.is_signed_in = true
  )
  GROUP BY change, side, ordered_at, metric
)
GROUP BY change, metric
ORDER BY min(ordered_at), metric`)
