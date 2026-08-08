import {
	Environment,
	ThumbnailBoardAccess,
	ThumbnailBoardKind,
	ThumbnailBoardRef,
	ThumbnailRenderSurface,
} from '../types'
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
	 * Which pipeline minted this job. Namespaces the minted-token record so two surfaces rendering one
	 * board cannot invalidate each other's tokens — see recordMintedRenderToken.
	 *
	 * Absent only on a token minted before this field existed, read as `og`: that was the only surface
	 * writing records at the time, since the MCP tool minted `public` and `public` is never recorded.
	 */
	surface?: ThumbnailRenderSurface
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

// The token lifetime (THUMBNAIL_RENDER_TOKEN_TTL_MS) lives in config.ts; expiry rides inside the
// signed payload as `exp`, minted immediately before the capture.

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
		(job.surface !== undefined && job.surface !== 'og' && job.surface !== 'mcp') ||
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

/**
 * The surface a job is read under. Absent means a token minted before the field existed, read as
 * `og` — the only surface that was writing records then. See ThumbnailRenderJob.surface.
 */
export function renderJobSurface(job: Pick<ThumbnailRenderJob, 'surface'>): ThumbnailRenderSurface {
	return job.surface ?? 'og'
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
 * Keyed per *capture* rather than per token, so records overwrite in place and the space stays bounded
 * by content rather than by traffic. Nothing accumulates, so there is no lifecycle rule to add — and
 * none must ever be added to this bucket, where a rule with a missing or mistyped prefix would delete
 * every board's live thumbnail.
 *
 * What counts as one capture differs by surface, because their concurrency does:
 *
 * - **`og`** is single-flighted per board by the `.pending` marker, so its renders never overlap and one
 *   key per board is right — a newer mint superseding an older in-flight token is then the intended
 *   behaviour rather than a collision between unrelated captures.
 * - **`mcp`** is not single-flighted. Concurrent captures of different pages of one board are supported
 *   and tested, so a per-board key would have them invalidate each other's tokens, and the loser would
 *   403 on its snapshot fetch and surface as a generic render failure. Its key therefore carries what
 *   distinguishes those captures: the page and theme being rendered.
 *
 * Both live under `render-tokens/{kind}/{slug}/` so hard-delete cleanup can clear a board's records with
 * one prefix listing rather than having to know every surface. Two concurrent MCP captures of the *same*
 * page and theme still share a key, which is the OG case again — the same image, rendered twice, where
 * the later mint winning costs one retry rather than a wrong result.
 *
 * Records are **not** deleted after a capture. Expiry lives in the signed `exp` and is checked before
 * this is consulted, so a leftover record cannot extend a token's life; deleting would only tighten the
 * window from `exp` to the render's duration, which buys nothing against an attacker who cannot get a
 * record written at all. A hash is stored rather than the token, in `customMetadata` so that checking
 * one is a `head` and the record costs no stored bytes.
 */
const RENDER_TOKEN_RECORD_PREFIX = 'render-tokens'

/** The prefix holding every surface's records for one board. Hard-delete cleanup lists this. */
export function renderTokenRecordPrefix(board: ThumbnailBoardRef) {
	return `${RENDER_TOKEN_RECORD_PREFIX}/${board.kind}/${board.slug}/`
}

function renderTokenRecordKey(
	job: Pick<ThumbnailRenderJob, 'kind' | 'slug' | 'surface' | 'pageId' | 'theme'>
) {
	const surface = renderJobSurface(job)
	const base = `${renderTokenRecordPrefix(job)}${surface}`
	if (surface !== 'mcp') return base
	// Derived from the signed job, so the key a capture is checked against is the one it was minted
	// under and a caller cannot steer it. `default` stands in for the OG-style whole-board render,
	// which the MCP tool does not currently mint but the job type still allows.
	return `${base}/${job.theme}/${job.pageId ?? 'default'}`
}

/**
 * Records a freshly minted token as ours. Errors are **not** swallowed: a record that failed to write
 * means the render is about to fail its own token check, and a confusing "invalid token" is worse to
 * debug than the write error that caused it.
 *
 * **Only `render` jobs are recorded.** A `public` job renders a board anyone could already fetch, so a
 * forged token for one grants nothing and the record would buy no security.
 *
 * Both surfaces mint `render` now — the MCP tool does so for a board the authenticated caller may see,
 * which is what the surface namespacing in `renderTokenRecordKey` exists for.
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

	const record =
		(await env.THUMBNAILS.head(renderTokenRecordKey(job))) ??
		// A token with no `surface` was minted before the key was namespaced, and its record is at the
		// old un-namespaced key. Checked only for those tokens, so this costs nothing once the rolling
		// deploy that introduced the field has finished — and without it every OG render already in
		// flight across that deploy would 403 until its 60s token expired.
		(job.surface === undefined ? await env.THUMBNAILS.head(legacyRenderTokenRecordKey(job)) : null)
	if (!record) return false
	return record.customMetadata?.tokenHash === (await sha256(token))
}

/** The pre-namespacing record key. Read-only, and only for tokens minted without a `surface`. */
function legacyRenderTokenRecordKey(job: Pick<ThumbnailRenderJob, 'kind' | 'slug'>) {
	return `${RENDER_TOKEN_RECORD_PREFIX}/${job.kind}/${job.slug}`
}

/**
 * Drops every surface's records for a board. Only hard deletion calls this, and not for security:
 * expiry lives in the signed `exp` and is checked before a record is ever consulted, so a leftover
 * record cannot extend a token's life. It is about orphans. These keys carry no version and
 * `THUMBNAILS` has no lifecycle rule, so a record left behind by a board that no longer exists is an
 * object nothing will ever read or overwrite again.
 *
 * Lists rather than deleting a known key, because the key space under a board is per surface and, for
 * MCP, per page and theme — see `renderTokenRecordKey`. A caller that had to enumerate those itself
 * would silently stop cleaning up the day a surface changed what it keys on.
 *
 * Best effort, like the image deletion it runs beside: a board is being torn down, and failing to
 * tidy up a few small objects must not abort that.
 */
export async function deleteRenderTokenRecord(
	env: Environment,
	board: ThumbnailBoardRef
): Promise<void> {
	if (!env.THUMBNAILS) return
	try {
		const prefix = renderTokenRecordPrefix(board)
		// A board's records number in the low tens at most (surfaces × pages × themes), so a single
		// unpaginated listing covers it; `truncated` is not chased because leaving a few orphans behind
		// is exactly the cost this function already accepts on failure.
		const listed = await env.THUMBNAILS.list({ prefix })
		await Promise.all(listed.objects.map((object) => env.THUMBNAILS!.delete(object.key)))
	} catch {
		// Ignored — see above.
	}
}
