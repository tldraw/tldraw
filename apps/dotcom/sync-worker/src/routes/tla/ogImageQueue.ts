import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import {
	Environment,
	OgImageRenderQueueMessage,
	OgImageRenderReason,
	ThumbnailBoardRef,
} from '../../types'
import {
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

// Queue-backed async board thumbnail generation. Renders are asked for by the things that change a
// board's content — publishing (TLPostgresReplicator) and editing (TLFileDurableObject) — and this
// consumer performs the capture out of band, refreshing the R2 cache the GET og-image route reads.
// That route only ever reads; the MCP tool must return its image in-band, so it captures inline into
// its own bucket. Neither goes through here.
//
// This path has no cap of any kind, by design. What bounds it is the render debounce upstream in
// TLFileDurableObject, which is per-board, so total spend scales with how many boards are edited at
// once. See "Request limits" in browser-run-thumbnails.md for why, and why the only rate limiting in
// the pipeline lives on the MCP endpoint instead (sharedBoardScreenshotMcp.ts).

// Suppresses a duplicate enqueue while a render is queued or in flight. A single-flight, not a rate
// limit: the consumer clears it as soon as a render lands, so on a healthy board it never reaches
// this TTL, which exists only so a consumer dying cannot wedge a board permanently. To change how
// often a board renders, change OG_RENDER_DEBOUNCE_MS.
const PENDING_MARKER_TTL_MS = 2 * 60_000
// Retries are bounded by max_retries in wrangler.toml too; this lower cap keeps thumbnail jobs from
// burning Browser Run capacity on a persistently failing board.
const MAX_RENDER_ATTEMPTS = 3
const RETRY_DELAY_SECONDS = 30

// OG images render a single page as the unfurl preview. Pick the first page (in board order) that
// has content, so a board whose first page is empty still gets a meaningful image; fall back to the
// first page when none have content, which renders as a blank.
function pickOgImagePageId(snapshot: RoomSnapshot): string | undefined {
	const pages = enumerateBoardPages(snapshot)
	if (pages.length === 0) return undefined
	return (pages.find((page) => page.hasContent) ?? pages[0]).id
}

export function getOgImageCacheKey(board: ThumbnailBoardRef) {
	return `og/${board.kind}/${board.slug}/${DEFAULT_THUMBNAIL_WIDTH}x${DEFAULT_THUMBNAIL_HEIGHT}/light.png`
}

export type EnqueueOgImageResult = 'enqueued' | 'already_pending' | 'unavailable'

function getOgImagePendingKey(board: ThumbnailBoardRef) {
	return getOgImageCacheKey(board).replace(/\.png$/, '.pending')
}

export async function enqueueOgImageRender(
	env: Environment,
	board: ThumbnailBoardRef,
	// Required rather than defaulted: every trigger knows why it is asking, and a default would put
	// whichever one forgot to say into some other trigger's telemetry bucket.
	{ reason }: { reason: OgImageRenderReason }
): Promise<EnqueueOgImageResult> {
	if (!env.THUMBNAILS || !env.QUEUE) return 'unavailable'

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

// The two keys are not symmetric when a board stops being publicly viewable, and the difference is
// what the next two functions are for. `og/shared_file/{fileId}/…` is keyed on the file id, so it
// stays useful for as long as the board exists and unsharing keeps it: an unshared board's image is
// already unreachable, since the only route that serves one re-checks the gate per request.
// `og/published/{publishedSlug}/…` depicts a published snapshot, so unpublishing destroys what it was
// a picture of — and its key is the published slug, so leaving it would strand an object that a
// regenerated publish link could make permanently unreadable. See "Nothing deletes a rendered image"
// in browser-run-thumbnails.md.

// Clears only the pending render marker, keeping the image. For a board that stops being *shared*,
// and for a dropped render job — a marker left behind would suppress the next legitimate enqueue,
// after a reshare or after the render that failed.
export async function clearOgImagePendingMarker(
	env: Environment,
	board: ThumbnailBoardRef
): Promise<void> {
	if (!env.THUMBNAILS) return
	await env.THUMBNAILS.delete(getOgImagePendingKey(board)).catch(() => {})
}

// Deletes the image as well as the marker. Only for `published` boards losing their publication.
// Scoped by the `board` passed in, so calling it with `kind: 'published'` cannot touch the
// file-keyed image of the same board.
export async function deleteOgImage(env: Environment, board: ThumbnailBoardRef): Promise<void> {
	if (!env.THUMBNAILS) return
	await Promise.all([
		env.THUMBNAILS.delete(getOgImageCacheKey(board)).catch(() => {}),
		env.THUMBNAILS.delete(getOgImagePendingKey(board)).catch(() => {}),
	])
}

// Queue consumer. Re-resolves the board at render time rather than trusting the enqueued state: a
// board deleted or unpublished while queued is dropped without rendering, and the version is re-read
// so the render captures the newest content, coalescing a burst of enqueues into one capture.
export async function handleOgImageRenderMessage(
	env: Environment,
	message: Message<OgImageRenderQueueMessage>,
	ctx?: ExecutionContext
): Promise<void> {
	const { kind, slug } = message.body
	const boardRef: ThumbnailBoardRef = { kind, slug }
	// A message already in the queue may carry no reason; see OgImageRenderQueueMessage.
	const reason = message.body.reason ?? 'crawler'
	const cacheKey = getOgImageCacheKey(boardRef)
	// The board was deleted, was unpublished, or has no persisted content. Terminal, not transient: ack
	// rather than retry, since no number of retries brings the board back. Applies the same delete/keep
	// asymmetry as the effects above.
	const dropNoLongerViewable = async () => {
		await (kind === 'published'
			? deleteOgImage(env, boardRef)
			: clearOgImagePendingMarker(env, boardRef))
		writeScreenshotTelemetry(env, {
			source: 'queue',
			reason,
			cacheStatus: 'miss',
			failureReason: 'board_not_viewable',
		})
		message.ack()
	}

	try {
		// 'render' rather than 'public': every board gets a thumbnail, private ones included. The OG
		// route re-applies the public gate when it serves.
		const resolved = await resolveThumbnailBoard(env, kind, slug, { access: 'render' })
		if (!resolved.ok) {
			await dropNoLongerViewable()
			return
		}
		const board = resolved.board

		// Another consumer (or an earlier retry) may already have rendered this version.
		const cached = await env.THUMBNAILS?.head(cacheKey)
		if (cached?.customMetadata?.version === String(board.version)) {
			await clearOgImagePendingMarker(env, boardRef)
			writeScreenshotTelemetry(env, { source: 'queue', reason, cacheStatus: 'hit' })
			message.ack()
			return
		}

		if (!env.THUMBNAILS) {
			throw new Error('THUMBNAILS bucket is not configured')
		}

		// No capacity check, by design (see the top of this file). The version check above is what stops
		// redundant work: everything past this point is a board whose cached thumbnail genuinely no
		// longer matches its content.

		// Loaded to target the first page that has content, so a board whose first page is empty still
		// gets a meaningful unfurl image.
		const snapshot = await loadBoardSnapshot(env, board, { access: 'render' })
		if (!snapshot) {
			// No persisted content. The render page reads the snapshot through the same functions, so it
			// would 404 and come back as a render failure — after spending a Browser Run slot to learn
			// what we already know. Retry from here instead, in case content lands shortly after the
			// enqueue. A read that *fails* throws rather than landing here, and the catch below retries it
			// the same way, so neither path spends Browser Run.
			retryOrDrop(env, message, { reason, failureReason: 'board_empty' })
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
		await clearOgImagePendingMarker(env, boardRef)

		writeScreenshotTelemetry(env, {
			source: 'queue',
			reason,
			cacheStatus: 'miss',
			browserRunDurationMs: render.durationMs,
		})
		message.ack()
	} catch (error) {
		// Reported once per job, on the delivery that gives up, rather than once per delivery: a board
		// that fails deterministically fails all MAX_RENDER_ATTEMPTS times, and one problem should not
		// file three events. A failure that recovers on retry reports nothing, which is correct — the
		// render landed. Sentry gets the unbounded original; telemetry below gets a bounded reason code,
		// since raw error.message would blow up that dimension's cardinality.
		if (message.attempts >= MAX_RENDER_ATTEMPTS) {
			reportThumbnailError(error, {
				ctx,
				env,
				surface: 'og_queue',
				extras: { kind, attempts: message.attempts },
			})
		}
		// A board deleted between the resolve above and the snapshot read is retried rather than dropped,
		// because from here it looks like any other read failure. That costs one extra delivery, not one
		// extra render: the retry re-resolves at the top and drops before spending any Browser Run.
		retryOrDrop(env, message, {
			reason,
			failureReason: classifyScreenshotFailure(error),
			browserRunDurationMs: browserRunDurationOf(error),
		})
	}
}

function retryOrDrop(
	env: Environment,
	message: Message<OgImageRenderQueueMessage>,
	{
		reason,
		failureReason,
		browserRunDurationMs,
	}: {
		/**
		 * Passed in already resolved rather than read off the message here, so a delivery that fails is
		 * attributed to the same trigger as one that succeeds. Reading `message.body.reason` directly
		 * would bucket a legacy message with no reason as `none` on this path and `crawler` on the
		 * others, splitting one job's deliveries across two values.
		 */
		reason: OgImageRenderReason
		failureReason: string
		browserRunDurationMs?: number
	}
) {
	// One datapoint per delivery, the opposite of the Sentry report above, because this dataset is the
	// spend ledger for an uncapped render path: every delivery that reaches the capture creates a
	// browser and can hold it for the full THUMBNAIL_RENDER_TIMEOUT_MS, last attempt or not. Telemetry
	// counts spend, Sentry counts problems — three deliveries are three lots of spend, one problem.
	writeScreenshotTelemetry(env, {
		source: 'queue',
		reason,
		cacheStatus: 'miss',
		failureReason,
		// Present only when the capture itself failed. A delivery that bailed earlier (an unreadable or
		// empty snapshot) spent no Browser Run and correctly records none.
		browserRunDurationMs,
	})
	// attempts counts this delivery, so attempts >= MAX means this was the final try. The pending
	// marker is left in place either way; it expires on its own, and the next edit or publish re-asks.
	if (message.attempts < MAX_RENDER_ATTEMPTS) {
		message.retry({ delaySeconds: RETRY_DELAY_SECONDS * message.attempts })
		return
	}
	message.ack()
}
