import {
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_DIMENSION,
	MIN_THUMBNAIL_DIMENSION,
	THUMBNAIL_RENDER_ERROR_MAX_LENGTH,
	THUMBNAIL_RENDER_GLOBAL,
	THUMBNAIL_RENDER_PUSH_PARAM,
	THUMBNAIL_SETTLE_TIMEOUT_MS,
	ThumbnailRenderErrorRequestBody,
	ThumbnailRenderParams,
	ThumbnailRenderPhase,
	ThumbnailRenderTimingsRequestBody,
	ThumbnailSnapshotResponseBody,
} from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Box,
	Editor,
	Image,
	SerializedSchema,
	TLPageId,
	TLRecord,
	Tldraw,
	fetch,
	sleep,
	useEditor,
	TLAssetId,
	TLBookmarkShape,
	AssetRecordType,
	getHashForString,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { assetUrls } from '../utils/assetUrls'
import {
	getRequestedBounds,
	getRequestedShapeIds,
	getThumbnailContentInset,
	renderThumbnailPng,
} from '../utils/boardCapture'
import { embedShapeUtils } from '../utils/embedShapeUtil'

// The thumbnail render page: a real editor, loaded with one board's records, that exports itself
// and displays the export for Browser Run to screenshot. Served as its own Vite entry
// (thumbnail-render.html + thumbnail-render-main.tsx) rather than as an SPA route, so a capture
// boots the SDK and nothing else — no router, no Clerk, no service worker. /__thumbnail-render is
// rewritten to that entry at the edge (scripts/build.ts) and in dev
// (vite-thumbnail-screenshot-plugin.ts), so the URL the sync-worker renders never moves.

const THUMBNAIL_SNAPSHOT_ENDPOINT = '/api/app/thumbnail-render/snapshot'
const THUMBNAIL_RESULT_ENDPOINT = '/api/app/thumbnail-render/result'

// Phase stamps for the timing beacon, module-scoped because the page renders exactly once. Each is
// performance.now() at the moment the phase completed; the beacon ships them after the export so
// the deltas — boot, acquire, mount, settle, export — can be read per render from telemetry
// (`render_page_timings`). Worker-side timing can only see the session total; this is what ranks
// the page's own phases against each other.
const pageTimings: {
	/** Authorises the beacon. Never set on the dev fixture page, which therefore sends none. */
	token?: string
	acquiredBy?: 'push' | 'fetch'
	bootAt?: number
	dataAt?: number
	mountAt?: number
	settledAt?: number
} = {}

// Fire-and-forget: nothing waits on this, and `keepalive` lets the request outlive the page —
// which it must, because the screenshot (and the session's teardown) follows the ready marker
// almost immediately.
function sendTimingsBeacon(exportedAt: number) {
	const { token, acquiredBy, bootAt, dataAt, mountAt, settledAt } = pageTimings
	if (
		!token ||
		bootAt === undefined ||
		dataAt === undefined ||
		mountAt === undefined ||
		settledAt === undefined
	) {
		return
	}
	const body: ThumbnailRenderTimingsRequestBody = {
		token,
		acquiredBy,
		timings: { bootAt, dataAt, mountAt, settledAt, exportedAt },
	}
	// A plain same-origin fetch: forcing it into no-cors mode turned out to stop delivery entirely.
	fetch(THUMBNAIL_RESULT_ENDPOINT, {
		method: 'POST',
		keepalive: true,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}).catch(() => {})
}

// The page's own reason for a failure. Without it the worker sees only Browser Run's "capture
// element missing", which is the same for every way the page can fail. Once per page: an error is
// terminal, but more than one path can mark it.
let errorReported = false
function sendErrorBeacon(message: string) {
	const { token, dataAt, mountAt, settledAt } = pageTimings
	if (!token || errorReported) return
	errorReported = true
	const phase: ThumbnailRenderPhase =
		settledAt !== undefined
			? 'settle'
			: mountAt !== undefined
				? 'mount'
				: dataAt !== undefined
					? 'data'
					: 'boot'
	const body: ThumbnailRenderErrorRequestBody = {
		token,
		error: { message: message.slice(0, THUMBNAIL_RENDER_ERROR_MAX_LENGTH), phase },
	}
	fetch(THUMBNAIL_RESULT_ENDPOINT, {
		method: 'POST',
		keepalive: true,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}).catch(() => {})
}

