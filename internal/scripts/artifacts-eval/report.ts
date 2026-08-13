import { writeFileSync } from 'fs'
import { join } from 'path'
import kleur from 'kleur'
import { nicelog } from '../lib/nicelog'
import {
	ARTIFACTS_FREE_OPS_PER_MO,
	ARTIFACTS_MAX_ACCOUNT_GB,
	ARTIFACTS_MAX_REPO_GB,
	ARTIFACTS_STORAGE_USD_PER_GB_MO,
	ARTIFACTS_USD_PER_1K_OPS,
	R2_HISTORY_TOTAL_GB,
	R2_STORAGE_USD_PER_GB_MO,
} from './lib/config'
import type { EvalResults, Layout } from './lib/types'
import { loadResults, resolveWorkDir } from './lib/workdir'

interface ReportArgs {
	'work-dir'?: string
	/** Total live file count for scaling per-room persist rates to the fleet. */
	'fleet-size'?: number
}

const GB = 1024 ** 3
const MB = 1024 ** 2

function fmtBytes(bytes: number | null | undefined): string {
	if (bytes === null || bytes === undefined) return '?'
	if (bytes >= GB) return `${(bytes / GB).toFixed(2)}GB`
	if (bytes >= MB) return `${(bytes / MB).toFixed(1)}MB`
	return `${(bytes / 1024).toFixed(0)}KB`
}

function aggregateRatio(results: EvalResults, layout: Layout) {
	const rows = results.measurements.filter((m) => m.layout === layout)
	const raw = rows.reduce((sum, m) => sum + m.rawBytes, 0)
	const packed = rows.reduce((sum, m) => sum + m.gcPackedBytes, 0)
	const prePack = rows.reduce((sum, m) => sum + m.prePackBytes, 0)
	return { raw, packed, prePack, ratio: packed > 0 ? raw / packed : 0 }
}

/**
 * Persist events per room-day from the real timestamp series collected at select time.
 * Each history key was one 8s-throttled persist, so this is ground truth, not an estimate.
 */
function persistStats(results: EvalResults) {
	let totalEvents = 0
	let totalDays = 0
	for (const room of results.rooms) {
		if (room.timestamps.length < 2) continue
		const first = new Date(room.timestamps[0]).getTime()
		const last = new Date(room.timestamps.at(-1)!).getTime()
		const days = Math.max((last - first) / (24 * 3600 * 1000), 1 / 24)
		totalEvents += room.timestamps.length
		totalDays += days
	}
	return { eventsPerRoomDay: totalDays > 0 ? totalEvents / totalDays : 0 }
}

