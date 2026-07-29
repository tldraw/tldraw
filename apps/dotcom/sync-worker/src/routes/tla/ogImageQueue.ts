import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import {
	Environment,
	OgImageRenderQueueMessage,
	OgImageRenderReason,
	ThumbnailBoardKind,
} from '../../types'
import {
	ResolvedThumbnailBoard,
	captureThumbnailScreenshot,
	enumerateBoardPages,
	loadBoardSnapshot,
	putThumbnailPng,
	resolveThumbnailBoard,
	writeScreenshotTelemetry,
} from './thumbnailRender'
import {
	browserRunDurationOf,
	classifyScreenshotFailure,
	reportThumbnailError,
} from './thumbnailShared'

// Queue-backed async board thumbnail generation. The GET og-image route never blocks a request on
// Browser Run: it serves whatever is cached (fresh or stale) or the default OG image, and enqueues a
// render job here. This consumer performs the capture out of band and refreshes the R2 cache the
// route reads. The synchronous MCP tool does not use this path: it must return the image in-band, so
// it captures inline and caches under its own `mcp/` keys in a different bucket.
//
// Thumbnail rendering has no global cap, deliberately. It is our own derived artifact, triggered by
// things that already happened (a publish, an edit persisting, a crawler arriving) rather than by
// anything a caller can drive, so a global rate limiter here would only ever mean "serve a stale
// thumbnail to save a render we intend to do anyway". The abuse surface is the public MCP endpoint,
// and that keeps its per-IP, per-board and global caps — see sharedBoardScreenshotMcp.ts.
//
// What bounds this path is per-board and lives upstream: TLFileDurableObject debounces the ask, so a
// board renders once its editing settles (OG_RENDER_DEBOUNCE_MS) or once it has been editing without
// pause for OG_RENDER_MAX_WAIT_MS. Total spend therefore scales with how many boards are edited at
// once, and Browser Run's account limits are the real ceiling.

// A pending marker suppresses duplicate enqueues while a render is queued or in flight. It is
// advisory only: it expires on its own so a crashed consumer cannot wedge a board permanently.
//
// This is a single-flight, NOT a rate limit, and the TTL is not a render interval: the consumer
// deletes the marker as soon as a render lands, so on a healthy board it never lives out its TTL. The
// TTL only covers the case where a consumer dies without clearing it. What actually bounds a board's
// render rate is the debounce on the durable object's side of the enqueue (see
// TLFileDurableObject.scheduleOgRender) — change that, not this, to change the cadence.
const PENDING_MARKER_TTL_MS = 2 * 60_000
// Retries are bounded by max_retries in wrangler.toml too; this lower cap keeps thumbnail jobs from
// burning Browser Run capacity on a persistently failing board.
const MAX_RENDER_ATTEMPTS = 3
const RETRY_DELAY_SECONDS = 30

// OG images render a single page as the unfurl preview. Pick the first page (in board order) that
// has content, so a board whose first page is empty still gets a meaningful image; fall back to the
// first page when none have content (the render degrades to a blank, as it did before).
function pickOgImagePageId(snapshot: RoomSnapshot): string | undefined {
	const pages = enumerateBoardPages(snapshot)
	if (pages.length === 0) return undefined
	return (pages.find((page) => page.hasContent) ?? pages[0]).id
}

export function getOgImageCacheKey(board: Pick<ResolvedThumbnailBoard, 'kind' | 'slug'>) {
	return `og/${board.kind}/${board.slug}/${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT}/light.png`
}

export type EnqueueOgImageResult = 'enqueued' | 'already_pending' | 'unavailable'

function getOgImagePendingKey(board: { kind: ThumbnailBoardKind; slug: string }) {
	return getOgImageCacheKey(board).replace(/\.png$/, '.pending')
}

export async function enqueueOgImageRender(
	env: Environment,
	board: { kind: ThumbnailBoardKind; slug: string },
	opts: { reason?: OgImageRenderReason } = {}
): Promise<EnqueueOgImageResult> {
	if (!env.THUMBNAILS || !env.QUEUE) return 'unavailable'
	const { reason = 'crawler' } = opts

	const pendingKey = getOgImagePendingKey(board)
	const existing = await env.THUMBNAILS.head(pendingKey)
	if (existing) {
		const expiresAt = Number(existing.customMetadata?.expiresAt)
		if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
			return 'already_pending'
		}
	}

	await env.THUMBNAILS.put(pendingKey, new Uint8Array(), {
		customMetadata: {
			expiresAt: String(Date.now() + PENDING_MARKER_TTL_MS),
		},
	})

	const message: OgImageRenderQueueMessage = {
		type: 'og-image-render',
		kind: board.kind,
		slug: board.slug,
		reason,
	}
	await env.QUEUE.send(message)
	return 'enqueued'
}

