#!/usr/bin/env node
// Builds PostHog HogQL comparing first_load timings in equal windows before and after each PR's
// deploy, plus an overall start-vs-now row. Prints notes; writes per env `<env>.sql` (plain SQL)
// and `<env>.call` (the exact PostHog MCP `exec` command, ready to send).
//
// usage: compare-sql.mjs <production|staging|both> [--out DIR] [--hours 48] [--settle 1]
//          [--since YYYY-MM-DD] [--route file] [pr ...]
// With no PRs, uses every `perf` PR merged to main since --since.
// Production verdicts compare 95% confidence intervals of each percentile (order statistics, no
// distribution assumed): faster/slower only when the before and after intervals don't overlap.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { prDeploys } from './pr-deploys.mjs'

const HOUR = 3600_000
// Deploys closer than this get merged into one change: their windows would be too short to separate.
const MERGE_WITHIN_MS = 2 * HOUR
// Share of cold rooms moving more than this means the population changed, not just the code.
const COLD_SHIFT = 0.1
const STAGING_FLAT_PCT = 10
const MIN_LOADS = { production: 5, staging: 3 }
const PROJECT = { production: 45972, staging: 45921 }
// first_load exists from #10868's deploy on; earlier windows would compare against nothing.
const FIRST_LOAD_FROM = { production: Date.parse('2026-09-23T09:18Z'), staging: Date.parse('2026-09-22T11:18Z') }
// Staging serves a merge ~15 min after it lands on main.
const STAGING_LAG = 15 * 60_000
// Loads that took longer than this are a laptop sleeping mid-load (values reach 12h), not a slow
// load. Zero stalls (30-90s) stay in.
const MAX_LOAD_MS = 5 * 60_000

