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
	/**
	 * Restricts the export to these shape ids (used by the cluster screenshot tool). The render page
	 * fits the camera to their common bounds and draws only them. Omitted means the whole page.
	 */
	shapeIds?: string[]
	/**
	 * `measure` skips the export and POSTs the page's shape geometry back instead — the only way a
	 * Worker can obtain bounds, since sizing a shape needs an editor and font metrics.
	 */
	mode?: 'screenshot' | 'measure'
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
		(job.mode !== undefined && job.mode !== 'screenshot' && job.mode !== 'measure') ||
		(job.shapeIds !== undefined &&
			(!Array.isArray(job.shapeIds) ||
				job.shapeIds.length === 0 ||
				!job.shapeIds.every((id) => typeof id === 'string'))) ||
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
function renderJobSurface(job: Pick<ThumbnailRenderJob, 'surface'>): ThumbnailRenderSurface {
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
 *   behaviour rather than a collision between unrelated captures. That key overwrites in place, so the
 *   space stays bounded by boards rather than by traffic and nothing has to be cleaned up.
 * - **`mcp`** is not single-flighted, and nothing about a capture's *content* identifies it. Two agents
 *   asking for the same cluster of the same board, or one agent issuing the same tool call twice in
 *   parallel — which agents do — mint two tokens for byte-identical jobs. Keyed by content, the second
 *   mint would overwrite the first's `tokenHash`, and the first's snapshot fetch would 403 and surface
 *   as a bare `the render failed` after it had already spent a browser session and a slot of the
 *   caller's budget. So every MCP record is keyed by the capture instead: the token, which is unique
 *   per mint. The same applies to measures, which have even less content to key on — they export
 *   nothing, and every measure of a page mints an identical job down to the hardcoded light theme.
 *
 * All of them live under `render-tokens/{kind}/{slug}/` so hard-delete cleanup can clear a board's
 * records with one prefix listing rather than having to know every surface.
 *
 * A per-token key has no ceiling the way an overwrite-in-place one does, so MCP records *are* deleted
 * once their capture completes — see deleteMintedRenderToken. Deleting is safe: expiry lives in the
 * signed `exp` and is checked before this is consulted, so a leftover record could not extend a token's
 * life anyway, and dropping it only tightens the window from `exp` to the render's own duration. A hash
 * is stored rather than the token, in `customMetadata` so that checking one is a `head` and the record
 * costs no stored bytes.
 */
const RENDER_TOKEN_RECORD_PREFIX = 'render-tokens'

/** The prefix holding every surface's records for one board. Hard-delete cleanup lists this. */
function renderTokenRecordPrefix(board: ThumbnailBoardRef) {
	return `${RENDER_TOKEN_RECORD_PREFIX}/${board.kind}/${board.slug}/`
}

/**
 * Whether a job's record key names this one capture rather than something that outlives it. Those keys
 * are never reused, so nothing overwrites them and each has to be deleted once its capture is done —
 * and equally, deleting one cannot pull a record out from under a concurrent capture. See
 * `deleteMintedRenderToken`.
 */
function isPerCaptureRecordKey(job: Pick<ThumbnailRenderJob, 'surface'>) {
	return renderJobSurface(job) === 'mcp'
}

async function renderTokenRecordKey(
	job: Pick<ThumbnailRenderJob, 'kind' | 'slug' | 'surface' | 'mode'>,
	token: string
) {
	const surface = renderJobSurface(job)
	const base = `${renderTokenRecordPrefix(job)}${surface}`
	if (!isPerCaptureRecordKey(job)) return base
	// Keyed by the capture rather than by what it draws: two identical MCP captures are an ordinary
	// concurrent case, not a race, and a content key would have them invalidate each other. Hashed
	// rather than used raw because the token is a credential and this is an object name. The mode
	// segment carries no meaning for the lookup — it is there so a listing reads.
	return `${base}/${job.mode === 'measure' ? 'measure' : 'screenshot'}/${await sha256(token)}`
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
	await env.THUMBNAILS.put(await renderTokenRecordKey(job, token), new Uint8Array(), {
		customMetadata: { tokenHash: await sha256(token) },
	})
}

/**
 * Drops one capture's record, for the keys that do not overwrite in place — every MCP job, measure and
 * screenshot alike, since their key carries the token and so nothing later reuses it. Each capture would
 * otherwise leave an object behind forever; see recordMintedRenderToken. Call it once the render is done
 * with the token, which is after the snapshot fetch this record guards has already happened.
 *
 * A no-op for the surfaces whose key outlives one capture. Deleting an OG record here would be worse
 * than pointless: that key is per board, so a finishing render could drop the record a *newer* in-flight
 * mint had just written, and 403 it.
 *
 * Best effort, unlike the write: a record that fails to write means the render is about to fail its token
 * check, but one that fails to delete only leaves an orphan, and failing the caller's capture over it
 * would turn a working answer into an error. Hard deletion sweeps the board's whole prefix later anyway.
 */
export async function deleteMintedRenderToken(
	env: Environment,
	job: ThumbnailRenderJob,
	token: string
): Promise<void> {
	if (renderJobAccess(job) !== 'render') return
	if (!isPerCaptureRecordKey(job)) return
	if (!env.THUMBNAILS) return
	try {
		await env.THUMBNAILS.delete(await renderTokenRecordKey(job, token))
	} catch {
		// Ignored — see above.
	}
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
		(await env.THUMBNAILS.head(await renderTokenRecordKey(job, token))) ??
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
 * MCP, per page and theme or — for measures — per token, which no caller could enumerate at all. See
 * `renderTokenRecordKey`. A caller that had to work those out itself would silently stop cleaning up the
 * day a surface changed what it keys on.
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
		// A board's records number in the low tens at most — surfaces × pages × themes, plus any measure
		// record whose own cleanup failed — so a single unpaginated listing covers it; `truncated` is not
		// chased because leaving a few orphans behind is exactly the cost this function already accepts on
		// failure.
		const listed = await env.THUMBNAILS.list({ prefix })
		await Promise.all([
			...listed.objects.map((object) => env.THUMBNAILS!.delete(object.key)),
			// The pre-namespacing record sits at that prefix *without* its trailing slash, so the listing
			// cannot see it and it has to go by name. Every board rendered by a worker older than the
			// namespacing has one, and this is the only thing that would ever collect them.
			env.THUMBNAILS.delete(legacyRenderTokenRecordKey(board)),
		])
	} catch {
		// Ignored — see above.
	}
}
