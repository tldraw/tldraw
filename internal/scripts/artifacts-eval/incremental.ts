import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { nicelog } from '../lib/nicelog'
import { ArtifactsApi, extractReportedBytes } from './lib/artifactsApi'
import { ARTIFACTS_NAMESPACE } from './lib/config'
import { FastImportWriter, execGit, execGitFull, initRepo } from './lib/gitFastImport'
import { DocMap, diffDocMaps, toDocMap } from './lib/snapshotDiff'
import type { IncrementalMeasurement, IncrementalPushSample, SnapshotJson } from './lib/types'
import {
	historyDir,
	loadRooms,
	readJsonIfExists,
	resolveWorkDir,
	upsertMeasurement,
	writeJson,
} from './lib/workdir'
import { ensureRepoWithRemote, evalRepoName, parseWireBytes } from './pushArtifacts'

interface IncrementalArgs {
	'work-dir'?: string
	slug?: string
	holdout?: number
	batch?: number
	namespace?: string
	recheck?: boolean
}

interface VersionStep {
	timestamp: string
	files: Array<{ path: string; content: string }>
	deletes: string[]
}

/**
 * Replay a room's history and yield, per version, the worktree changes persistToPierre
 * would have written (meta.json + changed records, deletes).
 */
function computeSteps(versionsDir: string, versionFiles: string[]): VersionStep[] {
	const steps: VersionStep[] = []
	let prevMap: DocMap | null = null
	let prevMeta: string | null = null
	for (let i = 0; i < versionFiles.length; i++) {
		const snapshot = JSON.parse(
			readFileSync(join(versionsDir, versionFiles[i])).toString()
		) as SnapshotJson
		const curMap = toDocMap(snapshot)
		const diff = diffDocMaps(prevMap, curMap)
		const meta = JSON.stringify({
			documentClock: snapshot.documentClock ?? snapshot.clock ?? i,
			schema: snapshot.schema,
		})
		const files: VersionStep['files'] = []
		if (meta !== prevMeta) files.push({ path: 'meta.json', content: meta })
		for (const put of diff.puts) files.push({ path: `records/${put.id}.json`, content: put.json })
		steps.push({
			timestamp: versionFiles[i].replace(/\.json$/, ''),
			files,
			deletes: diff.deletes.map((id) => `records/${id}.json`),
		})
		prevMap = curMap
		prevMeta = meta
	}
	return steps
}

async function buildBaseRepo(dir: string, steps: VersionStep[]) {
	rmSync(dir, { recursive: true, force: true })
	await initRepo(dir)
	const writer = new FastImportWriter(dir)
	for (const step of steps) {
		await writer.commit({ timestamp: step.timestamp, files: step.files, deletes: step.deletes })
	}
	await writer.finish()
	await execGit(['reset', '--hard', 'main'], dir)
}

function applyStepToWorktree(dir: string, step: VersionStep) {
	mkdirSync(join(dir, 'records'), { recursive: true })
	for (const file of step.files) writeFileSync(join(dir, file.path), file.content)
	for (const path of step.deletes) unlinkSync(join(dir, path))
}

async function commitStep(dir: string, step: VersionStep) {
	applyStepToWorktree(dir, step)
	await execGit(['add', '-A'], dir)
	await execGit(
		[
			'-c',
			'user.name=tldraw-eval',
			'-c',
			'user.email=eval@tldraw.com',
			'commit',
			'--quiet',
			'--allow-empty',
			'-m',
			`Snapshot at ${step.timestamp}`,
			'--date',
			step.timestamp,
		],
		dir
	)
}

async function pushCli(dir: string, remote: string): Promise<IncrementalPushSample> {
	const start = Date.now()
	const { stderr } = await execGitFull(['push', '--progress', remote, 'main:main'], dir)
	return { index: 0, pushMs: Date.now() - start, wireBytes: parseWireBytes(stderr) }
}

/** isomorphic-git push with a byte-counting HTTP client — measures undeltified pack size. */
async function pushIsomorphic(dir: string, remote: string): Promise<IncrementalPushSample> {
	const git = await import('isomorphic-git')
	const http = await import('isomorphic-git/http/node')
	const fs = await import('fs')

	let sentBytes = 0
	const countingHttp = {
		async request(config: any) {
			if (config.body) {
				const chunks: Uint8Array[] = []
				for await (const chunk of config.body) {
					chunks.push(chunk)
					sentBytes += chunk.length
				}
				config = { ...config, body: chunks }
			}
			return await http.default.request(config)
		},
	}

	const url = new URL(remote)
	const password = url.password
	const username = url.username
	url.password = ''
	url.username = ''

	const start = Date.now()
	await git.default.push({
		fs,
		http: countingHttp as any,
		dir,
		url: url.toString(),
		ref: 'main',
		remoteRef: 'main',
		onAuth: () => ({ username, password }),
	})
	return { index: 0, pushMs: Date.now() - start, wireBytes: sentBytes }
}

