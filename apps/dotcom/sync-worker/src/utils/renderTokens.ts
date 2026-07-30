import { Environment, ThumbnailBoardKind } from '../types'
import { base64UrlDecode, base64UrlEncode } from './base64'

// Short-lived signed render jobs. The MCP screenshot route and OG queue mint one of these per
// capture, and the worker's browser session only ever visits the tldraw-owned render page with this
// token; the render page exchanges the token for snapshot data via /app/thumbnail-render/snapshot.
// Board identity and render parameters ride inside the signed payload so they cannot be tampered
// with in transit.
export interface ThumbnailRenderJob {
	v: 1
	/**
	 * `published` renders a frozen tldraw.com/p/:slug snapshot; `shared_file` renders the live
	 * snapshot of an anonymously-shared tldraw.com/f/:slug file.
	 */
	kind: ThumbnailBoardKind
	/** The board slug: the `:slug` in tldraw.com/p/:slug (published) or /f/:slug (shared file) */
	slug: string
	/**
	 * A version that rotates when the rendered content changes, so it can key the thumbnail cache.
	 * Published boards use the file's `lastPublished` timestamp; shared files use the persisted
	 * room snapshot's R2 etag.
	 */
	version: string | number
	/**
	 * When omitted, the render page uses x/y/z directly. `content` tells the render page to fit the
	 * board's current page content into the requested output size.
	 *
	 * Every surface mints `content` today, so the explicit-viewport path is not exercised in
	 * production. It is kept deliberately rather than dropped as unreachable: the token payload is
	 * short-lived (THUMBNAIL_RENDER_TOKEN_TTL_MS) and has no stored state, so removing it costs
	 * nothing to undo on the worker side — but the render page and the worker deploy separately, so
	 * bringing it back would mean landing the client's handling first and waiting for that deploy
	 * before the worker could send it. Keeping it holds that door open.
	 */
	camera?: 'content'
	/**
	 * The TLPageId of the single page to render. When omitted, the render page exports whichever page
	 * the snapshot opens to (used by OG images). The worker takes one screenshot of the rendered page.
	 */
	pageId?: string
	/** The viewport the render page sets directly when `camera` is omitted. */
	x: number
	y: number
	z: number
	width: number
	height: number
	theme: 'light' | 'dark'
	/** Unix ms expiry */
	exp: number
}

/**
 * How long a minted render token stays valid.
 *
 * Sized against what a capture actually needs, not generously: measured Browser Run renders run 4s
 * at p50 and 12-17s at p90, so 60s is several times the p90 and still an order of magnitude tighter
 * than the 5 minutes this used to be. The token is what stands between an HMAC signature and a
 * private board's full document — thumbnails are generated for every board, not just public ones —
 * so the window it is usable in is worth keeping close to the work it exists to cover.
 *
 * The floor is the render itself, not the queue: a token is minted immediately before the
 * `quickAction` call, not when the job is enqueued, so queue linger and retry backoff do not eat
 * into it. A render slower than this fails and the job retries with a fresh token.
 */
export const THUMBNAIL_RENDER_TOKEN_TTL_MS = 60_000

export async function mintThumbnailRenderToken(
	env: Environment,
	job: ThumbnailRenderJob
): Promise<string> {
	const secret = env.MCP_SCREENSHOT_TOKEN_SECRET
	if (!secret) {
		throw new Error('MCP_SCREENSHOT_TOKEN_SECRET is not configured')
	}
	const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(job)))
	const signature = await crypto.subtle.sign(
		'HMAC',
		await getHmacKey(secret),
		new TextEncoder().encode(payload)
	)
	return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifyThumbnailRenderToken(
	env: Environment,
	token: string,
	now = Date.now()
): Promise<ThumbnailRenderJob | null> {
	const secret = env.MCP_SCREENSHOT_TOKEN_SECRET
	if (!secret) return null

	const parts = token.split('.')
	if (parts.length !== 2 || !parts[0] || !parts[1]) return null
	const [payload, signature] = parts

	let signatureBytes: Uint8Array<ArrayBuffer>
	try {
		signatureBytes = base64UrlDecode(signature)
	} catch {
		return null
	}

	const isValid = await crypto.subtle.verify(
		'HMAC',
		await getHmacKey(secret),
		signatureBytes,
		new TextEncoder().encode(payload)
	)
	if (!isValid) return null

	let job: ThumbnailRenderJob
	try {
		job = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)))
	} catch {
		return null
	}

	if (
		!job ||
		job.v !== 1 ||
		(job.kind !== 'published' && job.kind !== 'shared_file') ||
		typeof job.slug !== 'string' ||
		(job.camera !== undefined && job.camera !== 'content') ||
		(job.pageId !== undefined && typeof job.pageId !== 'string') ||
		typeof job.exp !== 'number'
	) {
		return null
	}
	if (job.exp <= now) return null

	return job
}