// Clears a board's pending render marker. Called when a board stops being publicly viewable
// (unpublished or unshared) and when the consumer drops a job, because a marker left behind would
// suppress the next legitimate enqueue — after a reshare, or after the render that failed.
//
// The rendered image itself is deliberately NOT deleted. It used to be, on the reasoning that an
// unshared board's thumbnail is a copy of content that is no longer public. But the thumbnail is not
// public because it exists, it is public because a route serves it, and the only route that does
// re-checks the share gate on every request (resolveThumbnailBoard in getOgImage) — so an unshared
// board's image is already unreachable while it sits in R2. Keeping it means an owner-facing surface
// behind authz (a workspace or project view showing every board's thumbnail) can read the image a
// board already has instead of it having been thrown away the moment the board went private.
//
// Note the `og/…` keys carry no version, so each render overwrites in place and a board costs exactly
// one object however often it is re-rendered. Retaining them does not accumulate.
export async function clearOgImagePendingMarker(
	env: Environment,
	board: { kind: ThumbnailBoardKind; slug: string }
): Promise<void> {
	if (!env.THUMBNAILS) return
	await env.THUMBNAILS.delete(getOgImagePendingKey(board)).catch(() => {})
}

// Queue consumer. Re-resolves the board at render time rather than trusting the enqueued state:
// the share gate is re-checked (a board un-shared while queued is dropped without rendering, and
// its cached OG image is deleted) and the version is re-read so the render always captures the
// newest content, coalescing bursts of enqueues for a fast-changing board into one capture.
export async function handleOgImageRenderMessage(
	env: Environment,
	message: Message<OgImageRenderQueueMessage>,
	ctx?: ExecutionContext
): Promise<void> {
	const { kind, slug } = message.body
	// Messages enqueued before the field existed are all crawler misses.
	const reason = message.body.reason ?? 'crawler'
	// Indexes the telemetry on the board's room. A shared file's slug is its file id, so it is known
	// up front; a published board's slug is not, and only resolves to one below — the telemetry for a
	// published board that never resolves therefore carries no index, which beats carrying a wrong one.
	let fileId = kind === 'shared_file' ? slug : undefined
	const cacheKey = getOgImageCacheKey({ kind, slug })
	const clearPending = async () => {
		await env.THUMBNAILS?.delete(getOgImagePendingKey({ kind, slug })).catch(() => {})
	}
	// The board went private, was deleted, was unpublished, or has no persisted content. Terminal, not
	// transient: ack rather than retry, since no number of retries will make the board public again.
	// Reached from the resolve below — a board that goes private after that point fails its snapshot
	// read instead, and the retry lands back here on the next delivery.
	//
	// Any image the board already has is kept, not deleted: the public route re-checks the share gate
	// on every request, so it is already unreachable, and an owner-facing surface behind authz can
	// still use it (see clearOgImagePendingMarker).
	const dropNoLongerViewable = async () => {
		await clearOgImagePendingMarker(env, { kind, slug })
		writeScreenshotTelemetry(env, {
			source: 'queue',
			reason,
			fileId,
			cacheStatus: 'miss',
			failureReason: 'board_not_viewable',
		})
		message.ack()
	}

	try {
		const resolved = await resolveThumbnailBoard(env, kind, slug)
		if (!resolved.ok) {
			await dropNoLongerViewable()
			return
		}
		const board = resolved.board
		// Now known for both kinds, so every telemetry write past this point is indexed.
		fileId = board.fileId

		// Another consumer (or an earlier retry) may already have rendered this version.
		const cached = await env.THUMBNAILS?.head(cacheKey)
		if (cached?.customMetadata?.version === String(board.version)) {
			await clearPending()
			writeScreenshotTelemetry(env, { source: 'queue', reason, fileId, cacheStatus: 'hit' })
			message.ack()
			return
		}

		if (!env.THUMBNAILS) {
			throw new Error('THUMBNAILS bucket is not configured')
		}

		// No capacity check: thumbnail rendering has no global cap by design (see the note at the top of
		// this file). This deliberately drops the shared-budget check and requeue chain that used to sit
		// here — a global limiter on our own derived artifact only ever means "serve a stale thumbnail to
		// save a render we intend to do anyway", and each rate-limited delivery spent a limiter slot just
		// to learn it could not render. The version check above is what stops redundant work: a burst of
		// enqueues for one board coalesces into a single render of the newest content, and everything
		// past this point is a board whose cached thumbnail genuinely no longer matches its content.

		// Target the first page that has content so a board whose first page is empty still gets a
		// meaningful unfurl image (the render page otherwise exports whichever page the snapshot opens
		// to, typically the first).
		const snapshot = await loadBoardSnapshot(env, board)
		if (!snapshot) {
			// The board has no persisted content. The render page loads the snapshot from the same
			// sources through the same functions (getThumbnailSnapshot ->
			// get{Published,SharedFile}RoomSnapshot), so it would 404, mark its error state, and come
			// back as a render failure — after spending a Browser Run slot to discover what we already
			// know. Fail now instead. retryOrDrop still backs off and retries, in case content lands
			// shortly after the enqueue. A read that *fails* throws rather than landing here; the catch
			// below reports it and retries the same way, so that path spends no Browser Run either.
			retryOrDrop(env, message, fileId, 'board_empty')
			return
		}

		// The render page exports the chosen page; the worker screenshots it through the BROWSER
		// binding and writes the PNG to the cache key the OG route reads.
		const render = await captureThumbnailScreenshot(env, board, {
			pageId: pickOgImagePageId(snapshot),
			theme: 'light',
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
		})
		await putThumbnailPng(env.THUMBNAILS, cacheKey, render.base64, board.version)
		await clearPending()

		writeScreenshotTelemetry(env, {
			source: 'queue',
			reason,
			fileId,
			cacheStatus: 'miss',
			browserRunDurationMs: render.durationMs,
			browserMsUsed: null,
		})
		message.ack()
	} catch (error) {
		// Bounded reason code only — raw error.message would blow up the failure blob's cardinality.
		// Sentry gets the unbounded original, since the reason code alone can't explain why a board
		// burned through its retries.
		//
		// Reported once per job rather than once per delivery. A board that fails deterministically —
		// a render that always exhausts the browser's memory, an asset that never loads — fails all
		// MAX_RENDER_ATTEMPTS times, and reporting each delivery tripled the event volume for a single
		// underlying problem while the second and third events said nothing the first didn't. The
		// attempt that gives up is the one worth seeing, and it is already the only one that reaches
		// telemetry. A failure that recovers on retry now reports nothing at all, which is the point:
		// the render landed. The cost is that a job whose attempts fail for *different* reasons shows
		// only the last, which is a fair trade for a third of the noise.
		if (message.attempts >= MAX_RENDER_ATTEMPTS) {
			reportThumbnailError(error, {
				ctx,
				env,
				surface: 'og_queue',
				extras: { kind, slug, attempts: message.attempts },
			})
		}
		// A board that went private between the resolve above and the snapshot read is retried rather
		// than dropped here, because a plain read failure looks the same from this catch. That costs
		// one extra delivery, not one extra render: the retry re-resolves at the top of the handler,
		// finds the board no longer viewable, and drops it before spending any Browser Run.
		retryOrDrop(env, message, fileId, classifyScreenshotFailure(error), browserRunDurationOf(error))
	}
}