export type ThumbnailRenderData =
	| {
			ok: true
			token: string
			records: TLRecord[]
			schema: SerializedSchema
			renderParams: ThumbnailRenderParams
	  }
	| {
			ok: false
			message: string
	  }

type ThumbnailPushedSnapshot = Extract<ThumbnailSnapshotResponseBody, { error: false }>

declare global {
	interface Window {
		[THUMBNAIL_RENDER_GLOBAL]?: ThumbnailPushedSnapshot
	}
}

// The injected script runs after navigation, often after this module has looked, so a one-shot
// setter catches the assignment. No timer: a push that never lands ends as the capture's timeout,
// and the worker fetches on the board's next attempt (see markPushTimedOut).
function awaitPushedSnapshot(): Promise<ThumbnailPushedSnapshot> {
	return new Promise((resolve) => {
		Object.defineProperty(window, THUMBNAIL_RENDER_GLOBAL, {
			configurable: true,
			set: (value: ThumbnailPushedSnapshot) => {
				Object.defineProperty(window, THUMBNAIL_RENDER_GLOBAL, {
					configurable: true,
					writable: true,
					value,
				})
				resolve(value)
			},
			get: () => undefined,
		})
	})
}

/** The render job the URL's token names: the records to draw and how to draw them. */
export async function acquireThumbnailRenderData(url: URL): Promise<ThumbnailRenderData> {
	pageTimings.bootAt = performance.now()
	const token = url.searchParams.get('token')
	pageTimings.token = token ?? undefined

	if (!token) {
		return { ok: false, message: 'Missing render token' }
	}

	const pushed =
		window[THUMBNAIL_RENDER_GLOBAL] ??
		(url.searchParams.get(THUMBNAIL_RENDER_PUSH_PARAM) === '1' ? await awaitPushedSnapshot() : null)
	if (pushed) {
		pageTimings.acquiredBy = 'push'
		pageTimings.dataAt = performance.now()
		return {
			ok: true,
			token,
			records: pushed.records,
			schema: pushed.schema,
			renderParams: pushed.renderParams,
		}
	}

	const result = await fetch(
		`${THUMBNAIL_SNAPSHOT_ENDPOINT}?token=${encodeURIComponent(token)}`
	).catch(() => null)
	if (!result?.ok) {
		return { ok: false, message: `Could not load render job (${result?.status ?? 'network'})` }
	}

	const data = (await result.json()) as ThumbnailSnapshotResponseBody
	if (data.error) {
		return { ok: false, message: data.message }
	}

	pageTimings.acquiredBy = 'fetch'
	pageTimings.dataAt = performance.now()
	return {
		ok: true,
		token,
		records: data.records,
		schema: data.schema,
		renderParams: data.renderParams,
	}
}

export function ThumbnailRenderView({ data }: { data: ThumbnailRenderData }) {
	if (!data.ok) return <ThumbnailRenderError message={data.message} />
	return (
		<ThumbnailRenderPage
			records={data.records}
			schema={data.schema}
			renderParams={data.renderParams}
		/>
	)
}

