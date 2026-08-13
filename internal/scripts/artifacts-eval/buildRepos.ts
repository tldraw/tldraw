import { existsSync, readFileSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { nicelog } from '../lib/nicelog'
import {
	FastImportWriter,
	commitCount,
	execGit,
	gcAggressive,
	initRepo,
	repoObjectBytes,
} from './lib/gitFastImport'
import { DocMap, diffDocMaps, toDocMap } from './lib/snapshotDiff'
import type { Layout, RepoMeasurement, SnapshotJson } from './lib/types'
import {
	historyDir,
	loadRooms,
	readJsonIfExists,
	repoDir,
	resolveWorkDir,
	upsertMeasurement,
} from './lib/workdir'

interface BuildArgs {
	'work-dir'?: string
	slug?: string
	layout?: Layout
	force?: boolean
	'skip-verify'?: boolean
}

/** Deterministic PRNG so verification picks the same spot-checks on re-runs. */
function makeRng(seed: number) {
	let state = seed
	return () => {
		state = (((Math.imul(state, 48271) + 1) % 2147483647) + 2147483647) % 2147483647
		return state / 2147483647
	}
}

function listVersionFiles(dir: string): string[] {
	return readdirSync(dir)
		.filter((name) => name.endsWith('.json'))
		.sort()
}

function metaJson(snapshot: SnapshotJson, fallbackClock: number): string {
	return JSON.stringify({
		documentClock: snapshot.documentClock ?? snapshot.clock ?? fallbackClock,
		schema: snapshot.schema,
	})
}

async function buildRecordsRepo(
	dir: string,
	versionsDir: string,
	versionFiles: string[]
): Promise<{
	rawBytes: number
	recordFileCount: number
	diffsByCommit: Map<number, { puts: string[]; deletes: string[] }>
}> {
	await initRepo(dir)
	const writer = new FastImportWriter(dir)
	let rawBytes = 0
	let prevMap: DocMap | null = null
	let prevMetaJson: string | null = null
	const recordIds = new Set<string>()
	const diffsByCommit = new Map<number, { puts: string[]; deletes: string[] }>()

	for (let i = 0; i < versionFiles.length; i++) {
		const raw = readFileSync(join(versionsDir, versionFiles[i]))
		rawBytes += raw.length
		const snapshot = JSON.parse(raw.toString()) as SnapshotJson
		const curMap = toDocMap(snapshot)
		const diff = diffDocMaps(prevMap, curMap)
		const meta = metaJson(snapshot, i)
		const timestamp = versionFiles[i].replace(/\.json$/, '')

		const files: Array<{ path: string; content: string }> = []
		// Pierre rewrites meta.json on every commit; only skip when it is byte-identical
		// (fast-import would otherwise produce an empty commit for no-op versions).
		if (meta !== prevMetaJson) files.push({ path: 'meta.json', content: meta })
		for (const put of diff.puts) {
			files.push({ path: `records/${put.id}.json`, content: put.json })
			recordIds.add(put.id)
		}
		diffsByCommit.set(i, { puts: diff.puts.map((p) => p.id), deletes: diff.deletes })

		await writer.commit({
			timestamp,
			files,
			deletes: diff.deletes.map((id) => `records/${id}.json`),
		})
		prevMap = curMap
		prevMetaJson = meta
	}

	await writer.finish()
	return { rawBytes, recordFileCount: recordIds.size, diffsByCommit }
}

async function buildBlobRepo(
	dir: string,
	versionsDir: string,
	versionFiles: string[]
): Promise<{ rawBytes: number }> {
	await initRepo(dir)
	const writer = new FastImportWriter(dir)
	let rawBytes = 0
	for (const versionFile of versionFiles) {
		// Raw R2 bytes, unmodified, so zlib/delta behavior matches production content.
		const raw = readFileSync(join(versionsDir, versionFile))
		rawBytes += raw.length
		await writer.commit({
			timestamp: versionFile.replace(/\.json$/, ''),
			files: [{ path: 'snapshot.json', content: raw }],
			deletes: [],
		})
	}
	await writer.finish()
	return { rawBytes }
}

async function verifyRecordsRepo(
	dir: string,
	versionsDir: string,
	versionFiles: string[],
	diffsByCommit: Map<number, { puts: string[]; deletes: string[] }>
): Promise<boolean> {
	const rng = makeRng(versionFiles.length * 7919 + dir.length)
	let ok = true

	// Fidelity: the id set at HEAD must match the final snapshot exactly.
	const finalSnapshot = JSON.parse(
		readFileSync(join(versionsDir, versionFiles.at(-1)!)).toString()
	) as SnapshotJson
	const expectedIds = new Set(finalSnapshot.documents.map((d) => d.state.id))
	const treePaths = (await execGit(['ls-tree', '-r', '--name-only', 'HEAD'], dir)).split('\n')
	const headIds = new Set(
		treePaths
			.filter((p) => p.startsWith('records/'))
			.map((p) => p.slice('records/'.length, -'.json'.length))
	)
	if (headIds.size !== expectedIds.size || [...expectedIds].some((id) => !headIds.has(id))) {
		nicelog(
			`  VERIFY FAIL: HEAD has ${headIds.size} records, final snapshot has ${expectedIds.size}`
		)
		ok = false
	}

	// Spot-check three records byte-for-byte at HEAD.
	const docs = finalSnapshot.documents
	for (let i = 0; i < Math.min(3, docs.length); i++) {
		const doc = docs[Math.floor(rng() * docs.length)]
		const expected = JSON.stringify(doc.state)
		const actual = await execGit(['show', `HEAD:records/${doc.state.id}.json`], dir)
		if (actual !== expected) {
			nicelog(`  VERIFY FAIL: record ${doc.state.id} differs at HEAD`)
			ok = false
		}
	}

	// Diff correctness: git's changed paths must match snapshotDiff for random consecutive pairs.
	const commits = (await execGit(['rev-list', '--reverse', 'main'], dir)).split('\n')
	for (let check = 0; check < 3 && commits.length > 1; check++) {
		const i = 1 + Math.floor(rng() * (commits.length - 1))
		const nameStatus = await execGit(
			['diff', '--name-status', `${commits[i - 1]}..${commits[i]}`],
			dir
		)
		const gitPuts = new Set<string>()
		const gitDeletes = new Set<string>()
		for (const line of nameStatus.split('\n').filter(Boolean)) {
			const [status, path] = line.split('\t')
			if (!path.startsWith('records/')) continue
			const id = path.slice('records/'.length, -'.json'.length)
			if (status === 'D') gitDeletes.add(id)
			else gitPuts.add(id)
		}
		const expected = diffsByCommit.get(i)!
		const putsMatch =
			gitPuts.size === expected.puts.length && expected.puts.every((id) => gitPuts.has(id))
		const deletesMatch =
			gitDeletes.size === expected.deletes.length &&
			expected.deletes.every((id) => gitDeletes.has(id))
		if (!putsMatch || !deletesMatch) {
			nicelog(`  VERIFY FAIL: commit ${i} diff mismatch (git vs snapshotDiff)`)
			ok = false
		}
	}

	return ok
}

export async function buildRepos(args: BuildArgs) {
	const workDir = resolveWorkDir(args)
	const rooms = loadRooms(workDir).filter((room) => !args.slug || room.slug === args.slug)
	const layouts: Layout[] = args.layout ? [args.layout] : ['records', 'blob']
	const measurementsPath = join(workDir, 'measurements.json')
	const existing = readJsonIfExists<RepoMeasurement[]>(measurementsPath) ?? []

	for (const room of rooms) {
		const versionsDir = historyDir(workDir, room.slug)
		if (!existsSync(versionsDir)) {
			nicelog(`${room.slug}: no fetched history, skipping (run fetch first)`)
			continue
		}
		const versionFiles = listVersionFiles(versionsDir)

		for (const layout of layouts) {
			if (!args.force && existing.some((m) => m.slug === room.slug && m.layout === layout)) {
				nicelog(`${room.slug}/${layout}: already measured, skipping (--force to rebuild)`)
				continue
			}
			const dir = repoDir(workDir, room.slug, layout)
			rmSync(dir, { recursive: true, force: true })

			nicelog(`${room.slug}/${layout}: building ${versionFiles.length} commits...`)
			const start = Date.now()
			let rawBytes: number
			let recordFileCount = 0
			let verified = true
			if (layout === 'records') {
				const result = await buildRecordsRepo(dir, versionsDir, versionFiles)
				rawBytes = result.rawBytes
				recordFileCount = result.recordFileCount
				if (!args['skip-verify']) {
					verified = await verifyRecordsRepo(dir, versionsDir, versionFiles, result.diffsByCommit)
				}
			} else {
				const result = await buildBlobRepo(dir, versionsDir, versionFiles)
				rawBytes = result.rawBytes
			}

			const prePackBytes = await repoObjectBytes(dir)
			await gcAggressive(dir)
			const gcPackedBytes = await repoObjectBytes(dir)
			const buildMs = Date.now() - start

			const measurement: RepoMeasurement = {
				slug: room.slug,
				layout,
				commitCount: await commitCount(dir),
				recordFileCount,
				rawBytes,
				prePackBytes,
				gcPackedBytes,
				buildMs,
				verified,
			}
			upsertMeasurement(measurementsPath, ['slug', 'layout'], measurement)

			const ratio = rawBytes / gcPackedBytes
			nicelog(
				`${room.slug}/${layout}: raw=${(rawBytes / 1024 / 1024).toFixed(1)}MB ` +
					`prePack=${(prePackBytes / 1024 / 1024).toFixed(1)}MB ` +
					`gcPacked=${(gcPackedBytes / 1024 / 1024).toFixed(2)}MB ` +
					`ratio=${ratio.toFixed(1)}x verified=${verified} (${(buildMs / 1000).toFixed(1)}s)`
			)
		}
	}
}
