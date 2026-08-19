import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import {
	OG_MAX_RENDER_ATTEMPTS,
	OG_PENDING_MARKER_TTL_MS,
	OG_REPAIR_COOLDOWN_MS,
	OG_RETRY_DELAY_SECONDS,
} from '../../config'
import {
	Environment,
	OgImageRenderQueueMessage,
	OgImageRenderReason,
	ThumbnailBoardRef,
} from '../../types'
import { deleteRenderTokenRecord } from '../../utils/renderTokens'
import { enumerateBoardPages } from './boardTools'
import {
	ResolvedThumbnailBoard,
	captureThumbnailScreenshot,
	loadBoardSnapshot,
	putThumbnailPng,
	resolveThumbnailBoard,
	writeScreenshotTelemetry,
} from './thumbnailRender'
import { classifyScreenshotFailure, reportThumbnailError } from './thumbnailShared'

// Queue-backed async board thumbnail generation. Renders are asked for by the things that change a
// board's content — publishing (the outbox publish effect) and editing (TLFileDurableObject) — and this
// consumer performs the capture out of band, refreshing the R2 cache the GET og-image route reads.
// That route only ever reads; the MCP tool must return its image in-band, so it captures inline into
// its own bucket. Neither goes through here.
//
// This path has no cap of any kind, by design. What bounds it is the render debounce upstream in
// TLFileDurableObject, which is per-board, so total spend scales with how many boards are edited at
// once. See "Request limits" in browser-run-thumbnails.md for why, and why the only rate limiting in
// the pipeline lives on the MCP endpoint instead (sharedBoardScreenshotMcp.ts).

// OG images render a single page as the unfurl preview. Pick the first page (in board order) that
// has content, so a board whose first page is empty still gets a meaningful image; fall back to the
// first page when none have content, which renders as a blank.
function pickOgImagePageId(snapshot: RoomSnapshot): string | undefined {
	const pages = enumerateBoardPages(snapshot)
	if (pages.length === 0) return undefined
	return (pages.find((page) => page.hasContent) ?? pages[0]).id
}

/**
 * A board's one OG image. The key carries only what can address two objects at once: the board, and
 * the theme, which a dark-mode card would need.
 *
 * Keep it that way, and keep the output dimensions out in particular. This key is the image's sole
 * address, in a bucket with no expiration rule, so any segment that can change re-addresses every
 * board's image at once and strands the old objects permanently — unreachable, un-overwritable, one per
 * board. A size change is a replacement rather than a second object, so it belongs in the object's
 * metadata, which overwrites in place.
 *
 * The trade: a size change serves old-sized images as fresh hits until each board next renders, since
 * the stored `version` tracks board content rather than render parameters.
 */
export function getOgImageCacheKey(board: ThumbnailBoardRef) {
	return `og/${board.kind}/${board.slug}/light.png`
}

export type EnqueueOgImageResult = 'enqueued' | 'already_pending' | 'unavailable'

// The single-flight marker. Its TTL and the retry constants live together in config.ts, where the
// comment on OG_PENDING_MARKER_TTL_MS explains the inequality that binds them.
function getOgImagePendingKey(board: ThumbnailBoardRef) {
	return getOgImageCacheKey(board).replace(/\.png$/, '.pending')
}

// Armed when a crawler-triggered job gives up, consulted only by the OG route's published-board
// repair (see OG_REPAIR_COOLDOWN_MS in config.ts). Deliberately not consulted by enqueueOgImageRender
// itself: a republish is a genuine new snapshot and must render regardless of how the last attempt
// went, so only the one ask an outside caller can cause is metered. For the same reason the publish
// trigger *clears* it: the cooldown is evidence about the snapshot that failed, and a republish
// replaces that snapshot, so the new one gets its own repair backstop — and re-arms the cooldown
// itself if it turns out to fail too.
function getOgImageRepairCooldownKey(board: ThumbnailBoardRef) {
	return getOgImageCacheKey(board).replace(/\.png$/, '.repair-cooldown')
}