function ThumbnailRenderPage({
	records,
	schema,
	renderParams,
}: {
	records: TLRecord[]
	schema: SerializedSchema
	renderParams: ThumbnailRenderParams
}) {
	const width = clampThumbnailDimension(renderParams.width)
	const height = clampThumbnailDimension(renderParams.height)
	const theme = renderParams.theme === 'dark' ? 'dark' : 'light'

	useThumbnailPageSize(width, height)

	const snapshot = useMemo(
		() => ({
			schema,
			store: Object.fromEntries(records.map((record) => [record.id, record])),
		}),
		[schema, records]
	)

	// Once the export is ready it's shown as a full-viewport <img>, so the worker's Browser Rendering
	// screenshot captures the exact editor.toImage output rather than the live editor canvas. An
	// object URL, not a data URL: blobToDataUrl base64-encodes the whole PNG on the main thread,
	// which on a heavy board is megabytes of string work standing between the export and the ready
	// marker. Never revoked — the page exists for exactly one render.
	const [imageUrl, setImageUrl] = useState<string | null>(null)
	const handleImage = useCallback(async (blob: Blob) => {
		setImageUrl(URL.createObjectURL(blob))
	}, [])

	if (imageUrl) return <ThumbnailImage src={imageUrl} width={width} height={height} />

	return (
		<div
			style={{
				width,
				height,
				overflow: 'hidden',
				background: theme === 'dark' ? '#1d1d1d' : 'white',
			}}
		>
			<Tldraw
				hideUi
				assetUrls={assetUrls}
				shapeUtils={embedShapeUtils}
				components={{ ErrorFallback: ThumbnailRenderCrash }}
				snapshot={snapshot}
				onMount={(editor) => {
					pageTimings.mountAt = performance.now()
					editor.user.updateUserPreferences({ colorScheme: theme })
					// Render the specific page the token asked for; without one, keep the page the
					// snapshot opens to (used by OG images).
					if (renderParams.pageId && editor.getPage(renderParams.pageId as TLPageId)) {
						editor.setCurrentPage(renderParams.pageId as TLPageId)
					}
					editor.updateInstanceState({ isReadonly: true })
					// `content` is what every surface asks for today; an explicit viewport is still honoured
					// (see ThumbnailRenderParams) so the worker can start sending one without waiting on a
					// separate client deploy to teach this page how to handle it. A shape set overrides
					// both, framing just those shapes.
					if (renderParams.shapeIds?.length) {
						fitShapesCamera(editor, renderParams.shapeIds, width, height)
					} else if (renderParams.camera === 'content') {
						fitContentCamera(editor, width, height)
					} else {
						editor.setCamera(
							{ x: renderParams.x, y: renderParams.y, z: renderParams.z },
							{ immediate: true }
						)
					}
				}}
			>
				<ThumbnailExportSignal
					theme={theme}
					width={width}
					height={height}
					camera={renderParams.camera}
					shapeIds={renderParams.shapeIds}
					onImage={handleImage}
				/>
			</Tldraw>
		</div>
	)
}

// Displays the exported PNG at the exact output size and signals readiness once it has painted, so
// the worker's screenshot (which waits on data-thumbnail-ready) captures the export pixel-for-pixel.
// The editor DOM is gone by now — React swaps it out in the same commit that renders this — so the
// page is quiescent when the screenshot is taken. Also used by the dev fixture page
// (dev-browser-run-thumbnail.tsx), so its ready/error markers stay identical to production's.
export function ThumbnailImage({
	src,
	width,
	height,
}: {
	src: string
	width: number
	height: number
}) {
	return (
		<img
			ref={signalThumbnailReadyIfComplete}
			src={src}
			alt=""
			style={{ display: 'block', width, height }}
			onLoad={signalThumbnailReady}
			onError={() => setThumbnailError('thumbnail image failed to load')}
		/>
	)
}

// Refuses to mark success once the page has failed. `setThumbnailError` is terminal, but the
// worker's capture selector is `body[data-thumbnail-ready="true"]` and says nothing about an error,
// so a path that marks an error and then goes on to mark ready hands back a screenshot of whatever
// is on screen — and it gets cached as the real thing.
export function signalThumbnailReady() {
	if (document.body.dataset.thumbnailError !== undefined) return
	document.body.dataset.thumbnailReady = 'true'
	document.documentElement.dataset.thumbnailReady = 'true'
}

// Marks the terminal failure state on both <html> and <body>: the worker's screenshot wait resolves
// on either marker, and success marks both, so failure does too.
export function setThumbnailError(message: string) {
	// Before the marker, like the timings beacon before the ready one: the marker ends the session.
	sendErrorBeacon(message)
	document.body.dataset.thumbnailError = message
	document.documentElement.dataset.thumbnailError = message
}

// A data-URL <img> can finish decoding before React attaches the onLoad handler, in which case
// onLoad never fires. The ref runs after React has set `src`, so if the image is already complete we
// signal readiness directly; otherwise onLoad handles it once decoding finishes.
function signalThumbnailReadyIfComplete(img: HTMLImageElement | null) {
	if (img?.complete && img.naturalWidth > 0) signalThumbnailReady()
}

// Stands in for the SDK's crash screen inside <Tldraw>. Without it a throw during the editor's own
// render — a snapshot at a schema this bundle cannot migrate, across a client deploy — shows the
// SDK's fallback with neither marker set, and the capture burns the whole Browser Run timeout
// instead of failing in milliseconds.
function ThumbnailRenderCrash({ error }: { error: unknown }) {
	useEffect(() => {
		setThumbnailError(error instanceof Error ? error.message : String(error))
	}, [error])
	return null
}

