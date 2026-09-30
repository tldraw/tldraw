#!/usr/bin/env node
// Prints PostHog HogQL comparing first_load timings in equal windows before and after each PR's
// deploy, plus an overall start-vs-now row. Paste the output into the PostHog MCP `execute-sql`.
//
// usage: compare-sql.mjs <production|staging> [--hours 48] [--settle 1] [--since YYYY-MM-DD] [--route file] [pr ...]
// With no PRs, uses every `perf` PR merged to main since --since.
// Verdicts compare 95% confidence intervals of each percentile (order statistics, no distribution
// assumed): faster/slower only when the before and after intervals don't overlap.
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HOUR = 3600_000
// Deploys closer than this get merged into one change: their windows would be too short to separate.
const MERGE_WITHIN_MS = 2 * HOUR
// Share of cold rooms moving more than this means the population changed, not just the code.
const COLD_SHIFT = 0.1
const STAGING_FLAT_PCT = 10

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
// The first hour after a deploy is slow for reasons unrelated to the PR (cold CDN and chunk caches).
const settle = Number(opt('settle', '1'))
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
const dt = (ms) => `toDateTime('${fmt(ms)}')`
const windows = []
changes.forEach((c, i) => {
	const prev = changes[i - 1]?.at ?? -Infinity
	const next = changes[i + 1]?.at ?? now
	const from = Math.max(c.at - hours * HOUR, prev + settle * HOUR)
	const afterFrom = c.at + settle * HOUR
	const to = Math.min(afterFrom + hours * HOUR, next, now)
	const label = c.prs.join(' + ')
	const short = []
	if (c.at - from < hours * HOUR) short.push(`${Math.max(0, Math.round((c.at - from) / HOUR))}h before`)
	if (to - afterFrom < hours * HOUR) short.push(`${Math.max(0, Math.round((to - afterFrom) / HOUR))}h after`)
	if (short.length) notes.push(`${label}: only ${short.join(', ')} (next or previous change, or now)`)
	windows.push([label, 'before', dt(from), dt(c.at), dt(c.at)], [label, 'after', dt(afterFrom), dt(to), dt(c.at)])
})
const sinceAt = Date.parse(`${since}T00:00:00Z`)
// first_load may start after --since, so the overall baseline begins at the first event.
const firstEvent = `(SELECT min(timestamp) FROM events WHERE event = 'first_load' AND timestamp >= ${dt(sinceAt)})`
windows.push(
	['overall', 'before', firstEvent, `${firstEvent} + INTERVAL ${hours} HOUR`, dt(now)],
	['overall', 'after', dt(now - hours * HOUR), dt(now), dt(now)]
)
const tuples = windows
	.map(([label, side, from, to, order]) => `('${label}', '${side}', ${from}, ${to}, ${order})`)
	.join(',\n        ')

// Ranks bounding a 95% CI of quantile q in a sorted array of n values (normal approximation of the
// binomial), clamped to the array.
const ci = (arr, q) => {
	const half = `1.96 * sqrt(length(${arr}) * ${q} * ${(1 - q).toFixed(2)})`
	const lo = `arrayElement(${arr}, toInt(greatest(1.0, floor(length(${arr}) * ${q} - ${half}))))`
	const hi = `arrayElement(${arr}, toInt(least(toFloat(length(${arr})), ceil(length(${arr}) * ${q} + ${half}) + 1)))`
	return [lo, hi]
}
// Staging is a handful of staff loads, so a CI test would never pass: give the direction instead.
const verdict = (name, aLo, aHi, bLo, bHi) =>
	env === 'staging'
		? `multiIf(length(b) = 0 OR length(a) = 0, 'no data', ${name}_change_pct <= -${STAGING_FLAT_PCT}, 'looks faster', ${name}_change_pct >= ${STAGING_FLAT_PCT}, 'looks slower', 'flat')`
		: `multiIf(length(b) < 5 OR length(a) < 5, 'too few loads', ${aHi} < ${bLo}, 'faster', ${aLo} > ${bHi}, 'slower', 'no clear change')`
const stats = (q, name) => {
	const [bLo, bHi] = ci('b', q)
	const [aLo, aHi] = ci('a', q)
	return `
    round(quantileIf(${q})(v, side = 'before')) AS ${name}_before,
    round(quantileIf(${q})(v, side = 'after')) AS ${name}_after,
    round(100 * (${name}_after / ${name}_before - 1)) AS ${name}_change_pct,
    ${verdict(name, aLo, aHi, bLo, bHi)} AS ${name}_verdict,
    concat(toString(round(${bLo})), '-', toString(round(${bHi})), ' -> ', toString(round(${aLo})), '-', toString(round(${aHi}))) AS ${name}_ci`
}

console.log(`-- ${env}: first_load, route_kind = '${route}', signed in. ${hours}h before each deploy vs ${hours}h after,
-- skipping the first ${settle}h after it. overall = first ${hours}h of data since ${since} vs the last ${hours}h.
-- *_change_pct = after / before - 1, negative = faster. ${
	env === 'staging'
		? `*_verdict is direction only (±${STAGING_FLAT_PCT}%): staging is a few staff loads, an early signal.`
		: '*_verdict compares 95% CIs (*_ci, before -> after): faster/slower only when they do not overlap.'
}
-- population_shift: cold share moved more than ${COLD_SHIFT}, so a change may not be the PR's doing.
-- weekend_*: share of loads on Sat/Sun; a big difference between sides also shifts the population.
${notes.map((n) => `-- note: ${n}`).join('\n')}
SELECT
  change, metric, n_before, n_after,
  p50_before, p50_after, p50_change_pct, p50_verdict, p50_ci,
  p90_before, p90_after, p90_change_pct, p90_verdict, p90_ci,
  cold_before, cold_after, abs(cold_after - cold_before) > ${COLD_SHIFT} AS population_shift,
  weekend_before, weekend_after
FROM (
  SELECT
    change,
    metric,
    min(ordered_at) AS ordered_at,
    arraySort(groupArrayIf(v, side = 'before')) AS b,
    arraySort(groupArrayIf(v, side = 'after')) AS a,
    length(b) AS n_before,
    length(a) AS n_after,${stats(0.5, 'p50')},${stats(0.9, 'p90')},
    round(avgIf(cold, side = 'before'), 2) AS cold_before,
    round(avgIf(cold, side = 'after'), 2) AS cold_after,
    round(avgIf(weekend, side = 'before'), 2) AS weekend_before,
    round(avgIf(weekend, side = 'after'), 2) AS weekend_after
  FROM (
    SELECT
      tupleElement(w, 1) AS change,
      tupleElement(w, 2) AS side,
      tupleElement(w, 5) AS ordered_at,
      tupleElement(m, 1) AS metric,
      tupleElement(m, 2) AS v,
      cold,
      weekend
    FROM (
      SELECT
        properties.srv_cold = true AS cold,
        toDayOfWeek(timestamp) >= 6 AS weekend,
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
        AND timestamp >= ${dt(Math.min(sinceAt, ...changes.map((c) => c.at - hours * HOUR)))}
        AND properties.route_kind = '${route}'
        AND properties.is_signed_in = true
    )
    WHERE v IS NOT NULL
  )
  GROUP BY change, metric
)
ORDER BY ordered_at, metric`)