export async function isOgImageRepairOnCooldown(
	env: Environment,
	board: ThumbnailBoardRef
): Promise<boolean> {
	if (!env.THUMBNAILS) return false
	// Fail open on a read error: the enqueue this gates needs the same bucket for its pending marker,
	// so if R2 is genuinely down the ask fails and reports there rather than being silently skipped.
	const existing = await env.THUMBNAILS.head(getOgImageRepairCooldownKey(board)).catch(() => null)
	if (!existing) return false
	const expiresAt = Number(existing.customMetadata?.expiresAt)
	return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

export async function enqueueOgImageRender(
	env: Environment,
	board: ThumbnailBoardRef,
	{
		reason,
		followUp,
		firedAt,
	}: {
		// Required rather than defaulted: every trigger knows why it is asking, and a default would put
		// whichever one forgot to say into some other trigger's telemetry bucket.
		reason: OgImageRenderReason
		followUp?: boolean
		/**
		 * When the ask fired, for asks made by the file DO's debounce alarm. The marker's expiry is
		 * stamped from it rather than from the moment the R2 write below lands: the alarm resets the
		 * debouncer's window *before* this function's R2 round trip runs, so a persist can land in
		 * between and start a new max-wait window earlier than the marker's write. Counting the TTL
		 * from the fire keeps that window ending at or past the marker's expiry, which is what lets
		 * OG_RENDER_MAX_WAIT_MS >= OG_PENDING_MARKER_TTL_MS hold by exact equality (both pinned in
		 * ogImageQueue.test.ts). Callers that are not debounced fires omit it.
		 */
		firedAt?: number
	}
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
			expiresAt: String((firedAt ?? Date.now()) + OG_PENDING_MARKER_TTL_MS),
		},
	})

	const message: OgImageRenderQueueMessage = {
		type: 'og-image-render',
		kind: board.kind,
		slug: board.slug,
		reason,
		...(followUp ? { followUp } : null),
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

// Clears only the pending render marker, keeping the image. Called when a render job is dropped: a
// marker left behind would suppress the next legitimate enqueue until it expired.
export async function clearOgImagePendingMarker(
	env: Environment,
	board: ThumbnailBoardRef
): Promise<void> {
	if (!env.THUMBNAILS) return
	await env.THUMBNAILS.delete(getOgImagePendingKey(board)).catch(() => {})
}

// Deletes the image as well as the marker and the repair cooldown. Only for `published` boards
// losing their publication. Scoped by the `board` passed in, so calling it with `kind: 'published'`
// cannot touch the file-keyed image of the same board.
export async function deleteOgImage(env: Environment, board: ThumbnailBoardRef): Promise<void> {
	if (!env.THUMBNAILS) return
	await Promise.all([
		env.THUMBNAILS.delete(getOgImageCacheKey(board)).catch(() => {}),
		env.THUMBNAILS.delete(getOgImagePendingKey(board)).catch(() => {}),
		env.THUMBNAILS.delete(getOgImageRepairCooldownKey(board)).catch(() => {}),
	])
}

/**
 * Everything this pipeline stores for one board, removed when the file is hard deleted
 * (`TLFileDurableObject.appFileRecordDidDelete`, alongside the room snapshot and the histories).
 *
 * Both kinds go, because each is normally kept for a reason about a board that still exists: the
 * file-keyed image survives *unsharing* deliberately, and the published-slug image only goes on
 * *unpublish*. A hard delete leaves nothing to reshare and no snapshot to depict.
 *
 * The stakes are orphans rather than tidiness. `og/…` keys carry no version, so a board owns exactly
 * one object, and `THUMBNAILS` has no lifecycle rule and must never be given one — so anything left
 * behind here is an object nothing will ever read, overwrite or sweep. MCP screenshots need no
 * equivalent: their keys carry a content version and their bucket expires them.
 *
 * Best effort throughout, because it runs inside a teardown that must complete regardless.
 */
export async function deleteBoardThumbnails(
	env: Environment,
	{ fileId, publishedSlug }: { fileId: string; publishedSlug?: string | null }
): Promise<void> {
	const boards: ThumbnailBoardRef[] = [{ kind: 'shared_file', slug: fileId }]
	// A file with no published slug never had a published key to delete, and deriving one from an empty
	// slug would address `og/published//light.png` — some other board's neighbourhood, not this one's.
	if (publishedSlug) boards.push({ kind: 'published', slug: publishedSlug })
	await Promise.all(
		boards.flatMap((board) => [deleteOgImage(env, board), deleteRenderTokenRecord(env, board)])
	)
}

/**
 * The publish effect's ask, and the reporting that goes with it.
 *
 * This is the *only* trigger a published board has. Its snapshot is frozen, so nothing edits it into
 * asking again, where a shared file re-asks on every persist that advances its document clock. So an
 * ask lost here — thrown, or turned away as `already_pending` by a marker an earlier failure left
 * behind, or `unavailable` — leaves that board's card generic until it is republished, and none of
 * those are exceptional enough to notice by themselves. `getOgImage` repairs the outcome on the next
 * fetch; `reportProblem` is how the cause becomes visible.
 */
export async function enqueuePublishThumbnailRender(
	env: Environment,
	publishedSlug: string,
	reportProblem: (error: unknown) => void
): Promise<void> {
	const board: ThumbnailBoardRef = { kind: 'published', slug: publishedSlug }
	// An in-place republish reuses the slug, so a cooldown armed against the previous snapshot's
	// failure would otherwise outlive the snapshot it was evidence about and block the new one's
	// repair. Cleared unconditionally and first: even if the enqueue below fails, the next crawl's
	// repair is exactly the backstop that failure needs.
	await env.THUMBNAILS?.delete(getOgImageRepairCooldownKey(board)).catch(() => {})
	try {
		const result = await enqueueOgImageRender(env, board, { reason: 'publish' })
		if (result !== 'enqueued') {
			reportProblem(new Error(`Publish thumbnail enqueue did not take effect: ${result}`))
		}
	} catch (error) {
		reportProblem(error)
	}
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
	// Normalised once, for the same reason `reason` is: the flag is optional on the wire (only follow-up
	// messages set it), and every delivery of one job must record the same value on every path.
	const followUp = message.body.followUp ?? false
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
			followUp,
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
			writeScreenshotTelemetry(env, { source: 'queue', reason, followUp, cacheStatus: 'hit' })
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
		//
		// `file` is the row the resolve above already gated on, handed back so this read re-applies the
		// gate without asking Postgres the same question a second time. Safe precisely here: the two are
		// microseconds apart in one function, where a re-read would return the row we already hold. The
		// render page's own read (getThumbnailSnapshot) deliberately does not do this — it is a separate
		// request, and its re-read is what makes an un-share land inside the token's window.
		const snapshot = await loadBoardSnapshot(env, board, { access: 'render', file: board.file })
		if (!snapshot) {
			// No persisted content. The render page reads the snapshot through the same functions, so it
			// would 404 and come back as a render failure — after spending a Browser Run slot to learn
			// what we already know. Retry from here instead, in case content lands shortly after the
			// enqueue. A read that *fails* throws rather than landing here, and the catch below retries it
			// the same way, so neither path spends Browser Run.
			await retryOrDrop(env, message, {
				reason,
				followUp,
				failureReason: 'board_empty',
				board: boardRef,
			})
			return
		}

		// The render page exports the chosen page; the worker screenshots it through the BROWSER
		// binding and writes the PNG to the cache key the OG route reads.
		const render = await captureThumbnailScreenshot(env, board, {
			surface: 'og',
			pageId: pickOgImagePageId(snapshot),
			theme: 'light',
			width: DEFAULT_THUMBNAIL_WIDTH,
			height: DEFAULT_THUMBNAIL_HEIGHT,
			// `source` is the telemetry surface, not the render pipeline: these sessions belong to the
			// queue's ledger even though the job is signed for the og pipeline.
			telemetry: { source: 'queue', reason },
		})
		await putThumbnailPng(env.THUMBNAILS, cacheKey, render.base64, board.version)
		await clearOgImagePendingMarker(env, boardRef)
		await enqueueFollowUpIfBoardMoved(env, message, board, reason, ctx)

		writeScreenshotTelemetry(env, { source: 'queue', reason, followUp, cacheStatus: 'miss' })
		message.ack()
	} catch (error) {
		// Reported once per job, on the delivery that gives up, rather than once per delivery: a board
		// that fails deterministically fails all OG_MAX_RENDER_ATTEMPTS times, and one problem should not
		// file three events. A failure that recovers on retry reports nothing, which is correct — the
		// render landed. Sentry gets the unbounded original; telemetry below gets a bounded reason code,
		// since raw error.message would blow up that dimension's cardinality.
		if (message.attempts >= OG_MAX_RENDER_ATTEMPTS) {
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
		await retryOrDrop(env, message, {
			reason,
			followUp,
			failureReason: classifyScreenshotFailure(error),
			board: boardRef,
		})
	}
}

/**
 * A capture takes seconds, and the board can change during one. A *publish* landing in that window
 * asks for a render, finds the pending marker this job set, and is turned away — the ask is
 * *dropped*, not deferred, and nothing ever re-asks for a published board: its snapshot is frozen,
 * so the render we just wrote would be the last word, showing the previous publication. This check
 * is what closes that, and it is `published`-only because published boards are the only kind whose
 * dropped ask stays dropped.
 *
 * A shared file's dropped ask is deferred by construction, in two halves pinned in
 * ogImageQueue.test.ts. A *debounced* fire's ask is only turned away while this job's marker is
 * alive, which places its persist a full OG_RENDER_DEBOUNCE_MS before the marker's clear — while
 * the image whose write performs that clear read its snapshot at most THUMBNAIL_RENDER_TIMEOUT_MS
 * plus the post-capture tail before it, retries included. The debounce being the longer of the two
 * means the dropped ask's content is already in the image. A *max-wait* fire escapes that bound but
 * cannot be turned away at all: the fire that enqueued this job reset the debouncer's window, so a
 * clamped fire lands at or past the marker's TTL. Following up here as well bought nothing worth
 * its cost — follow-ups were roughly a fifth of shared-file
 * queue captures in production (measured 2026-08-11 via the `followup` telemetry blob): on a board
 * that settled, the follow-up merely relocated the render the debounced ask was about to do; on a
 * board still moving, it rendered a mid-edit state the next debounced render superseded.
 *
 * Both halves price the job ending in an image write, which a give-up never does — the asks its
 * marker turned away deferred into nothing. A known residue, not a regression; see "the deferral
 * stops at that give-up" in browser-run-thumbnails.md.
 *
 * Deliberately never chained. A published board republished without pause would otherwise find
 * itself stale on every follow-up and render continuously. One extra render per triggered render is
 * the ceiling.
 *
 * Best effort: the image is already written and the marker already cleared, so a failure here loses a
 * refresh, not the render. It must not turn a completed job into a retry.
 */
async function enqueueFollowUpIfBoardMoved(
	env: Environment,
	message: Message<OgImageRenderQueueMessage>,
	rendered: ResolvedThumbnailBoard,
	reason: OgImageRenderReason,
	ctx?: ExecutionContext
) {
	if (rendered.kind !== 'published') return
	if (message.body.followUp) return
	try {
		const current = await readCurrentPublishedVersion(env, rendered)
		if (current === null) return
		if (String(current) === String(rendered.version)) return
		await enqueueOgImageRender(env, rendered, { reason, followUp: true })
	} catch (error) {
		reportThumbnailError(error, {
			ctx,
			env,
			surface: 'og_queue',
			extras: { kind: rendered.kind, followUpCheck: true },
		})
	}
}

/**
 * The published board's current `lastPublished`, for the "did it move while we were capturing?"
 * check above and nothing else. `null` means there is nothing to compare against, which is treated
 * as "don't follow up". A full resolve rather than something lighter, because a published version is
 * a Postgres column with no R2 shortcut — and publishing is not a hot path.
 */
async function readCurrentPublishedVersion(
	env: Environment,
	board: ResolvedThumbnailBoard
): Promise<string | number | null> {
	const resolved = await resolveThumbnailBoard(env, board.kind, board.slug, { access: 'render' })
	return resolved.ok ? resolved.board.version : null
}

async function retryOrDrop(
	env: Environment,
	message: Message<OgImageRenderQueueMessage>,
	{
		reason,
		followUp,
		failureReason,
		board,
	}: {
		/**
		 * Passed in already resolved rather than read off the message here, so a delivery that fails is
		 * attributed to the same trigger as one that succeeds. Reading `message.body.reason` directly
		 * would bucket a legacy message with no reason as `none` on this path and `crawler` on the
		 * others, splitting one job's deliveries across two values.
		 */
		reason: OgImageRenderReason
		/** Resolved by the caller for the same reason as `reason` above. */
		followUp: boolean
		failureReason: string
		board: ThumbnailBoardRef
	}
) {
	// One datapoint per delivery, the opposite of the Sentry report above: three deliveries are three
	// failures on this ledger, one problem on Sentry's. The Browser Run spend of a delivery that
	// reached the capture is on the browser_run_session event, written inside the render itself.
	writeScreenshotTelemetry(env, {
		source: 'queue',
		reason,
		followUp,
		cacheStatus: 'miss',
		failureReason,
	})
	// attempts counts this delivery, so attempts >= MAX means this was the final try.
	if (message.attempts < OG_MAX_RENDER_ATTEMPTS) {
		// Marker kept: a retry is still this job in flight, and the next delivery re-resolves anyway, so
		// an ask turned away meanwhile costs nothing — it would have rendered the same content.
		message.retry({ delaySeconds: OG_RETRY_DELAY_SECONDS * message.attempts })
		return
	}
	// Given up, so nothing is in flight and the marker has nothing left to single-flight. Clearing it
	// rather than letting it lapse means the next ask is acted on immediately instead of being turned
	// away for the rest of the TTL — which matters most here, since this board has no image at all.
	await clearOgImagePendingMarker(env, board)
	// But when the ask that failed was itself the OG route's crawler-triggered repair, "immediately"
	// is the problem rather than the point: with the marker gone, the next unauthenticated request
	// would re-arm the whole retry chain, letting traffic an outside caller controls spend Browser Run
	// on a board that just proved it cannot render. Arm the repair cooldown instead — publish- and
	// edit-triggered asks don't consult it, so a genuine republish still renders straight away. Best
	// effort: a cooldown that fails to write costs extra renders, not the ack.
	if (board.kind === 'published' && reason === 'crawler') {
		await env.THUMBNAILS?.put(getOgImageRepairCooldownKey(board), new Uint8Array(), {
			customMetadata: { expiresAt: String(Date.now() + OG_REPAIR_COOLDOWN_MS) },
		}).catch(() => {})
	}
	message.ack()
}