const args = process.argv.slice(2)
const envArg = args.shift()
if (!['production', 'staging', 'both'].includes(envArg)) {
	console.error(
		'usage: compare-sql.mjs <production|staging|both> [--out DIR] [--hours 48] [--settle 1] [--since YYYY-MM-DD] [--route file] [pr ...]'
	)
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
const outDir = opt('out', null) ?? mkdtempSync(join(tmpdir(), 'load-perf-'))
mkdirSync(outDir, { recursive: true })
let prs = args.map((a) => a.replace(/^#/, ''))

if (prs.length === 0) {
	prs = JSON.parse(
		execFileSync('gh', ['pr', 'list', '--state', 'merged', '--limit', '200', '--search', `merged:>=${since} -base:hotfixes`, '--json', 'number,title'], {
			encoding: 'utf8',
		})
	)
		.filter((p) => /^perf/.test(p.title))
		.map((p) => String(p.number))
}

const deploys = prDeploys(prs)
const now = Date.now()
const fmt = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
const dt = (ms) => `toDateTime('${fmt(ms)}')`
const h = (ms) => (ms < 3 * HOUR ? `${(ms / HOUR).toFixed(1)}h` : `${Math.round(ms / HOUR)}h`)

function build(env) {
	const notes = []
	const dataFrom = FIRST_LOAD_FROM[env]
	const points = []
	for (const d of deploys) {
		if (d.missing) {
			notes.push(`${d.pr} not found`)
			continue
		}
		const at = env === 'production' ? d.prod : d.staging !== null ? d.staging + STAGING_LAG : null
		if (at === null) notes.push(`${d.pr} not in ${env} yet`)
		else if (at <= dataFrom) notes.push(`${d.pr} shipped before first_load existed (#10868); nothing to compare`)
		else {
			points.push({ pr: d.pr, at })
			if (env === 'production' && d.bundledWith.length)
				notes.push(`${d.pr} shipped in hotfix ${d.hotfix} together with ${d.bundledWith.join(', ')}; its row measures the whole bundle`)
		}
	}
	points.sort((a, b) => a.at - b.at)

	const changes = []
	for (const p of points) {
		const last = changes.at(-1)
		if (last && p.at - last.at < MERGE_WITHIN_MS) {
			last.prs.push(p.pr)
			last.lastAt = p.at
		} else changes.push({ prs: [p.pr], at: p.at, lastAt: p.at })
	}

	const windows = []
	changes.forEach((c, i) => {
		const label = c.prs.join(' + ')
		if (c.prs.length > 1) notes.push(`${label} deployed within ${MERGE_WITHIN_MS / HOUR}h of each other; measured together`)
		const prevAt = changes[i - 1]?.lastAt
		const nextAt = changes[i + 1]?.at ?? now
		const beforeFrom = Math.max(c.at - hours * HOUR, dataFrom, prevAt === undefined ? -Infinity : prevAt + settle * HOUR)
		const afterFrom = c.lastAt + settle * HOUR
		const afterTo = Math.min(afterFrom + hours * HOUR, nextAt, now)
		// Both sides get the same length, so a short side can't compare a morning against two days.
		const len = Math.min(c.at - beforeFrom, afterTo - afterFrom)
		if (len < HOUR) {
			notes.push(`${label}: under 1h between it and a neighbouring deploy (or now); skipped`)
			return
		}
		if (len < hours * HOUR)
			notes.push(
				`${label}: ${h(len)} each side (neighbouring deploy, first_load start, or now)${len < 24 * HOUR ? '; under a day, so time of day differs between sides' : ''}`
			)
		windows.push([label, 'before', c.at - len, c.at, c.at], [label, 'after', afterFrom, afterFrom + len, c.at])
	})
	const overallFrom = Math.max(Date.parse(`${since}T00:00:00Z`), dataFrom + settle * HOUR)
	windows.push(['overall', 'before', overallFrom, overallFrom + hours * HOUR, now], ['overall', 'after', now - hours * HOUR, now, now])

	const tuples = windows
		.map(([label, side, from, to, order]) => `('${label}', '${side}', ${dt(from)}, ${dt(to)}, ${dt(order)})`)
		.join(',\n        ')

	// Ranks bounding a 95% CI of quantile q in a sorted array of n values (normal approximation of
	// the binomial), clamped to the array.
	const ci = (arr, q) => {
		const half = `1.96 * sqrt(length(${arr}) * ${q} * ${(1 - q).toFixed(2)})`
		return [
			`arrayElement(${arr}, toInt(greatest(1.0, floor(length(${arr}) * ${q} - ${half}))))`,
			`arrayElement(${arr}, toInt(least(toFloat(length(${arr})), ceil(length(${arr}) * ${q} + ${half}) + 1)))`,
		]
	}
	const min = MIN_LOADS[env]
	const stats = (q, name) => {
		const [bLo, bHi] = ci('b', q)
		const [aLo, aHi] = ci('a', q)
		// Staging is a handful of staff loads, so a CI test would never pass: give the direction instead.
		const verdict =
			env === 'staging'
				? `multiIf(length(b) < ${min} OR length(a) < ${min}, 'too few loads', ${name}_change_pct <= -${STAGING_FLAT_PCT}, 'looks faster', ${name}_change_pct >= ${STAGING_FLAT_PCT}, 'looks slower', 'flat')`
				: `multiIf(length(b) < ${min} OR length(a) < ${min}, 'too few loads', ${aHi} < ${bLo}, 'faster', ${aLo} > ${bHi}, 'slower', 'no clear change')`
		return `
    round(quantileIf(${q})(v, side = 'before')) AS ${name}_before,
    round(quantileIf(${q})(v, side = 'after')) AS ${name}_after,
    round(100 * (${name}_after / ${name}_before - 1)) AS ${name}_change_pct,
    ${verdict} AS ${name}_verdict,
    concat(toString(round(${bLo})), '-', toString(round(${bHi})), ' -> ', toString(round(${aLo})), '-', toString(round(${aHi}))) AS ${name}_ci`
	}

	// token to sync: d_sync_connected is the gap to whichever step came just before, not the token.
	const sql = `SELECT
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
          ('4 token to sync', toFloat(properties.t_sync_connected) - toFloat(properties.t_sync_token_fetched))
        ]) AS m
      FROM events
      WHERE event = 'first_load'
        AND timestamp >= ${dt(Math.min(...windows.map((w) => w[2])))}
        AND properties.route_kind = '${route}'
        AND properties.is_signed_in = true
    )
    WHERE v IS NOT NULL AND v < ${MAX_LOAD_MS}
  )
  GROUP BY change, metric
)
ORDER BY ordered_at, metric`

	const sqlPath = join(outDir, `${env}.sql`)
	const callPath = join(outDir, `${env}.call`)
	writeFileSync(sqlPath, sql + '\n')
	writeFileSync(callPath, `call execute-sql ${JSON.stringify({ query: sql.replace(/\s+/g, ' ') })}\n`)

	const verdictRule =
		env === 'staging'
			? `verdict is direction only (±${STAGING_FLAT_PCT}%): staging is a few staff loads, an early signal`
			: 'verdict compares 95% CIs (*_ci, before -> after): faster/slower only when they do not overlap'
	console.log(`## ${env}
PostHog: exec \`call switch-project {"projectId": ${PROJECT[env]}}\`, then send the contents of ${callPath} as the exec command.
SQL: ${sqlPath}
Windows: first_load, route_kind = '${route}', signed in; up to ${hours}h each side, skipping the first ${settle}h after each deploy.
overall = first ${hours}h of first_load data since ${since} vs the last ${hours}h. *_change_pct: negative = faster; ${verdictRule}.
population_shift: cold share moved more than ${COLD_SHIFT}. weekend_*: share of loads on Sat/Sun. Loads over ${MAX_LOAD_MS / 60_000} min are dropped (sleeping laptops).
Expected rows: ${[...new Set(windows.map((w) => w[0]))].join(', ')}. A change with no row had no loads in either window.
${notes.map((n) => `- ${n}`).join('\n')}
`)
}

for (const env of envArg === 'both' ? ['staging', 'production'] : [envArg]) build(env)
