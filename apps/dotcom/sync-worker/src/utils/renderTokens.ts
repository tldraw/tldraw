import { Environment, ThumbnailBoardKind } from '../types'
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
 * The record is keyed per board, so a board's newest mint invalidates any older in-flight token for
 * it. That is intended: a fresher request supersedes one already running.
 *
 * Renders for one board genuinely can overlap — the MCP tool allows two cache-missing captures per
 * board per minute, and an edit or publish render can land during one — so this is a live path, not a
 * theoretical one. The superseded capture fails its snapshot fetch with a 403 and surfaces as a render
 * failure, which is the accepted outcome: it fails closed and before spending anything further, the OG
 * queue retries it, and an MCP caller can ask again.
 */
export async function recordMintedRenderToken(
	env: Environment,
	job: ThumbnailRenderJob,
	token: string
): Promise<void> {
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
 */
export async function isMintedRenderToken(
	env: Environment,
	job: ThumbnailRenderJob,
	token: string
): Promise<boolean> {
	// See recordMintedRenderToken: with no bucket there is no record to check against, so this trusts
	// the signature alone rather than refusing every render.
	if (!env.THUMBNAILS) return true

	const record = await env.THUMBNAILS.head(renderTokenRecordKey(job))
	if (!record) return false
	return record.customMetadata?.tokenHash === (await sha256(token))
}