function retryOrDrop(
	env: Environment,
	message: Message<OgImageRenderQueueMessage>,
	fileId: string | undefined,
	failureReason: string,
	browserRunDurationMs?: number
) {
	// One datapoint per delivery, not per job. This dataset is the Browser Run spend ledger, and it is
	// the only thing watching a render path that is deliberately uncapped — so it has to count what was
	// actually spent. Every delivery that reaches the capture creates a browser and can hold it for the
	// full THUMBNAIL_RENDER_TIMEOUT_MS, whether or not it is the last attempt. Writing only on the final
	// drop, as this used to, hid two thirds of a failing board's spend, and made queue rows count jobs
	// while the `og` and `mcp` rows count requests. Sentry goes the other way deliberately (once per job,
	// see the catch above): telemetry counts spend, Sentry counts problems, and three deliveries are
	// three lots of spend but one problem.
	writeScreenshotTelemetry(env, {
		source: 'queue',
		reason: message.body.reason,
		fileId,
		cacheStatus: 'miss',
		failureReason,
		// Present only when the capture itself failed. A delivery that bailed earlier (an unreadable or
		// empty snapshot) spent no Browser Run and correctly records none.
		browserRunDurationMs,
	})
	// attempts counts this delivery, so attempts >= MAX means this was the final try. The pending
	// marker is left in place either way; it expires on its own and then requests re-enqueue.
	if (message.attempts < MAX_RENDER_ATTEMPTS) {
		message.retry({ delaySeconds: RETRY_DELAY_SECONDS * message.attempts })
		return
	}
	message.ack()
}
