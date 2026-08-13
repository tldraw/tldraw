import { createHash } from 'crypto'
import { existsSync } from 'fs'
import { join } from 'path'
import { nicelog } from '../lib/nicelog'
import {
	ArtifactsApi,
	extractRemote,
	extractReportedBytes,
	extractToken,
	toAuthenticatedRemote,
} from './lib/artifactsApi'
import { ARTIFACTS_NAMESPACE } from './lib/config'
import { execGit, execGitFull } from './lib/gitFastImport'
import type { Layout, PushMeasurement, RepoMeasurement } from './lib/types'
import {
	loadRooms,
	readJsonIfExists,
	repoDir,
	resolveWorkDir,
	upsertMeasurement,
	writeJson,
} from './lib/workdir'

interface PushArgs {
	'work-dir'?: string
	slug?: string
	layout?: Layout
	namespace?: string
	recheck?: boolean
	force?: boolean
}

/** Parse "Writing objects: 100% (123/123), 4.56 MiB | ..." from push stderr. */
export function parseWireBytes(stderr: string): number | null {
	const match = stderr.match(/Writing objects: 100% \([^)]+\), ([\d.]+) ([KMG])iB/)
	if (!match) {
		const bytesMatch = stderr.match(/Writing objects: 100% \([^)]+\), (\d+) bytes/)
		return bytesMatch ? parseInt(bytesMatch[1], 10) : null
	}
	const value = parseFloat(match[1])
	const unit = { K: 1024, M: 1024 ** 2, G: 1024 ** 3 }[match[2]]!
	return Math.round(value * unit)
}

export function evalRepoName(layout: string, slug: string): string {
	// Repo names: letters, digits, ., _, - and must start alphanumeric.
	return `eval-${layout}-${slug}`.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function ensureRepoWithRemote(
	api: ArtifactsApi,
	namespace: string,
	repoName: string,
	description: string
): Promise<{ remote: string; authedRemote: string; details: any }> {
	let details = await api.getRepo(namespace, repoName)
	let token: string | null = null
	if (!details) {
		details = await api.createRepo(namespace, repoName, description)
		token = extractToken(details)
	}
	const remote = extractRemote(details)
	if (!token) {
		token = extractToken(await api.createToken(namespace, repoName, 'write'))
	}
	if (!token) {
		throw new Error(`Could not obtain a write token for ${namespace}/${repoName}`)
	}
	return { remote, authedRemote: toAuthenticatedRemote(remote, token), details }
}

function sha256(buf: Buffer | string): string {
	return createHash('sha256').update(buf).digest('hex')
}

async function recheck(args: PushArgs) {
	const workDir = resolveWorkDir(args)
	const namespace = args.namespace ?? ARTIFACTS_NAMESPACE
	const api = new ArtifactsApi()
	const pushesPath = join(workDir, 'pushes.json')
	const pushes = readJsonIfExists<PushMeasurement[]>(pushesPath) ?? []
	for (const push of pushes) {
		const details = await api.getRepo(namespace, push.repoName)
		push.serverRepoDetails = details
		push.serverReportedBytesRecheck = extractReportedBytes(details)
		push.recheckedAt = new Date().toISOString()
		nicelog(
			`${push.repoName}: reported=${push.serverReportedBytes} recheck=${push.serverReportedBytesRecheck}`
		)
	}
	writeJson(pushesPath, pushes)
}

export async function pushArtifacts(args: PushArgs) {
	if (args.recheck) return await recheck(args)

	const workDir = resolveWorkDir(args)
	const namespace = args.namespace ?? ARTIFACTS_NAMESPACE
	const rooms = loadRooms(workDir).filter((room) => !args.slug || room.slug === args.slug)
	const layouts: Layout[] = args.layout ? [args.layout] : ['records', 'blob']
	const measurements = readJsonIfExists<RepoMeasurement[]>(join(workDir, 'measurements.json')) ?? []
	const pushesPath = join(workDir, 'pushes.json')
	const existing = readJsonIfExists<PushMeasurement[]>(pushesPath) ?? []
	const api = new ArtifactsApi()

	for (const room of rooms) {
		for (const layout of layouts) {
			const dir = repoDir(workDir, room.slug, layout)
			if (!existsSync(dir)) continue
			if (!measurements.some((m) => m.slug === room.slug && m.layout === layout)) continue
			if (!args.force && existing.some((p) => p.slug === room.slug && p.layout === layout)) {
				nicelog(`${room.slug}/${layout}: already pushed, skipping (--force to re-push)`)
				continue
			}

			const repoName = evalRepoName(layout, room.slug)
			const { authedRemote } = await ensureRepoWithRemote(
				api,
				namespace,
				repoName,
				`tldraw snapshot-history eval: ${room.slug} (${layout})`
			)

			nicelog(`${room.slug}/${layout}: pushing to ${namespace}/${repoName}...`)
			const start = Date.now()
			let stderr = ''
			try {
				;({ stderr } = await execGitFull(
					['push', '--force', '--progress', authedRemote, 'main:main'],
					dir
				))
			} catch (err: any) {
				// The beta endpoint sometimes closes the stream uncleanly after a successful
				// ref update, making git exit nonzero. Trust the remote state, not the exit code.
				stderr = err?.stderr ?? ''
				const localHead = await execGit(['rev-parse', 'main'], dir)
				const log = await api.log(namespace, repoName, 1)
				const remoteHead = Array.isArray(log) ? log[0]?.hash : null
				if (remoteHead !== localHead) throw err
				nicelog(`  push exited nonzero but remote HEAD matches local — continuing`)
			}
			const pushMs = Date.now() - start
			const wireBytes = parseWireBytes(stderr)

			// Read-back verification via REST.
			let readBackOk = true
			let commitCountRemote: number | null = null
			try {
				const log = await api.log(namespace, repoName)
				const commits = Array.isArray(log) ? log : (log?.commits ?? log?.log ?? null)
				commitCountRemote = Array.isArray(commits) ? commits.length : null

				const checkPath = layout === 'records' ? 'meta.json' : 'snapshot.json'
				const remoteBytes = await api.rawFile(namespace, repoName, 'main', checkPath)
				const { stdout: localBytes } = await execGitFull(['show', `HEAD:${checkPath}`], dir)
				readBackOk = sha256(remoteBytes) === sha256(localBytes)
			} catch (err) {
				nicelog(`  read-back failed: ${err}`)
				readBackOk = false
			}

			const details = await api.getRepo(namespace, repoName)
			const measurement: PushMeasurement = {
				slug: room.slug,
				layout,
				repoName,
				pushMs,
				wireBytes,
				commitCountRemote,
				readBackOk,
				serverRepoDetails: details,
				serverReportedBytes: extractReportedBytes(details),
			}
			upsertMeasurement(pushesPath, ['slug', 'layout'], measurement)

			nicelog(
				`${room.slug}/${layout}: pushed in ${(pushMs / 1000).toFixed(1)}s ` +
					`wire=${wireBytes === null ? '?' : (wireBytes / 1024 / 1024).toFixed(2) + 'MB'} ` +
					`remoteCommits=${commitCountRemote ?? '?'} readBack=${readBackOk} ` +
					`serverReported=${measurement.serverReportedBytes ?? 'not found in response'}`
			)
		}
	}
	nicelog('Re-run with --recheck in ~24h to detect async repack / billing-metric lag.')
}
