import {
	DEFAULT_THUMBNAIL_HEIGHT,
	DEFAULT_THUMBNAIL_WIDTH,
	RENDER_PUSH_BUDGET_BYTES,
	ThumbnailRenderParams,
	ThumbnailSnapshotResponseBody,
	renderPushByteLength,
	renderPushScript,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { AssetRecordType, TLRecord, isShape, isShapeId } from '@tldraw/tlschema'
import { getR2KeyForRoom } from '../../r2'
import {
	Environment,
	OgImageRenderReason,
	ThumbnailBoardAccess,
	ThumbnailBoardKind,
	ThumbnailBoardRef,
} from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/base64'
import { evaluateFlagForUser, getFeatureFlagValue } from '../../utils/featureFlags'
import { getPublishedFileInfo, getPublishedRoomSnapshot } from './getPublishedFile'
import {
	SharedFileInfo,
	getSharedFileInfo,
	getSharedFileRoomSnapshot,
	isFileViewableFor,
} from './getSharedFile'
import { sliceSnapshotForRender } from './sliceSnapshotForRender'
import { BoardSnapshotReadError, RenderWorkerError } from './thumbnailShared'

// The render-and-cache core shared by every screenshot surface: the MCP screenshot tool
// (mcpServer.ts), the OG image route (getOgImage.ts), and the OG render queue consumer
// (ogImageQueue.ts). Owns board resolution, snapshot loading, the hand-off to the render worker, and
// the shared telemetry writer. The surfaces own their own protocol handling, cache keys, and
// retry/backoff policies.
//
// Owns no rate limiting: the pipeline's only limiters live in mcpServer.ts, so a new
// surface built on these helpers cannot pick one up by accident.

// A board a screenshot surface has resolved. Whether it is *publicly viewable* depends on the access
// the caller asked for — see ThumbnailBoardAccess. The version rotates when the rendered content
// changes (lastPublished for published boards, the persisted room snapshot's R2 etag for shared
// files), so it can key the thumbnail caches.
export interface ResolvedThumbnailBoard extends ThumbnailBoardRef {
	version: string | number
	/** The gate this board was resolved under, for the snapshot read that follows the resolution. */
	access: ThumbnailBoardAccess
	/**
	 * The `file` row this resolution gated on, for `shared_file` boards only. Carried so a caller that
	 * reads the snapshot in the same breath can hand it back to `loadBoardSnapshot` instead of asking
	 * Postgres the same question twice — see the `file` option on `getSharedFileRoomSnapshot` for when
	 * that is and is not appropriate.
	 */
	file?: SharedFileInfo
}

export type ResolveThumbnailBoardResult =
	| { ok: true; board: ResolvedThumbnailBoard }
	| { ok: false; reason: 'not_found' | 'board_empty' }

/**
 * Resolves a board slug of a known kind, applying the gate the caller asked for (see
 * `ThumbnailBoardAccess`). `access: 'public'` is the only thing standing between a private board and
 * the public internet, and it is re-applied per request rather than inferred from what is in R2 —
 * necessarily, since nothing deletes a thumbnail when a board stops being public.
 *
 * `board_empty` means the board passed its gate but has no persisted room content; `not_found` covers
 * everything the gate refused.
 */
export async function resolveThumbnailBoard(
	env: Environment,
	kind: ThumbnailBoardKind,
	slug: string,
	{
		access,
		file: knownFile,
	}: {
		access: ThumbnailBoardAccess
		/**
		 * The row a caller has *just* read for this same file, to be gated again rather than fetched a
		 * second time. The MCP path's access check reads `file` and this then selects a strict subset of
		 * the same columns microseconds later, so without this every tool call opens two Postgres pools
		 * for one row — three when the published fallback runs. Opt in per call site, like the same
		 * option on `loadBoardSnapshot`: the gate below is applied either way, so what a caller takes on
		 * is the staleness of the row, not a weaker check.
		 */
		file?: SharedFileInfo
	}
): Promise<ResolveThumbnailBoardResult> {
	if (kind === 'published') {
		// A published board's whole identity is its published slug, so there is no weaker gate to
		// apply: an unpublished board has no published snapshot to render in the first place.
		const publishedFile = await getPublishedFileInfo(env, slug)
		if (!publishedFile?.published) return { ok: false, reason: 'not_found' }
		return {
			ok: true,
			board: {
				kind,
				slug,
				version: publishedFile.lastPublished,
				access,
			},
		}
	}

	const file = knownFile ?? (await getSharedFileInfo(env, slug))
	if (!isFileViewableFor(file, access)) return { ok: false, reason: 'not_found' }

	// The persisted room's R2 etag rotates when the board content changes, so it keys the
	// thumbnail cache without a separate content-version field.
	const persisted = await env.ROOMS.head(getR2KeyForRoom({ slug, isApp: true }))
	if (!persisted) return { ok: false, reason: 'board_empty' }

	return { ok: true, board: { kind, slug, version: persisted.etag, access, file } }
}

// Reads a resolved board's snapshot, keeping the two outcomes callers must tell apart distinct.
// `null` means one thing only: an empty board, with no persisted room content. Anything the readers
// throw — Postgres, R2, a malformed payload, or the gate they re-check as they read — is wrapped as a
// BoardSnapshotReadError, so a database outage reaches telemetry under its own reason code instead of
// as an empty board.
export async function loadBoardSnapshot(
	env: Environment,
	board: ThumbnailBoardRef,
	{
		access,
		file,
	}: {
		access: ThumbnailBoardAccess
		/**
		 * The row a caller has *just* resolved this board against, to be gated again rather than
		 * re-fetched. Opt in per call site rather than reading it off `board`, so a surface takes the
		 * staleness that comes with it deliberately. See `getSharedFileRoomSnapshot`.
		 */
		file?: SharedFileInfo
	}
): Promise<RoomSnapshot | null> {
	try {
		const snapshot =
			board.kind === 'published'
				? await getPublishedRoomSnapshot(env, board.slug)
				: await getSharedFileRoomSnapshot(env, board.slug, { access, file })
		return snapshot ?? null
	} catch (error) {
		// Keep the original message in the wrapper's own text as well as its `cause`, so the Sentry
		// event title still names the real failure rather than reading as a generic read error.
		throw new BoardSnapshotReadError(
			`Could not read board snapshot: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error }
		)
	}
}

// OG and thumbnail renders are where the volume and the Browser Run spend are. Bucketed per board, so
// a board's renders are either all compared or none are.
async function isHeadlessScreenshotShadowFor(env: Environment, board: ThumbnailBoardRef) {
	if (!env.HEADLESS_WORKER) return false
	const flag = await getFeatureFlagValue(env, 'headless_shadow')
	return evaluateFlagForUser(flag, 'headless_shadow', `${board.kind}/${board.slug}`)
}

/**
 * What the render page draws: the payload pushed into the page (see captureThumbnailScreenshot) and
 * handed to the headless editor's shadow (see headlessShadow.ts). One builder, so the two cannot
 * draw different records.
 */
export function thumbnailSnapshotBodyFor(
	snapshot: RoomSnapshot | undefined,
	renderParams: ThumbnailRenderParams
): ThumbnailSnapshotResponseBody {
	// A corrupt or partial R2 payload can carry schema metadata without a documents array; guard it
	// so it returns a controlled 404 rather than throwing on the .map below and 500ing the render.
	if (!snapshot?.schema || !snapshot.documents) {
		return { error: true, message: 'Board not found' }
	}

	// A render can target a specific page, chosen from an earlier read of the board. If the page is gone
	// from this snapshot the render page would silently fall back to whichever page the snapshot opens
	// to, and the caller would get a picture of the wrong page. Fail instead, so the capture surfaces
	// as a retryable render error rather than a wrong image.
	if (
		renderParams.pageId &&
		!snapshot.documents.some((d) => (d.state as TLRecord | undefined)?.id === renderParams.pageId)
	) {
		return { error: true, message: 'Page not found' }
	}

	// Same reasoning as the page check above, and it matters more here: with every requested shape
	// gone the render page would have nothing to fit the camera to and would export a blank frame,
	// which the caller would take for a picture of those shapes. Requiring every id to still be
	// present turns a stale request into a retryable render error instead.
	if (renderParams.shapeIds) {
		const presentIds = new Set(snapshot.documents.map((d) => (d.state as TLRecord | undefined)?.id))
		if (!renderParams.shapeIds.every((id) => presentIds.has(id as TLRecord['id']))) {
			return { error: true, message: 'Shape not found' }
		}
	}

	const records = snapshot.documents.map((d) => d.state) as TLRecord[]
	return {
		error: false,
		// The rest of the board costs parse, migration and store load inside the Browser Run budget.
		records: sliceSnapshotForRender(records, renderParams) ?? records,
		schema: snapshot.schema,
		renderParams,
	}
}

// Renders one content-fit page of a board the caller has already read, at the OG image's size, and
// returns the PNG. The private render worker (apps/dotcom/render-worker) does the rendering: it owns
// the render page, the Browser Run call and the `browser_run_session` ledger, and reports a failure's
// detail to its own Sentry. The caller decides where to cache the result.
export async function captureThumbnailScreenshot(
	env: Environment,
	board: ThumbnailBoardRef,
	{
		pageId,
		reason,
		content,
		snapshot,
	}: {
		pageId: string
		/** The queue trigger, for the spend ledger. */
		reason: OgImageRenderReason
		/** What the board holds, for the ledger (see summarizeSnapshotContent). Never identifies it. */
		content: RenderContentSummary
		/** The board, as the caller read it: its records are pushed into the render page. */
		snapshot: RoomSnapshot
	}
): Promise<{ base64: string }> {
	// Previews bind no render worker. Worded for classifyScreenshotFailure, which files it as
	// `not_configured`.
	if (!env.RENDER_WORKER) {
		throw new Error('Rendering is not configured: this deployment has no RENDER_WORKER binding.')
	}

	const body = thumbnailSnapshotBodyFor(snapshot, {
		camera: 'content',
		pageId,
		// Ignored while `camera` is 'content'.
		x: 0,
		y: 0,
		z: 1,
		width: DEFAULT_THUMBNAIL_WIDTH,
		height: DEFAULT_THUMBNAIL_HEIGHT,
		theme: 'light',
	})
	// A page that vanished between the caller's choice and this snapshot.
	if (body.error) throw new Error(body.message)
	// Refuse a page too large to push before spending any RPC. The push carries only the records the
	// chosen page draws, so this measures the page, not the board. The injected script is the larger
	// of the two 32 MiB hops, so measuring it covers both.
	if (renderPushByteLength(renderPushScript(body)) > RENDER_PUSH_BUDGET_BYTES) {
		throw new RenderWorkerError('page_too_large')
	}
	const result = await env.RENDER_WORKER.screenshot({
		payload: body,
		telemetry: { source: 'queue', reason, content },
		shadow: await isHeadlessScreenshotShadowFor(env, board),
	})
	// A bounded reason; re-thrown so callers keep one throw/catch for every failure.
	if (!result.ok) throw new RenderWorkerError(result.reason)
	return { base64: arrayBufferToBase64(result.png.buffer as ArrayBuffer) }
}

/**
 * What a board holds, as numbers, for the session ledger. Numbers only: doubles carry no cardinality,
 * and none of these can identify a board (see "No board identifier leaves this pipeline" in
 * browser-run-thumbnails.md). Sizes come straight off the records, so the box is the union of top-level
 * shapes' positions and stored sizes — rotation ignored, sizeless shapes (draw strokes) counted as
 * points. A proxy, not geometry; the question it answers is whether render time and failure track
 * what is on the board, which a proxy resolves.
 */
export interface RenderContentSummary {
	records: number
	/** Shapes parented directly to the rendered page. */
	pageShapes: number
	/** Image and video asset records in the document, whichever page uses them. */
	mediaAssets: number
	bboxWidth: number
	bboxHeight: number
	/**
	 * Full-resolution megapixels of the image assets the rendered page's shapes use, each counted once,
	 * whatever their nesting. What decoding the originals would cost the render page.
	 */
	imageMegapixels: number
}

export function summarizeSnapshotContent(
	snapshot: RoomSnapshot,
	pageId: string | undefined
): RenderContentSummary {
	let pageShapes = 0
	let mediaAssets = 0
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	const imagePixels = new Map<string, number>()
	const parentOf = new Map<string, string>()
	const assetUsers: { shapeId: string; assetId: string }[] = []
	for (const { state } of snapshot.documents) {
		const record = state as {
			id?: string
			type?: string
			parentId?: string
			x?: number
			y?: number
			props?: { w?: unknown; h?: unknown; pixelRatio?: unknown; assetId?: unknown }
		}
		if (AssetRecordType.isInstance(state)) {
			if (record.type === 'image' || record.type === 'video') mediaAssets++
			if (record.type === 'image' && record.id) {
				const w = typeof record.props?.w === 'number' ? record.props.w : 0
				const h = typeof record.props?.h === 'number' ? record.props.h : 0
				const ratio = typeof record.props?.pixelRatio === 'number' ? record.props.pixelRatio : 1
				imagePixels.set(record.id, w * h * ratio * ratio)
			}
			continue
		}
		if (!isShape(state)) continue
		if (record.id && record.parentId) parentOf.set(record.id, record.parentId)
		if (record.id && typeof record.props?.assetId === 'string') {
			assetUsers.push({ shapeId: record.id, assetId: record.props.assetId })
		}
		if (pageId && record.parentId !== pageId) continue
		pageShapes++
		const x = record.x ?? 0
		const y = record.y ?? 0
		const w = typeof record.props?.w === 'number' ? record.props.w : 0
		const h = typeof record.props?.h === 'number' ? record.props.h : 0
		minX = Math.min(minX, x)
		minY = Math.min(minY, y)
		maxX = Math.max(maxX, x + w)
		maxY = Math.max(maxY, y + h)
	}
	const drawnAssets = new Set<string>()
	for (const { shapeId, assetId } of assetUsers) {
		if (!pageId || pageOfShape(parentOf, shapeId) === pageId) drawnAssets.add(assetId)
	}
	let imagePixelTotal = 0
	for (const assetId of drawnAssets) imagePixelTotal += imagePixels.get(assetId) ?? 0
	return {
		records: snapshot.documents.length,
		pageShapes,
		mediaAssets,
		bboxWidth: pageShapes ? maxX - minX : 0,
		bboxHeight: pageShapes ? maxY - minY : 0,
		imageMegapixels: imagePixelTotal / 1_000_000,
	}
}

// Bounded by the map's size, so a parent cycle in a corrupt document ends instead of hanging.
function pageOfShape(parentOf: Map<string, string>, shapeId: string): string | undefined {
	let id: string | undefined = shapeId
	for (let i = 0; i <= parentOf.size && isShapeId(id); i++) id = parentOf.get(id)
	return id
}

// Writes one rendered PNG to a thumbnail cache, stamping the content version (so a stale version
// can be detected) alongside any surface-specific metadata.
export async function putThumbnailPng(
	bucket: R2Bucket,
	key: string,
	base64: string,
	version: string | number,
	extraMetadata?: Record<string, string>
) {
	await bucket.put(key, base64ToArrayBuffer(base64), {
		httpMetadata: { contentType: 'image/png' },
		customMetadata: {
			version: String(version),
			createdAt: String(Date.now()),
			...extraMetadata,
		},
	})
}

// The request-level datapoint writer for every screenshot surface, so they share a dataset and blob
// layout and one dashboard covers them all; the source blob distinguishes mcp (the tool), og (the
// GET route) and queue (the render consumer). The dataset name covers all three despite its mcp_
// prefix, and must keep doing so: renaming it would split the dashboard's history.
//
// This event answers cache and refusal questions — hit rates by source, who was refused and why,
// what was rate-limited. What requests *spend* lives on the separate `browser_run_session` event
// (written by the render worker): one request can hold zero, one, or two browser sessions,
// so durations on request rows could only ever be sums that answer neither ledger cleanly.
//
// Carries **no board identity**: no index, no slug, no hash, no derived id. Not an omission — these
// datapoints answer aggregate cache and failure-rate questions, and the cost of that choice is a
// dataset that cannot say which board is failing. See "No board identifier leaves this pipeline" in
// browser-run-thumbnails.md.
export function writeScreenshotTelemetry(
	env: Environment,
	data: {
		// 'board_view' is the authenticated owner-facing thumbnail route (getBoardThumbnail.ts): kept
		// apart from 'og' because the two surfaces have different cache populations and different
		// callers, and folding them together would make the OG hit-rate panel unreadable.
		source: 'mcp' | 'og' | 'queue' | 'board_view'
		/**
		 * Which trigger asked for this render — what attributes a render to publishing or editing.
		 * Only meaningful on queue datapoints; the request paths have no trigger and record `none`.
		 */
		reason?: OgImageRenderReason
		/**
		 * Whether this delivery is the follow-up a completed render enqueues when a `published` board —
		 * the only kind that follows up — moved during its capture (see `enqueueFollowUpIfBoardMoved`),
		 * rather than the ask a trigger made. Separates
		 * the two halves of render spend, which `reason` cannot: a follow-up inherits the reason of the
		 * job it follows, so both land in the same bucket. Only meaningful on queue datapoints; the
		 * request paths have no follow-up and record `none`.
		 */
		followUp?: boolean
		/**
		 * What the PNG cache did for this request. `none` when the request never consulted it: the
		 * info tools have no cache at all, and a screenshot request refused before the cache read
		 * (bad input, rate-limited caller, unresolvable board) says nothing about cache health.
		 * Excluding `none` is what keeps a hit-rate-by-source panel honest. `unchanged` is a queue job
		 * whose board moved but whose image didn't need to: the edit was to records it doesn't draw.
		 */
		cacheStatus: 'hit' | 'stale' | 'miss' | 'unchanged' | 'none'
		/**
		 * Hashed identity of whoever asked, for surfaces that have one. Recorded only on rate-limited
		 * rows — see below.
		 *
		 * This is a hashed user id on the MCP surface, which now requires authentication; it replaced
		 * a hashed client IP, and holds the same blob position so the dashboard panels reading it did
		 * not have to move. The OG surfaces have no caller at all and leave it unset.
		 */
		callerHash?: string
		failureReason?: string
		rateLimitAllowed?: boolean
	}
) {
	const rateLimitAllowed = data.rateLimitAllowed ?? true
	// Only on rate-limited rows, which is the whole question a per-caller blob answers: who to look at
	// when spend spikes or a limit keeps firing.
	//
	// Deliberately narrower than "any failure". Cardinality is about distinct *values*, not row count,
	// and the failure set is mostly routine model mistakes — a wrong board id, a stale cluster id, a
	// page that moved. Nearly every caller produces one of those eventually, so gating on failure
	// would leave the number of distinct callers converging on the number of users, which is the cost
	// the gate exists to avoid. Rate limits fire rarely and only for callers worth naming.
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_shared_board_screenshot', {
		blobs: [
			`source:${data.source}`,
			`cache:${data.cacheStatus}`,
			`failure:${data.failureReason ?? 'none'}`,
			`rate_limit:${rateLimitAllowed ? 'allowed' : 'blocked'}`,
			`caller:${!rateLimitAllowed && data.callerHash ? data.callerHash : 'none'}`,
			// Appended rather than slotted in beside `source`, so the existing blob positions (and the
			// dashboard panels reading them) don't shift.
			`reason:${data.reason ?? 'none'}`,
			// Appended for the same reason. `none` rather than `false` for the surfaces that have no
			// follow-up concept at all, so a query for triggered renders can say `followup:false` and mean
			// it, instead of sweeping up every og and mcp datapoint too.
			`followup:${data.followUp ?? 'none'}`,
		],
		doubles: [
			DEFAULT_THUMBNAIL_WIDTH,
			DEFAULT_THUMBNAIL_HEIGHT,
			// Durations moved to the browser_run_session event; the sentinel holds this position (and
			// the ones after it) so historical rows and the panels reading them keep their meaning.
			-1,
			-1,
			rateLimitAllowed ? 1 : 0,
		],
	})
}