function ThumbnailRenderError({ message }: { message: string }) {
	useEffect(() => {
		setThumbnailError(message)
		return () => {
			delete document.body.dataset.thumbnailError
			delete document.documentElement.dataset.thumbnailError
		}
	}, [message])

	return <div style={{ padding: 16, fontFamily: 'sans-serif' }}>{message}</div>
}

// Sizes the document to exactly the requested thumbnail dimensions so Browser Run's viewport
// capture sees only the canvas.
export function useThumbnailPageSize(width: number, height: number) {
	useEffect(() => {
		const previousBodyStyle = {
			margin: document.body.style.margin,
			overflow: document.body.style.overflow,
			width: document.body.style.width,
			height: document.body.style.height,
		}
		const previousHtmlStyle = {
			width: document.documentElement.style.width,
			height: document.documentElement.style.height,
		}

		document.body.style.margin = '0'
		document.body.style.overflow = 'hidden'
		document.body.style.width = `${width}px`
		document.body.style.height = `${height}px`
		document.documentElement.style.width = `${width}px`
		document.documentElement.style.height = `${height}px`

		return () => {
			document.body.style.margin = previousBodyStyle.margin
			document.body.style.overflow = previousBodyStyle.overflow
			document.body.style.width = previousBodyStyle.width
			document.body.style.height = previousBodyStyle.height
			document.documentElement.style.width = previousHtmlStyle.width
			document.documentElement.style.height = previousHtmlStyle.height
		}
	}, [height, width])
}

export function clampThumbnailDimension(value: number) {
	if (!Number.isFinite(value)) return DEFAULT_THUMBNAIL_WIDTH
	return Math.max(MIN_THUMBNAIL_DIMENSION, Math.min(MAX_THUMBNAIL_DIMENSION, Math.floor(value)))
}

function fitBoundsCamera(
	editor: Editor,
	bounds: Box | null | undefined,
	width: number,
	height: number
) {
	if (bounds) {
		editor.zoomToBounds(bounds, {
			immediate: true,
			force: true,
			inset: getThumbnailContentInset(width, height),
		})
	} else {
		editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true })
	}
}

// Fits the current page's content into the viewport with representative margins. Run both on mount
// and again right before export (see ThumbnailExportSignal), because autosized text re-measures once
// web fonts load and shifts the page bounds — a fit computed before fonts settle would clip content.
function fitContentCamera(editor: Editor, width: number, height: number) {
	fitBoundsCamera(editor, editor.getCurrentPageBounds(), width, height)
}

// What a capture refuses: a job whose shapes are no longer on the page it named. The snapshot
// endpoint proves every requested id still exists *somewhere* on the board, which is all it can see,
// so a live shared-file snapshot that moved them to another page since the mint gets here.
export const SHAPES_NOT_ON_PAGE = 'requested shapes are not on the requested page'

// Like fitContentCamera, but framed on a subset of the page. Uses the same inset so a shapes
// screenshot and a page screenshot of the same board have matching margins. Run again before export
// for the same reason content fits are: autosized text re-measures once web fonts load.
function fitShapesCamera(editor: Editor, shapeIds: string[], width: number, height: number) {
	const ids = getRequestedShapeIds(editor, shapeIds)
	const bounds = ids.length ? getRequestedBounds(editor, ids) : null
	fitBoundsCamera(editor, bounds, width, height)
}

// The pre-export fit. An explicit viewport capture is deliberately left
// alone: its camera is the one the token asked for, set on mount.
function fitExportCamera(
	editor: Editor,
	shapeIds: string[] | undefined,
	camera: 'content' | undefined,
	width: number,
	height: number
) {
	if (shapeIds?.length) {
		fitShapesCamera(editor, shapeIds, width, height)
	} else if (camera === 'content') {
		fitContentCamera(editor, width, height)
	}
}