async function getHmacKey(secret: string) {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	)
}

/**
 * A signature alone is not proof that *we* minted a token — only that whoever made it holds the
 * secret. So every mint also records the token in R2, and the snapshot route requires the record to
 * be there. A leaked `MCP_SCREENSHOT_TOKEN_SECRET` then stops being catastrophic: an attacker can
 * forge signatures all day, but without write access to our bucket the forgeries have no record and
 * are refused. The secret becomes one of two required factors rather than the sole authority over
 * every private board's contents.
 *
 * Keyed **per board**, not per token, which is what keeps this free of housekeeping: each render
 * overwrites its board's record, so the space is bounded by board count exactly like the `.pending`
 * single-flight marker. Nothing accumulates, so there is no lifecycle rule to add — and none must
 * ever be added to this bucket, since a rule with a missing or mistyped prefix would delete every
 * board's live thumbnail (see the two-bucket note in browser-run-thumbnails.md).
 *
 * Records are deliberately **not** deleted after a capture. Expiry is enforced by the signed `exp`
 * inside the token and checked before this is ever consulted, so a record left behind cannot extend a
 * token's life by a millisecond. Deleting would tighten the usable window from `exp` to the render's
 * own duration — worth nothing against an attacker who cannot get a record written in the first place,
 * and it would buy a `finally` block plus a third state to reason about.
 *
 * A hash is stored rather than the token, so the bucket never holds a usable credential — and it goes
 * in `customMetadata` rather than the body, so checking one is a `head` rather than a `get` and the
 * record costs no stored bytes. Same shape as the `.pending` marker's `expiresAt`.
 */
const RENDER_TOKEN_RECORD_PREFIX = 'render-tokens'

function renderTokenRecordKey(job: Pick<ThumbnailRenderJob, 'kind' | 'slug'>) {
	return `${RENDER_TOKEN_RECORD_PREFIX}/${job.kind}/${job.slug}`
}

// Local rather than reusing `sha256` from routes/tla/thumbnailShared.ts: this module is under
// utils/ and must not depend on a route module. The duplication is four lines of well-known code.
async function hashRenderToken(token: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Records a freshly minted token as ours. Errors are **not** swallowed: a record that failed to write
 * means the render is about to fail its own token check, and a confusing "invalid token" is a worse
 * thing to debug than the write error that caused it.
 *
 * A board's newest render overwrites the record, so an older in-flight token for the same board stops
 * working. The `.pending` marker already single-flights renders per board, so two in flight at once
 * is not a case that should arise — but note this makes the write load-bearing for correctness rather
 * than only for deduplication.
 */
export async function recordMintedRenderToken(
	env: Environment,
	job: ThumbnailRenderJob,
	token: string
): Promise<void> {
	// Unbound only in local dev and tests. Deployed environments all bind THUMBNAILS, and skipping
	// degrades to signature-only verification — which is exactly the security level this replaces, not
	// a hole beneath it.
	if (!env.THUMBNAILS) return
	await env.THUMBNAILS.put(renderTokenRecordKey(job), new Uint8Array(), {
		customMetadata: { tokenHash: await hashRenderToken(token) },
	})
}

/**
 * Whether this token is one we minted. Call only after `verifyThumbnailRenderToken` has accepted the
 * signature and expiry — the `job` argument is what that returns, so the key is derived from signed
 * data rather than from anything the caller supplied.
 */
export async function isMintedRenderToken(
	env: Environment,
	job: ThumbnailRenderJob,
	token: string
): Promise<boolean> {
	// See recordMintedRenderToken: no bucket means no record to check against, so this falls back to
	// trusting the signature alone rather than refusing every render.
	if (!env.THUMBNAILS) return true

	const record = await env.THUMBNAILS.head(renderTokenRecordKey(job))
	if (!record) return false
	return record.customMetadata?.tokenHash === (await hashRenderToken(token))
}
