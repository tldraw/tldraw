import { join } from 'path'
import { nicelog } from '../lib/nicelog'
import { HISTORY_BUCKETS, roomHistoryPrefix } from './lib/config'
import { createR2Client, listAllObjects, listSlugs } from './lib/r2'
import type { EvalEnv, RoomSample, Stratum } from './lib/types'
import { resolveWorkDir, writeJson } from './lib/workdir'

interface SelectArgs {
	env: EvalEnv
	'from-db'?: boolean
	'from-listing'?: boolean
	/** Comma-separated explicit slug list — skips sampling and stratification entirely. */
	slugs?: string
	candidates?: number
	'per-cell'?: number
	'work-dir'?: string
}

async function getCandidateSlugsFromDb(count: number): Promise<string[]> {
	const { makeEnv } = await import('../lib/makeEnv')
	const { Client } = await import('pg')
	const env = makeEnv(['SUPABASE_PRODUCTION_DB_URL'])
	const client = new Client({ connectionString: env.SUPABASE_PRODUCTION_DB_URL })
	await client.connect()
	try {
		// Long-lived files are more likely to have long histories. Over-sample; the
		// LIST-based stats pass below does the real stratification.
		const threeDays = 3 * 24 * 60 * 60 * 1000
		const { rows } = await client.query(
			`SELECT id FROM file
			 TABLESAMPLE BERNOULLI(30)
			 WHERE ("updatedAt" - "createdAt") >= $1
			 LIMIT $2;`,
			[threeDays, count]
		)
		return rows.map((r: { id: string }) => r.id)
	} finally {
		await client.end()
	}
}

function sizeStratum(latestSize: number): 'small' | 'medium' | 'large' {
	if (latestSize < 100 * 1024) return 'small'
	if (latestSize < 2 * 1024 * 1024) return 'medium'
	return 'large'
}

function historyStratum(versionCount: number): 'short' | 'medium' | 'long' {
	if (versionCount < 50) return 'short'
	if (versionCount < 1000) return 'medium'
	return 'long'
}

export async function selectRooms(args: SelectArgs) {
	const env: EvalEnv = args.env ?? 'staging'
	const bucket = HISTORY_BUCKETS[env]
	const candidateCount = args.candidates ?? 300
	const perCell = args['per-cell'] ?? 3
	const workDir = resolveWorkDir(args)
	const r2 = createR2Client()

	const explicitSlugs = args.slugs
		?.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
	const useDb = args['from-db'] ?? (env === 'production' && !args['from-listing'])
	nicelog(
		`Selecting rooms from ${env} (${bucket}), candidates via ${
			explicitSlugs ? 'explicit --slugs' : useDb ? 'db' : 'listing'
		}`
	)

	const slugs =
		explicitSlugs ??
		(useDb
			? await getCandidateSlugsFromDb(candidateCount)
			: await listSlugs(r2, bucket, 'app_rooms/', candidateCount))
	nicelog(`${slugs.length} candidate slugs`)

	// Stats come from LIST alone — no downloads. Each key under the room prefix is one
	// real persist event, so the timestamp series doubles as persist-rate data.
	const samples: RoomSample[] = []
	for (const slug of slugs) {
		const objects = await listAllObjects(r2, bucket, roomHistoryPrefix(slug, true))
		if (objects.length === 0) {
			if (explicitSlugs) nicelog(`  WARNING: ${slug} has no history in ${bucket}`)
			continue
		}
		objects.sort((a, b) => a.key.localeCompare(b.key))
		const timestamps = objects.map((o) => o.key.split('/').at(-1)!)
		const totalRawBytes = objects.reduce((sum, o) => sum + o.size, 0)
		const latestSize = objects.at(-1)!.size
		samples.push({
			slug,
			env,
			isApp: true,
			versionCount: objects.length,
			totalRawBytes,
			latestSize,
			stratum: `${sizeStratum(latestSize)}/${historyStratum(objects.length)}` as Stratum,
			timestamps,
		})
		if (samples.length % 25 === 0) nicelog(`  ...stats for ${samples.length} rooms`)
	}
	nicelog(`${samples.length} rooms with history`)

	// Explicit slugs are all taken as-is; sampled candidates get stratified below.
	if (explicitSlugs) {
		writeJson(join(workDir, 'rooms.json'), samples)
		for (const room of samples) {
			nicelog(
				`  ${room.slug}  ${room.stratum}  versions=${room.versionCount}  raw=${(room.totalRawBytes / 1024 / 1024).toFixed(1)}MB`
			)
		}
		nicelog(`Wrote ${join(workDir, 'rooms.json')}`)
		return
	}

	// Up to N per stratum cell, plus the largest room (10GB/repo stress) and the
	// longest history (ops-count stress).
	const byCell = new Map<Stratum, RoomSample[]>()
	for (const sample of samples) {
		const cell = byCell.get(sample.stratum) ?? []
		cell.push(sample)
		byCell.set(sample.stratum, cell)
	}
	const selected = new Map<string, RoomSample>()
	for (const [, cell] of byCell) {
		cell.sort((a, b) => b.totalRawBytes - a.totalRawBytes)
		for (const sample of cell.slice(0, perCell)) selected.set(sample.slug, sample)
	}
	const largest = [...samples].sort((a, b) => b.totalRawBytes - a.totalRawBytes)[0]
	const longest = [...samples].sort((a, b) => b.versionCount - a.versionCount)[0]
	if (largest) selected.set(largest.slug, largest)
	if (longest) selected.set(longest.slug, longest)

	const rooms = [...selected.values()]
	writeJson(join(workDir, 'rooms.json'), rooms)

	nicelog(`Selected ${rooms.length} rooms:`)
	for (const room of rooms) {
		nicelog(
			`  ${room.slug}  ${room.stratum}  versions=${room.versionCount}  raw=${(room.totalRawBytes / 1024 / 1024).toFixed(1)}MB`
		)
	}
	nicelog(`Wrote ${join(workDir, 'rooms.json')}`)
}
