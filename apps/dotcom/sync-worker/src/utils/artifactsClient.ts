import { ArtifactsBinding } from '../types'
import { parseReportStatus } from './gitPack'

/**
 * Write-side client for Cloudflare Artifacts: repo provisioning, token caching, and the
 * git smart-HTTP requests (receive-pack POST, info/refs head lookup). Pack construction
 * itself lives in gitPack.ts.
 */

/** Re-mint the push token when it is within this margin of its 24h expiry. */
const TOKEN_REFRESH_MARGIN_MS = 30 * 60_000

export interface ArtifactsWriterRepo {
	remote: string
	getToken(): Promise<string>
	invalidateToken(): void
}

/** Tokens may carry a `?expires=` suffix; the secret is the part before it. */
function tokenSecret(plaintext: string): string {
	return plaintext.split('?expires=')[0]
}

/**
 * Get or create the repo and wrap it with an in-memory token cache. Memoize the
 * returned promise on the DO instance — this must NOT be called per-persist (the
 * Pierre integration's find-then-create-per-persist is the anti-pattern).
 */
export async function getOrCreateArtifactsRepo(
	binding: ArtifactsBinding,
	repoName: string,
	description: string
): Promise<ArtifactsWriterRepo> {
	let remote: string
	let cached: { secret: string; expiresAt: number } | null = null
	let mintToken: (() => Promise<{ secret: string; expiresAt: number }>) | null = null

	try {
		const repo = await binding.get(repoName)
		remote = repo.remote
		mintToken = async () => {
			const token = await repo.createToken('write')
			return { secret: tokenSecret(token.plaintext), expiresAt: Date.parse(token.expiresAt) }
		}
	} catch (err: any) {
		if (err?.code !== 'NOT_FOUND') throw err
		try {
			const created = await binding.create(repoName, { description })
			remote = created.remote
			cached = {
				secret: tokenSecret(created.token),
				expiresAt: Date.parse(created.tokenExpiresAt),
			}
		} catch (createErr: any) {
			// Lost a create race; the repo exists now.
			if (createErr?.code !== 'ALREADY_EXISTS') throw createErr
			const repo = await binding.get(repoName)
			remote = repo.remote
		}
		if (!mintToken) {
			mintToken = async () => {
				const repo = await binding.get(repoName)
				const token = await repo.createToken('write')
				return { secret: tokenSecret(token.plaintext), expiresAt: Date.parse(token.expiresAt) }
			}
		}
	}

	return {
		remote,
		async getToken() {
			// Negated comparison so a NaN expiry (malformed timestamp) re-mints rather
			// than being treated as never-expiring.
			if (!cached || !(cached.expiresAt - Date.now() >= TOKEN_REFRESH_MARGIN_MS)) {
				cached = await mintToken!()
			}
			return cached.secret
		},
		invalidateToken() {
			cached = null
		},
	}
}

function authHeader(secret: string): string {
	// Workers fetch rejects credentials embedded in URLs; use a Basic header instead.
	return `Basic ${btoa(`x:${secret}`)}`
}

/**
 * Fetch the remote's current head for refs/heads/main via the receive-pack ref
 * advertisement. Used to resync state after a CAS conflict and to verify ambiguous push
 * outcomes (the beta endpoint sometimes errors after a successful ref update).
 * Returns undefined for an empty repo.
 */
export async function fetchRemoteHead(
	remote: string,
	secret: string,
	signal?: AbortSignal
): Promise<string | undefined> {
	const res = await fetch(`${remote}/info/refs?service=git-receive-pack`, {
		headers: { authorization: authHeader(secret) },
		signal,
	})
	if (!res.ok) {
		throw new Error(`Artifacts info/refs: HTTP ${res.status}`)
	}
	const text = await res.text()
	// pkt-line stream: "# service=git-receive-pack", flush, then per-ref lines
	// "<sha> <ref>[\0capabilities]". An empty repo advertises a zero-id capabilities^{}
	// line instead of real refs.
	let cursor = 0
	while (cursor + 4 <= text.length) {
		const length = parseInt(text.slice(cursor, cursor + 4), 16)
		if (Number.isNaN(length)) break
		if (length === 0) {
			cursor += 4
			continue
		}
		const line = text.slice(cursor + 4, cursor + length)
		cursor += length
		const match = line.match(/^([0-9a-f]{40}) (\S+)/)
		if (match && match[2].split('\0')[0] === 'refs/heads/main' && match[1] !== '0'.repeat(40)) {
			return match[1]
		}
	}
	return undefined
}

export type PushResult =
	| { outcome: 'ok' }
	| { outcome: 'rejected'; refMessage: string }
	| { outcome: 'auth' }
	| { outcome: 'ambiguous'; reason: string }

/**
 * POST a prepared receive-pack body. `rejected` means the server processed the push and
 * said no (typically a stale old-oid, i.e. a CAS conflict). `ambiguous` means we cannot
 * know whether the ref updated — the caller must verify against fetchRemoteHead before
 * treating it as a failure, because the beta endpoint has been observed failing the
 * response after a successful update.
 */
export async function pushPack(opts: {
	remote: string
	secret: string
	body: Uint8Array
	signal?: AbortSignal
}): Promise<PushResult> {
	let res: Response
	try {
		res = await fetch(`${opts.remote}/git-receive-pack`, {
			method: 'POST',
			headers: {
				authorization: authHeader(opts.secret),
				'content-type': 'application/x-git-receive-pack-request',
			},
			body: opts.body as BodyInit,
			signal: opts.signal,
		})
	} catch (err: any) {
		return { outcome: 'ambiguous', reason: `fetch failed: ${err?.name ?? err}` }
	}
	if (res.status === 401 || res.status === 403) {
		return { outcome: 'auth' }
	}
	if (!res.ok) {
		return { outcome: 'ambiguous', reason: `HTTP ${res.status}` }
	}
	const report = parseReportStatus(new Uint8Array(await res.arrayBuffer()))
	if (report.refOk) {
		return { outcome: 'ok' }
	}
	if (!report.unpackOk) {
		return { outcome: 'ambiguous', reason: `unpack failed: ${report.refMessage}` }
	}
	return { outcome: 'rejected', refMessage: report.refMessage ?? 'unknown' }
}