async function recheck(args: IncrementalArgs) {
	const workDir = resolveWorkDir(args)
	const namespace = args.namespace ?? ARTIFACTS_NAMESPACE
	const api = new ArtifactsApi()
	const path = join(workDir, 'incremental.json')
	const rows = readJsonIfExists<IncrementalMeasurement[]>(path) ?? []
	for (const row of rows) {
		const details = await api.getRepo(namespace, row.repoName)
		row.serverRepoDetails = details
		const bytes = extractReportedBytes(details)
		nicelog(`${row.repoName}: reported=${row.serverReportedBytes} recheck=${bytes}`)
		row.serverReportedBytes = bytes
	}
	writeJson(path, rows)
}

export async function incremental(args: IncrementalArgs) {
	if (args.recheck) return await recheck(args)

	const workDir = resolveWorkDir(args)
	const namespace = args.namespace ?? ARTIFACTS_NAMESPACE
	const holdout = args.holdout ?? 100
	const batch = args.batch ?? 10
	const api = new ArtifactsApi()

	const rooms = loadRooms(workDir)
	// Default to the median-sized room with enough versions to hold out.
	const eligible = rooms
		.filter((r) => r.versionCount > holdout * 2)
		.sort((a, b) => a.totalRawBytes - b.totalRawBytes)
	const room = args.slug
		? rooms.find((r) => r.slug === args.slug)
		: eligible[Math.floor(eligible.length / 2)]
	if (!room) throw new Error(`No suitable room (need >${holdout * 2} versions, or pass --slug)`)

	const versionsDir = historyDir(workDir, room.slug)
	const versionFiles = readdirSync(versionsDir)
		.filter((f) => f.endsWith('.json'))
		.sort()
	nicelog(`${room.slug}: replaying last ${holdout} of ${versionFiles.length} versions`)

	const steps = computeSteps(versionsDir, versionFiles)
	const baseSteps = steps.slice(0, -holdout)
	const holdoutSteps = steps.slice(-holdout)

	const baseDir = join(workDir, 'incr', room.slug, 'base')
	nicelog(`building base repo (${baseSteps.length} commits)...`)
	await buildBaseRepo(baseDir, baseSteps)

	const variants = [
		{ name: 'v1-git-per-commit' as const, every: 1, iso: false },
		{ name: 'v2-isomorphic-per-commit' as const, every: 1, iso: true },
		{ name: 'v3-git-batched' as const, every: batch, iso: false },
	]

	for (const variant of variants) {
		const dir = join(workDir, 'incr', room.slug, variant.name)
		rmSync(dir, { recursive: true, force: true })
		cpSync(baseDir, dir, { recursive: true })

		const repoName = evalRepoName(`incr-${variant.name}`, room.slug)
		const { authedRemote } = await ensureRepoWithRemote(
			api,
			namespace,
			repoName,
			`tldraw incremental eval ${variant.name}: ${room.slug}`
		)

		// Base backfill always goes up with git CLI (deltified), so variants differ only
		// in how the incremental pushes are sent.
		nicelog(`${variant.name}: pushing base...`)
		await execGitFull(['push', '--force', '--progress', authedRemote, 'main:main'], dir)
		const baseDetails = await api.getRepo(namespace, repoName)
		const baseReported = extractReportedBytes(baseDetails)

		const pushes: IncrementalPushSample[] = []
		for (let i = 0; i < holdoutSteps.length; i++) {
			await commitStep(dir, holdoutSteps[i])
			const shouldPush = (i + 1) % variant.every === 0 || i === holdoutSteps.length - 1
			if (!shouldPush) continue
			const sample = variant.iso
				? await pushIsomorphic(dir, authedRemote)
				: await pushCli(dir, authedRemote)
			sample.index = i
			pushes.push(sample)
			if (pushes.length % 20 === 0) nicelog(`  ${variant.name}: ${pushes.length} pushes`)
		}

		const details = await api.getRepo(namespace, repoName)
		const reported = extractReportedBytes(details)
		const totalWireBytes = pushes.every((p) => p.wireBytes !== null)
			? pushes.reduce((sum, p) => sum + (p.wireBytes ?? 0), 0)
			: null

		const measurement: IncrementalMeasurement = {
			slug: room.slug,
			variant: variant.name,
			repoName,
			pushes,
			totalWireBytes,
			serverReportedBytes: reported,
			serverRepoDetails: details,
		}
		upsertMeasurement(join(workDir, 'incremental.json'), ['slug', 'variant'], measurement)

		const avgMs = pushes.reduce((sum, p) => sum + p.pushMs, 0) / pushes.length
		nicelog(
			`${variant.name}: ${pushes.length} pushes, avg ${avgMs.toFixed(0)}ms, ` +
				`wire=${totalWireBytes === null ? '?' : (totalWireBytes / 1024).toFixed(0) + 'KB'} ` +
				`serverReported base=${baseReported ?? '?'} final=${reported ?? '?'}`
		)
	}
	nicelog('Re-run with --recheck in ~24h to detect async repack.')
}
