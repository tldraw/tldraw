import { Environment, ThumbnailBoardAccess, ThumbnailBoardKind } from '../types'
import { base64UrlDecode, base64UrlEncode } from './base64'
import { sha256 } from './hash'

// Short-lived signed render jobs, minted one per capture. The browser session only ever visits the
// tldraw-owned render page with this token, which the page exchanges for snapshot data via
// /app/thumbnail-render/snapshot. Board identity and render parameters ride inside the signed payload
// so they cannot be tampered with in transit.
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
	 * The gate the snapshot route applies when it serves this job's board, signed so a caller cannot
	 * widen it. `public` is what the MCP tool mints: it renders only boards anyone could already fetch,
	 * so the token guards nothing and no minted-token record is kept for it. `render` is what the OG
	 * pipeline mints, and it can read a *private* board's whole document — that is the case the record
	 * exists for. See recordMintedRenderToken.
	 *
	 * Absent only on a token minted before this field existed. Read as `public`, which is both the
	 * narrower gate and the one that worker version actually applied — it served every board through
	 * the anonymous-share check and wrote no records. Reading them as `render` instead would widen
	 * them past what they were minted under *and* demand a record no old mint ever wrote, so every
	 * capture in flight across a rolling deploy would 403 until the old tokens expired. Every mint
	 * since sets this explicitly, from the gate the board was resolved under.
	 */
	access?: ThumbnailBoardAccess
	/**
	 * A version that rotates when the rendered content changes, so it can key the thumbnail cache.
	 * Published boards use the file's `lastPublished` timestamp; shared files use the persisted
	 * room snapshot's R2 etag.
	 */
	version: string | number
	/**
	 * `content` fits the board's current page content into the requested output size; when omitted, the
	 * render page uses x/y/z directly.
	 *
	 * Every surface mints `content`, so the explicit-viewport path is unexercised in production. Worth
	 * carrying anyway: the render page ships with the client and deploys separately, so a worker that
	 * wants to send a viewport can only do so once the client already understands one.
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
 * Sized against what a capture needs rather than generously, because this token is what stands between
 * an HMAC signature and a *private* board's full document: thumbnails are rendered for every board, not
 * only public ones. Measured renders run 4s at p50 and 12-17s at p90, so 60s is several times p90.
 *
 * Queue linger and retry backoff do not eat into it — a token is minted immediately before the
 * `quickAction` call, not at enqueue. A render slower than this fails and retries with a fresh token.
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
		(job.access !== undefined && job.access !== 'public' && job.access !== 'render') ||
		(job.camera !== undefined && job.camera !== 'content') ||
		(job.pageId !== undefined && typeof job.pageId !== 'string') ||
		typeof job.exp !== 'number'
	) {
		return null
	}
	if (job.exp <= now) return null

	return job
}

/**
 * The gate a job is read under. Absent means a token minted before the field existed, read as `public`
 * — the narrower gate, and the one those tokens were minted under. See ThumbnailRenderJob.access.
 */