// Produces a thumbnail of the editor's current page with editor.toImage once the scene has settled
// — fonts loaded, image assets warm, and the editor's <img> elements stable — and hands the PNG blob
// to `onImage`.
//
// `settleTimeoutMs` bounds ONLY the pre-export settle wait, and is deliberately a small fraction of
// the worker's screenshot timeout (THUMBNAIL_RENDER_TIMEOUT_MS): the export itself
// (editor.toImage + normalize + paint) is the expensive part on heavy boards, so it must keep the
// bulk of that window. We intentionally do not put a tighter client-side deadline around the export
// — the worker's waitForSelector wait is the real deadline, and a shorter client cap would abort
// exports that would otherwise finish in time. A broken asset only burns the settle budget, then the
// export runs anyway. Export failures surface as data-thumbnail-error; the worker's screenshot wait
// never sees the ready selector and times out.
export function ThumbnailExportSignal({
	theme,
	width,
	height,
	camera,
	shapeIds,
	settleTimeoutMs = THUMBNAIL_SETTLE_TIMEOUT_MS,
	onImage,
}: {
	theme: 'light' | 'dark'
	width: number
	height: number
	camera?: 'content'
	shapeIds?: string[]
	settleTimeoutMs?: number
	onImage(blob: Blob): void | Promise<void>
}) {
	const editor = useEditor()

	useEffect(() => {
		let cancelled = false
		const settleDeadline = Date.now() + settleTimeoutMs

		;(async () => {
			await Promise.race([
				(async () => {
					await waitForFonts(editor)
					// Fit before warming, not after: autosized text has re-measured by now so the
					// bounds are final, and the export culls at this camera. Warming a set derived
					// from the mount fit would skip the shapes this refit brings into view, and the
					// capture would draw them unloaded.
					fitExportCamera(editor, shapeIds, camera, width, height)
					await preloadImageAssets(editor, settleDeadline, shapeIds)
					await waitForEditorImages(editor, settleDeadline)
				})(),
				sleep(settleTimeoutMs),
			])
			if (cancelled) return
			pageTimings.settledAt = performance.now()
			// Runs again because the race may have timed out before the fit above: without this the
			// export would fall back to onMount's pre-font camera and clip re-measured text.
			fitExportCamera(editor, shapeIds, camera, width, height)
			const blob = await exportThumbnailImage(editor, theme, width, height, shapeIds)
			if (cancelled) return
			// Before onImage: the ready marker (and the session's teardown) follows the image paint.
			sendTimingsBeacon(performance.now())
			await onImage(blob)
		})().catch((error) => {
			if (cancelled) return
			// Some browser APIs reject with an Event (e.g. FileReader's ProgressEvent) rather than an
			// Error; don't let that stringify to "[object ProgressEvent]" in the error marker.
			if (error instanceof Event) {
				setThumbnailError('Could not read thumbnail blob')
			} else {
				setThumbnailError(error instanceof Error ? error.message : String(error))
			}
		})

		return () => {
			cancelled = true
		}
	}, [editor, theme, width, height, camera, shapeIds, settleTimeoutMs, onImage])

	return null
}

// Exports the exact viewport rectangle through editor.toImage: bounds are the viewport in page
// space, scale is the camera zoom (so bounds.width * z lands back on the requested pixel width),
// and pixelRatio 1 keeps the bitmap at CSS-pixel size. Shapes culled at the current viewport
// cannot appear in that rectangle, so they are excluded to keep the export cheap on large boards.
export async function exportThumbnailImage(
	editor: Editor,
	theme: 'light' | 'dark',
	width: number,
	height: number,
	requestedShapeIds?: string[]
): Promise<Blob> {
	const camera = editor.getCamera()
	const bounds = editor.getViewportPageBounds().clone()
	const culled = editor.getCulledShapes()
	// A shapes screenshot draws only what was asked for, so a neighbouring shape that happens to fall
	// inside the fitted viewport never leaks into the frame. Culling still applies to the page export
	// (it keeps big boards cheap), but not here: every requested shape is in view by construction.
	const shapeIds = requestedShapeIds?.length
		? getRequestedShapeIds(editor, requestedShapeIds)
		: [...editor.getCurrentPageShapeIds()].filter((id) => !culled.has(id))

	// A shapes request with nothing left on the page is a stale job, not an empty board, so it fails
	// rather than falling through to the blank below — which would be returned, and cached, as a
	// picture of the shapes that were asked for. The throw becomes the error marker via the caller's
	// catch.
	if (requestedShapeIds?.length && shapeIds.length === 0) {
		throw new Error(SHAPES_NOT_ON_PAGE)
	}

	// An empty page, by contrast, is a truthful picture of an empty board.
	if (shapeIds.length === 0) {
		return makeBlankThumbnail(width, height, editor.getCurrentTheme().colors[theme].background)
	}

	return renderThumbnailPng(editor, shapeIds, { theme, width, height, bounds, scale: camera.z })
}