export async function report(args: ReportArgs) {
	const workDir = resolveWorkDir(args)
	const results = loadResults(workDir)
	if (results.measurements.length === 0) {
		throw new Error('No measurements yet — run the build stage first')
	}
	const lines: string[] = []
	const emit = (line = '') => {
		lines.push(line)
		nicelog(line)
	}

	emit('# Cloudflare Artifacts evaluation results')
	emit()
	emit('## Per-room measurements')
	emit()
	emit(
		'| room | stratum | commits | raw | records: packed (ratio) | blob: packed (ratio) | push | server-reported |'
	)
	emit('| --- | --- | --- | --- | --- | --- | --- | --- |')
	for (const room of results.rooms) {
		const rec = results.measurements.find((m) => m.slug === room.slug && m.layout === 'records')
		const blob = results.measurements.find((m) => m.slug === room.slug && m.layout === 'blob')
		const push = results.pushes.find((p) => p.slug === room.slug && p.layout === 'records')
		if (!rec && !blob) continue
		const cell = (m?: { rawBytes: number; gcPackedBytes: number }) =>
			m ? `${fmtBytes(m.gcPackedBytes)} (${(m.rawBytes / m.gcPackedBytes).toFixed(0)}x)` : '—'
		emit(
			`| ${room.slug} | ${room.stratum} | ${rec?.commitCount ?? blob?.commitCount} | ` +
				`${fmtBytes(rec?.rawBytes ?? blob?.rawBytes)} | ${cell(rec)} | ${cell(blob)} | ` +
				`${push ? (push.pushMs / 1000).toFixed(1) + 's' : '—'} | ` +
				`${push ? fmtBytes(push.serverReportedBytesRecheck ?? push.serverReportedBytes) : '—'} |`
		)
	}

	emit()
	emit('## Aggregate compression')
	emit()
	for (const layout of ['records', 'blob'] as const) {
		const agg = aggregateRatio(results, layout)
		if (agg.packed === 0) continue
		emit(
			`- **${layout}**: ${fmtBytes(agg.raw)} raw -> ${fmtBytes(agg.packed)} packed = ` +
				`**${agg.ratio.toFixed(0)}x** (pre-gc pack: ${fmtBytes(agg.prePack)}, ` +
				`${(agg.raw / agg.prePack).toFixed(0)}x without repack)`
		)
	}
	const unverified = results.measurements.filter((m) => m.layout === 'records' && !m.verified)
	if (unverified.length > 0) {
		emit(`- ${kleur.red('WARNING')}: ${unverified.length} repos failed fidelity verification`)
	}

	const best = aggregateRatio(results, 'records')
	const breakEven = (ARTIFACTS_STORAGE_USD_PER_GB_MO / R2_STORAGE_USD_PER_GB_MO) as number

	emit()
	emit('## Cost model (storage)')
	emit()
	emit(
		`- R2 status quo: ${R2_HISTORY_TOTAL_GB.toLocaleString()}GB x $${R2_STORAGE_USD_PER_GB_MO}/GB-mo = **$${(R2_HISTORY_TOTAL_GB * R2_STORAGE_USD_PER_GB_MO).toLocaleString()}/mo**`
	)
	emit(
		`- **Break-even compression is ${breakEven.toFixed(1)}x** (Artifacts $${ARTIFACTS_STORAGE_USD_PER_GB_MO}/GB-mo vs R2 $${R2_STORAGE_USD_PER_GB_MO}/GB-mo) — below that, Artifacts loses on storage alone`
	)
	if (best.ratio > 0) {
		const projectedGb = R2_HISTORY_TOTAL_GB / best.ratio
		emit(
			`- Measured ratio (records layout): **${best.ratio.toFixed(0)}x** -> ${projectedGb.toFixed(0)}GB -> ` +
				`**$${(projectedGb * ARTIFACTS_STORAGE_USD_PER_GB_MO).toFixed(0)}/mo** ` +
				`(assumes billing on packed bytes — verify with the server-reported column!)`
		)
		if (projectedGb > ARTIFACTS_MAX_ACCOUNT_GB) {
			emit(
				`- ${kleur.yellow('LIMIT')}: projected ${projectedGb.toFixed(0)}GB exceeds the ${ARTIFACTS_MAX_ACCOUNT_GB}GB account cap — needs a raise from Cloudflare`
			)
		}
	}
	const worstRepo = [...results.measurements].sort((a, b) => b.gcPackedBytes - a.gcPackedBytes)[0]
	if (worstRepo && worstRepo.gcPackedBytes > ARTIFACTS_MAX_REPO_GB * GB) {
		emit(
			`- ${kleur.yellow('LIMIT')}: ${worstRepo.slug} packs to ${fmtBytes(worstRepo.gcPackedBytes)}, over the ${ARTIFACTS_MAX_REPO_GB}GB repo cap`
		)
	}

	emit()
	emit('## Cost model (operations)')
	emit()
	const { eventsPerRoomDay } = persistStats(results)
	emit(
		`- Observed persist rate in sample: ${eventsPerRoomDay.toFixed(1)} persists per room-day (from real history timestamps)`
	)
	const fleet = args['fleet-size']
	if (fleet) {
		for (const [label, divisor] of [
			['push per persist', 1],
			['batched 10:1 (~80s cadence)', 10],
		] as const) {
			const opsPerMo = (eventsPerRoomDay * fleet * 30) / divisor
			const cost =
				(Math.max(opsPerMo - ARTIFACTS_FREE_OPS_PER_MO, 0) / 1000) * ARTIFACTS_USD_PER_1K_OPS
			emit(
				`- ${label}: ~${Math.round(opsPerMo).toLocaleString()} ops/mo x $${ARTIFACTS_USD_PER_1K_OPS}/1k = **$${cost.toFixed(0)}/mo** (fleet=${fleet.toLocaleString()} active rooms/day)`
			)
		}
	} else {
		emit('- Pass --fleet-size <active rooms per day> to project fleet-wide ops cost')
		emit('- Cross-check against Grafana `pierre_incremental_write_chars` x10 for write throughput')
	}

	if (results.incremental.length > 0) {
		emit()
		emit('## Incremental push behavior (ongoing pipeline)')
		emit()
		emit('| variant | pushes | avg latency | total wire | server-reported |')
		emit('| --- | --- | --- | --- | --- |')
		for (const row of results.incremental) {
			const avg = row.pushes.reduce((sum, p) => sum + p.pushMs, 0) / row.pushes.length
			emit(
				`| ${row.variant} | ${row.pushes.length} | ${avg.toFixed(0)}ms | ` +
					`${fmtBytes(row.totalWireBytes)} | ${fmtBytes(row.serverReportedBytes)} |`
			)
		}
		emit()
		emit(
			'If v2 (isomorphic-git, undeltified) server-reported growth is much larger than v1 and does not converge on recheck, Worker-native pushes need Cloudflare-side repack before this replaces Pierre in the DO.'
		)
	}

	const reportPath = join(workDir, 'report.md')
	writeFileSync(reportPath, lines.join('\n') + '\n')
	nicelog(kleur.green(`\nWrote ${reportPath}`))
}
