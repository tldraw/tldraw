import { Environment } from '../types'
import { hashSlugToBucket } from './createPierreClient'

/**
 * Shared pieces of the Cloudflare Artifacts integration: repo naming, the rollout gate,
 * and content reads (history list, snapshot at a commit). The write path lives in
 * artifactsClient.ts / TLFileDurableObject.
 */

export const ARTIFACTS_AUTHOR = { name: 'huppy [bot]', email: 'huppy@tldraw.com' }

/**
 * Repo names must start alphanumeric and may contain [a-zA-Z0-9._-]; file slugs can
 * start with '-' (nanoid), so prefix and sanitize. Environment isolation lives in the
 * namespace (wrangler.toml: production "snapshots", elsewhere "snapshots-preview"),
 * not the repo name — which keeps names stable if a repo is ever moved across
 * namespaces and keeps the delete hook env-agnostic.
 */
export function getArtifactsRepoName(slug: string): string {
	return `files-${slug}`.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Must match the namespaces configured on the ARTIFACTS binding in wrangler.toml; used
 * only by the REST read fallback (the binding itself is already namespace-scoped).
 */
export function getArtifactsNamespace(env: Environment): string {
	return env.TLDRAW_ENV === 'production' ? 'snapshots' : 'snapshots-preview'
}

/**
 * In production, Artifacts dual-write is enabled for ARTIFACTS_ROLLOUT_PERCENT of app
 * file slugs, using the same hash bucket space as the Pierre rollout so that at equal
 * percentages the cohorts are identical — direct comparison on identical traffic.
 * Unset or non-numeric percent means off (fail-safe). Elsewhere, all slugs.
 */
export function isSlugInArtifactsRollout(env: Environment, slug: string): boolean {
	if (env.TLDRAW_ENV !== 'production') {
		return true
	}
	const percent = Number(env.ARTIFACTS_ROLLOUT_PERCENT)
	if (!Number.isFinite(percent)) return false
	return hashSlugToBucket(slug) < percent
}

export interface ArtifactsHistoryEntry {
	timestamp: string
	commitHash: string
}

/** Commit hashes are interpolated into URLs and DO requests; accept only full hex shas. */
export function isValidCommitHash(commitHash: string): boolean {
	return /^[0-9a-f]{40}$/.test(commitHash)
}

export interface ArtifactsHistoryPage {
	entries: ArtifactsHistoryEntry[]
	nextCursor: string | null
}

interface RestCommit {
	hash: string
	message: string
	committedAt?: number
	committer?: { name: string; email: string }
}

/**
 * Commits carry `Snapshot at <ISO>Z` messages (same convention as Pierre), with the
 * committer date as fallback. A commit with neither is dropped rather than given a
 * placeholder — the history page date-formats every timestamp and an unparseable one
 * would throw during render.
 */
function commitToEntry(commit: RestCommit): ArtifactsHistoryEntry | null {
	const match = commit.message?.match(/Snapshot at (.+Z)/)
	const timestamp =
		match?.[1] ?? (commit.committedAt ? new Date(commit.committedAt * 1000).toISOString() : null)
	if (!timestamp) return null
	return { timestamp, commitHash: commit.hash }
}

/**
 * The beta binding (as of wrangler 4.119's types) exposes no content reads, but the
 * runtime may grow them before the types do — feature-detect, then fall back to the
 * REST API when CLOUDFLARE_ACCOUNT_ID + ARTIFACTS_API_TOKEN are configured.
 * Returns null when no read path is available (routes turn that into a 503).
 */
function getRestConfig(env: Environment): { base: string; headers: HeadersInit } | null {
	if (!env.CLOUDFLARE_ACCOUNT_ID || !env.ARTIFACTS_API_TOKEN) return null
	const namespace = getArtifactsNamespace(env)
	return {
		base: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/artifacts/namespaces/${namespace}`,
		headers: { authorization: `Bearer ${env.ARTIFACTS_API_TOKEN}` },
	}
}

async function restJson<T>(env: Environment, path: string): Promise<T | null> {
	const rest = getRestConfig(env)
	if (!rest) return null
	const res = await fetch(`${rest.base}${path}`, { headers: rest.headers })
	if (res.status === 404) return null
	if (!res.ok) {
		throw new Error(`Artifacts REST ${path}: HTTP ${res.status}`)
	}
	const body = (await res.json()) as { success?: boolean; result?: T }
	if (body.success === false) {
		throw new Error(`Artifacts REST ${path}: request failed`)
	}
	return (body.result ?? (body as T)) as T
}

export const ARTIFACTS_HISTORY_PAGE_SIZE = 1000

/**
 * List snapshot history for a repo, newest first. `cursor` is an opaque offset string.
 * Returns null when no read path (binding or REST) is available; empty entries when the
 * repo does not exist.
 */
export async function listArtifactsHistory(
	env: Environment,
	repoName: string,
	cursor: string | null
): Promise<ArtifactsHistoryPage | null> {
	const offset = cursor ? parseInt(cursor, 10) || 0 : 0

	// Binding path, if the runtime has grown content reads.
	if (env.ARTIFACTS) {
		try {
			const repo = (await env.ARTIFACTS.get(repoName)) as any
			if (typeof repo?.log === 'function') {
				const log = await repo.log({ limit: ARTIFACTS_HISTORY_PAGE_SIZE, offset })
				const commits: RestCommit[] = Array.isArray(log) ? log : (log?.commits ?? [])
				return pageFromCommits(commits, offset)
			}
		} catch (err: any) {
			if (err?.code === 'NOT_FOUND') return { entries: [], nextCursor: null }
			throw err
		}
	}

	// The offset param is verified against the live API (2026-08: distinct pages for
	// limit+offset on a 2,397-commit repo).
	const log = await restJson<any>(
		env,
		`/repos/${repoName}/log?limit=${ARTIFACTS_HISTORY_PAGE_SIZE}${offset ? `&offset=${offset}` : ''}`
	)
	if (log === null) {
		// Distinguish "no read path configured" from "repo missing": getRestConfig null
		// means unavailable; a 404 from REST means the repo does not exist.
		return getRestConfig(env) ? { entries: [], nextCursor: null } : null
	}
	// Observed shape is a bare array; tolerate an object wrapper like the binding path.
	const commits: RestCommit[] = Array.isArray(log) ? log : (log?.commits ?? [])
	return pageFromCommits(commits, offset)
}

function pageFromCommits(commits: RestCommit[], offset: number): ArtifactsHistoryPage {
	return {
		entries: commits.map(commitToEntry).filter((e): e is ArtifactsHistoryEntry => e !== null),
		// Cursor advances by raw commit count (not surviving entries) so dropped commits
		// cannot stall pagination.
		nextCursor:
			commits.length === ARTIFACTS_HISTORY_PAGE_SIZE ? String(offset + commits.length) : null,
	}
}

/**
 * Read the full snapshot.json at a commit. One blob read — the blob layout's payoff
 * over Pierre's tar-stream reassembly. Returns null if the repo/commit/file is missing
 * or no read path is available.
 */
export async function getSnapshotJsonAtCommit(
	env: Environment,
	repoName: string,
	commitHash: string
): Promise<string | null> {
	if (env.ARTIFACTS) {
		try {
			const repo = (await env.ARTIFACTS.get(repoName)) as any
			if (typeof repo?.readCommit === 'function' && typeof repo?.readTree === 'function') {
				const commit = await repo.readCommit(commitHash)
				const tree = await repo.readTree(commit.tree ?? commit.treeHash)
				const entry = (tree?.entries ?? []).find((e: any) => e.name === 'snapshot.json')
				if (entry && typeof repo.readBlob === 'function') {
					const blob = await repo.readBlob(entry.hash)
					return typeof blob === 'string' ? blob : new TextDecoder().decode(blob)
				}
			}
		} catch (err: any) {
			if (err?.code === 'NOT_FOUND') return null
			throw err
		}
	}

	const rest = getRestConfig(env)
	if (!rest) return null
	const res = await fetch(`${rest.base}/repos/${repoName}/raw/${commitHash}/snapshot.json`, {
		headers: rest.headers,
	})
	if (res.status === 404) return null
	if (!res.ok) {
		throw new Error(`Artifacts raw read ${repoName}@${commitHash}: HTTP ${res.status}`)
	}
	return await res.text()
}