// toImage cannot export an empty shape list, so pages with no (visible) shapes fall back to a
// plain background-colored PNG matching what the export would have shown.
function makeBlankThumbnail(width: number, height: number, background: string): Promise<Blob> {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const context = canvas.getContext('2d')
	if (context) {
		context.fillStyle = background
		context.fillRect(0, 0, width, height)
	}
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Could not create blank thumbnail'))),
			'image/png'
		)
	})
}

// `document.fonts.ready` is not a barrier on its own: the editor's FontManager adds a FontFace to
// document.fonts only once its load resolves, so fonts still in flight are invisible to it. And
// TldrawEditor's pre-render font gate covers only the page the snapshot opens to, while onMount
// switches to the page the token asked for — that page's fonts can still be loading here. Waiting
// on the editor's own loader (what toImage awaits internally) keeps autosized text from
// re-measuring mid-export, after the camera fit: the capture would clip, and the shapes the wider
// bounds reveal would be drawn unwarmed.
async function waitForFonts(editor: Editor) {
	try {
		if ('fonts' in document) await document.fonts.ready
		await editor.fonts.loadRequiredFontsForCurrentPage(editor.options.maxFontsToLoadBeforeRender)
	} catch {
		// capture with fallback fonts rather than never becoming ready
	}
}

// Warm the images the capture will draw, so the browser has the bytes before the shapes request
// them. Only those: the store holds every asset on every page of the board, and the settle budget
// is fixed, so a board with thousands of images elsewhere spent it fetching pictures the export
// never shows and then timed out — production timeouts track the board's asset count, not the
// page's. The drawn set is the export's own (see exportThumbnailImage): the requested shapes and
// their descendants, or the page's shapes that survive culling at the camera the export will use —
// so this must run after the pre-export fit, not before it.
// Failures resolve rather than reject: a broken asset should not block the capture.
async function preloadImageAssets(editor: Editor, deadline: number, requestedShapeIds?: string[]) {
	const culled = editor.getCulledShapes()
	const roots = requestedShapeIds?.length
		? getRequestedShapeIds(editor, requestedShapeIds)
		: [...editor.getCurrentPageShapeIds()].filter((id) => !culled.has(id))
	const urls = new Set<string>()
	for (const id of editor.getShapeAndDescendantIds(roots)) {
		const shape = editor.getShape(id)
		if (!shape) continue
		// A bookmark with no assetId still shows the preview of the asset its url hashes to, which is
		// how its shape util resolves one (getResolvedBookmarkAssetId in the SDK, not exported).
		const named = (shape.props as { assetId?: TLAssetId | null }).assetId
		const assetId =
			named ??
			(editor.isShapeOfType<TLBookmarkShape>(shape, 'bookmark') && shape.props.url
				? AssetRecordType.createId(getHashForString(shape.props.url))
				: null)
		const asset = assetId ? editor.getAsset(assetId) : undefined
		if (!asset) continue
		if (asset.type === 'image' && asset.props.src) urls.add(asset.props.src)
		if (asset.type === 'bookmark' && asset.props.image) urls.add(asset.props.image)
	}
	await Promise.all([...urls].map((url) => preloadImage(url, deadline)))
}

function preloadImage(url: string, deadline: number) {
	return new Promise<void>((resolve) => {
		const image = Image()
		const timer = setTimeout(() => resolve(), Math.max(0, deadline - Date.now()))
		const done = () => {
			clearTimeout(timer)
			resolve()
		}
		image.onload = done
		image.onerror = done
		image.src = url
	})
}

// Image shapes resolve their display URL asynchronously, so the <img> elements can appear after
// mount. Wait until the set of images inside the editor is fully loaded and stable across a few
// consecutive checks.
async function waitForEditorImages(editor: Editor, deadline: number) {
	// Every <img> the canvas creates is backed by an asset record, so a board with none has nothing
	// to wait for — and the stability poll below would otherwise idle for several hundred ms.
	if (editor.getAssets().length === 0) return
	let stableChecks = 0
	// Seeded from a real count, so the first check can already count toward stability.
	let lastCount = editor.getContainer().querySelectorAll('img').length
	while (Date.now() < deadline) {
		const images = Array.from(editor.getContainer().querySelectorAll('img'))
		if (images.every((img) => img.complete) && images.length === lastCount) {
			stableChecks++
		} else {
			stableChecks = 0
		}
		lastCount = images.length
		// Settled: don't pay one more poll interval just to notice.
		if (stableChecks >= 3) return
		await sleep(100)
	}
}