export function renderJobAccess(job: Pick<ThumbnailRenderJob, 'access'>): ThumbnailBoardAccess {
	return job.access ?? 'public'
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
 * A signature alone is not proof that *we* minted a token — only that whoever made it holds the secret.
 * So every mint also records the token in R2 and the snapshot route requires that record to be there,
 * which makes a leaked `MCP_SCREENSHOT_TOKEN_SECRET` survivable: an attacker can forge signatures, but
 * without write access to our bucket the forgeries have no record and are refused. The secret is one of
 * two required factors, not the sole authority over every private board's contents.
 *
 * Keyed per board rather than per token, so each render overwrites its board's record and the space is
 * bounded by board count. Nothing accumulates, so there is no lifecycle rule to add — and none must
 * ever be added to this bucket, where a rule with a missing or mistyped prefix would delete every
 * board's live thumbnail.
 *
 * Records are **not** deleted after a capture. Expiry lives in the signed `exp` and is checked before
 * this is consulted, so a leftover record cannot extend a token's life; deleting would only tighten the
 * window from `exp` to the render's duration, which buys nothing against an attacker who cannot get a
 * record written at all. A hash is stored rather than the token, in `customMetadata` so that checking
 * one is a `head` and the record costs no stored bytes.
 */
const RENDER_TOKEN_RECORD_PREFIX = 'render-tokens'

function renderTokenRecordKey(job: Pick<ThumbnailRenderJob, 'kind' | 'slug'>) {
	return `${RENDER_TOKEN_RECORD_PREFIX}/${job.kind}/${job.slug}`
}

/**
 * Records a freshly minted token as ours. Errors are **not** swallowed: a record that failed to write
 * means the render is about to fail its own token check, and a confusing "invalid token" is worse to
 * debug than the write error that caused it.
 *
 * **Only `render` jobs are recorded.** A `public` job renders a board anyone could already fetch, so a
 * forged token for one grants nothing and the record would buy no security — it would only put the MCP
 * tool into the same key space as the OG pipeline, where the two would clobber each other.
 *
 * That exclusion is what keeps the key safely per board. The OG pipeline is single-flighted per board
 * by the `.pending` marker, so its renders do not overlap, and a newer mint superseding an older
 * in-flight token is then the intended behaviour rather than a collision between unrelated captures.
 *
 * **If the MCP tool ever mints `render` jobs** — which authenticating those endpoints would invite,
 * since it would let them screenshot private boards — this key must be namespaced by surface first.
 * Without that, two MCP captures of different pages of one board, or an edit-triggered render landing
 * during a capture, invalidate each other's tokens and fail with a 403.
 */
export async function recordMintedRenderToken(
	env: Environment,
	job: ThumbnailRenderJob,
	token: string
): Promise<void> {
	if (renderJobAccess(job) !== 'render') return
	// Unbound only in local dev and tests, where skipping leaves signature-only verification. Deployed
	// environments all bind THUMBNAILS, so the two-factor check is never optional where it matters.
	if (!env.THUMBNAILS) return
	await env.THUMBNAILS.put(renderTokenRecordKey(job), new Uint8Array(), {
		customMetadata: { tokenHash: await sha256(token) },
	})
}

/**
 * Whether this token is one we minted. Call only after `verifyThumbnailRenderToken` has accepted the
 * signature and expiry — the `job` argument is what that returns, so the key is derived from signed
 * data rather than from anything the caller supplied.
 *
 * Vacuously true for a `public` job, which is not recorded: the board it names is one the caller could
 * fetch without any of this, so the signature is the whole gate. See recordMintedRenderToken.
 */
export async function isMintedRenderToken(
	env: Environment,
	job: ThumbnailRenderJob,
	token: string
): Promise<boolean> {
	if (renderJobAccess(job) !== 'render') return true
	// See recordMintedRenderToken: with no bucket there is no record to check against, so this trusts
	// the signature alone rather than refusing every render.
	if (!env.THUMBNAILS) return true

	const record = await env.THUMBNAILS.head(renderTokenRecordKey(job))
	if (!record) return false
	return record.customMetadata?.tokenHash === (await sha256(token))
}

/**
 * Drops a board's record. Only hard deletion calls this, and not for security: expiry lives in the
 * signed `exp` and is checked before the record is ever consulted, so a leftover record cannot extend
 * a token's life. It is about orphans. These keys carry no version and `THUMBNAILS` has no lifecycle
 * rule, so a record left behind by a board that no longer exists is an object nothing will ever read
 * or overwrite again.
 *
 * Best effort, like the image deletion it runs beside: a board is being torn down, and failing to
 * tidy up one small object must not abort that.
 */
export async function deleteRenderTokenRecord(
	env: Environment,
	job: Pick<ThumbnailRenderJob, 'kind' | 'slug'>
): Promise<void> {
	if (!env.THUMBNAILS) return
	await env.THUMBNAILS.delete(renderTokenRecordKey(job)).catch(() => {})
}
