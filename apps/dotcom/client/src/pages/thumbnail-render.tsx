import {
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_DIMENSION,
	MIN_THUMBNAIL_DIMENSION,
	THUMBNAIL_RENDER_CONFIG_GLOBAL,
	THUMBNAIL_RENDER_GLOBAL,
	THUMBNAIL_RENDER_PUSH_PARAM,
	ThumbnailRenderConfig,
	THUMBNAIL_SETTLE_TIMEOUT_MS,
	ThumbnailRenderParams,
	ThumbnailShapeMeasurement,
	ThumbnailRenderTimingsRequestBody,
	ThumbnailSnapshotResponseBody,
	getLicenseKey,
} from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Box,
	Editor,
	Image,
	SerializedSchema,
	TLPageId,
	TLRecord,
	TLShapeId,
	Tldraw,
	compact,
	fetch,
	sleep,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { assetUrls } from '../utils/assetUrls'
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
	source?: 'push' | 'fetch'
	bootAt?: number
	dataAt?: number
	mountAt?: number
	settledAt?: number
} = {}

// Fire-and-forget: nothing waits on this, and `keepalive` lets the request outlive the page —
// which it must, because the screenshot (and the session's teardown) follows the ready marker
// almost immediately.
function sendTimingsBeacon(token: string, exportedAt: number) {
	const { source, bootAt, dataAt, mountAt, settledAt } = pageTimings
	if (
		!token ||
		!source ||
		bootAt === undefined ||
		dataAt === undefined ||
		mountAt === undefined ||
		settledAt === undefined
	) {
		return
	}
	const body: ThumbnailRenderTimingsRequestBody = {
		token,
		timings: { source, bootAt, dataAt, mountAt, settledAt, exportedAt },
	}
	// Two delivery paths, matched to where the page runs. A url-mode page is same-origin and the
	// plain fetch is proven; forcing it into no-cors mode turned out to stop delivery entirely.
	// An html-mode page has no origin, so a JSON fetch would need a CORS preflight the worker does
	// not answer — sendBeacon is the one channel built for this: no preflight, queued by the
	// browser, and it survives the teardown that follows the ready marker.
	const payload = JSON.stringify(body)
	if (window[THUMBNAIL_RENDER_CONFIG_GLOBAL]) {
		try {
			navigator.sendBeacon(apiUrl(THUMBNAIL_RESULT_ENDPOINT), payload)
		} catch {
			// diagnostic-only; a page that cannot report still renders
		}
	} else {
		fetch(apiUrl(THUMBNAIL_RESULT_ENDPOINT), {
			method: 'POST',
			keepalive: true,
			headers: { 'Content-Type': 'application/json' },
			body: payload,
		}).catch(() => {})
	}
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

// How long to wait for a pushed snapshot before giving up and fetching one.
//
// The worker injects the payload with the Quick Action's `addScriptTag`, which runs *after*
// navigation — so at the moment the page first checks, the global may not be there yet. Reading
// it once would therefore miss every push and quietly fall back to the fetch, which looks exactly
// like push working and is why this waits rather than checks. The budget only has to cover the gap
// between DOMContentLoaded and the injected tag executing; a genuine pull is not delayed by it,
// because only a URL carrying THUMBNAIL_RENDER_PUSH_PARAM waits at all.
const PUSHED_SNAPSHOT_TIMEOUT_MS = 2_000
const PUSHED_SNAPSHOT_POLL_MS = 25

declare global {
	interface Window {
		[THUMBNAIL_RENDER_GLOBAL]?: ThumbnailSnapshotResponseBody
		[THUMBNAIL_RENDER_CONFIG_GLOBAL]?: ThumbnailRenderConfig
	}
}

// An html-mode page has no origin, so relative requests cannot resolve; the spliced config carries
// the API origin instead. A url-mode page has no config and keeps using relative paths.
function apiUrl(path: string) {
	const origin = window[THUMBNAIL_RENDER_CONFIG_GLOBAL]?.apiOrigin
	return origin ? new URL(path, origin).toString() : path
}

function awaitPushedSnapshot(timeoutMs: number): Promise<ThumbnailSnapshotResponseBody | null> {
	if (window[THUMBNAIL_RENDER_GLOBAL]) return Promise.resolve(window[THUMBNAIL_RENDER_GLOBAL]!)
	return new Promise((resolve) => {
		const startedAt = Date.now()
		const interval = setInterval(() => {
			const pushed = window[THUMBNAIL_RENDER_GLOBAL]
			if (pushed) {
				clearInterval(interval)
				resolve(pushed)
			} else if (Date.now() - startedAt >= timeoutMs) {
				clearInterval(interval)
				resolve(null)
			}
		}, PUSHED_SNAPSHOT_POLL_MS)
	})
}

/**
 * Resolves the records this render should draw, preferring a snapshot the worker pushed into the
 * page over fetching one back out of it. The single acquisition path for every way the page is
 * served, so the push-wait and the token fallback cannot drift.
 */
export async function acquireThumbnailRenderData(url: URL): Promise<ThumbnailRenderData> {
	pageTimings.bootAt = performance.now()
	const config = window[THUMBNAIL_RENDER_CONFIG_GLOBAL]
	const token = config?.token ?? url.searchParams.get('token')

	// A snapshot that is already here needs no waiting and no announcement — this is every html-mode
	// render, where the worker splices the payload into <head> ahead of any script, and the fast path
	// for a url-mode push whose injected tag won the race.
	const already = window[THUMBNAIL_RENDER_GLOBAL]
	if (already) {
		if (already.error) return { ok: false, message: already.message }
		pageTimings.source = 'push'
		pageTimings.dataAt = performance.now()
		return {
			ok: true,
			token: token ?? '',
			records: already.records,
			schema: already.schema,
			renderParams: already.renderParams,
		}
	}

	// Only a render the worker announced a push for waits for one. A pull render must not pay this
	// budget just to discover nobody is pushing — that would be flat added latency on every OG
	// capture, and would make a push/pull comparison meaningless.
	if (url.searchParams.get(THUMBNAIL_RENDER_PUSH_PARAM) === '1') {
		// Authoritative when it arrives: the worker injects a snapshot it just read under the same
		// gate the token would have been checked against, so there is nothing further to verify.
		const pushed = await awaitPushedSnapshot(PUSHED_SNAPSHOT_TIMEOUT_MS)
		if (pushed) {
			if (pushed.error) return { ok: false, message: pushed.message }
			pageTimings.source = 'push'
			pageTimings.dataAt = performance.now()
			return {
				ok: true,
				token: token ?? '',
				records: pushed.records,
				schema: pushed.schema,
				renderParams: pushed.renderParams,
			}
		}
		// Fell through: the injected tag never ran. The token below is what makes that recoverable.
	}

	if (!token) {
		return { ok: false, message: 'Missing render token' }
	}

	const result = await fetch(
		apiUrl(`${THUMBNAIL_SNAPSHOT_ENDPOINT}?token=${encodeURIComponent(token)}`)
	).catch(() => null)
	if (!result?.ok) {
		return { ok: false, message: `Could not load render job (${result?.status ?? 'network'})` }
	}

	const data = (await result.json()) as ThumbnailSnapshotResponseBody
	if (data.error) {
		return { ok: false, message: data.message }
	}

	pageTimings.source = 'fetch'
	pageTimings.dataAt = performance.now()
	return {
		ok: true,
		token,
		records: data.records,
		schema: data.schema,
		// Live capture is only correct against a payload sliced for this render, which only a push
		// delivers: a fetched snapshot is the whole board, and rasterizing the live canvas would put
		// every neighbour inside the fitted viewport into the frame. The worker no longer sends
		// `capture` on snapshot responses; dropping it here also covers a token minted by an older
		// worker mid-deploy.
		renderParams: { ...data.renderParams, capture: undefined },
	}
}

export function ThumbnailRenderView({ data }: { data: ThumbnailRenderData }) {
	if (!data.ok) return <ThumbnailRenderError message={data.message} />
	return (
		<ThumbnailRenderPage
			token={data.token}
			records={data.records}
			schema={data.schema}
			renderParams={data.renderParams}
		/>
	)
}

function ThumbnailRenderPage({
	token,
	records,
	schema,
	renderParams,
}: {
	token: string
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
				licenseKey={getLicenseKey()}
				assetUrls={assetUrls}
				shapeUtils={embedShapeUtils}
				snapshot={snapshot}
				onMount={(editor) => {
					pageTimings.mountAt = performance.now()
					editor.user.updateUserPreferences({ colorScheme: theme })
					editor.updateInstanceState({ isReadonly: true })
					// Render the specific page the token asked for; without one, keep the page the
					// snapshot opens to (used by OG images).
					if (renderParams.pageId && editor.getPage(renderParams.pageId as TLPageId)) {
						editor.setCurrentPage(renderParams.pageId as TLPageId)
					}
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
				{renderParams.mode === 'measure' ? (
					<ThumbnailMeasureSignal token={token} />
				) : (
					<ThumbnailExportSignal
						theme={theme}
						width={width}
						height={height}
						camera={renderParams.camera}
						shapeIds={renderParams.shapeIds}
						capture={renderParams.capture}
						token={token}
						onImage={handleImage}
					/>
				)}
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

function signalThumbnailReady() {
	document.body.dataset.thumbnailReady = 'true'
	document.documentElement.dataset.thumbnailReady = 'true'
}

// Marks the terminal failure state on both <html> and <body>: the worker's screenshot wait resolves
// on either marker, and success marks both, so failure does too.
function setThumbnailError(message: string) {
	document.body.dataset.thumbnailError = message
	document.documentElement.dataset.thumbnailError = message
}

// A data-URL <img> can finish decoding before React attaches the onLoad handler, in which case
// onLoad never fires. The ref runs after React has set `src`, so if the image is already complete we
// signal readiness directly; otherwise onLoad handles it once decoding finishes.
function signalThumbnailReadyIfComplete(img: HTMLImageElement | null) {
	if (img?.complete && img.naturalWidth > 0) signalThumbnailReady()
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

function getRepresentativeContentInset(width: number, height: number) {
	return Math.max(48, Math.min(160, width * 0.12, height * 0.18))
}

// Fits the current page's content into the viewport with representative margins. Run both on mount
// and again right before export (see ThumbnailExportSignal), because autosized text re-measures once
// web fonts load and shifts the page bounds — a fit computed before fonts settle would clip content.
function fitContentCamera(editor: Editor, width: number, height: number) {
	const bounds = editor.getCurrentPageBounds()
	if (bounds) {
		editor.zoomToBounds(bounds, {
			immediate: true,
			force: true,
			inset: getRepresentativeContentInset(width, height),
		})
	} else {
		editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true })
	}
}

// The shapes the token asked for, filtered to those actually present on the current page. The
// snapshot endpoint already rejects a job whose shapes have gone, but the ids are resolved against
// a live snapshot for shared files, so this stays defensive rather than throwing mid-render.
function getRequestedShapeIds(editor: Editor, shapeIds: string[]): TLShapeId[] {
	return shapeIds.filter((id): id is TLShapeId => Boolean(editor.getShape(id as TLShapeId)))
}

// Like fitContentCamera, but framed on a subset of the page. Uses the same inset so a shapes
// screenshot and a page screenshot of the same board have matching margins. Run again before export
// for the same reason content fits are: autosized text re-measures once web fonts load.
function fitShapesCamera(editor: Editor, shapeIds: string[], width: number, height: number) {
	const ids = getRequestedShapeIds(editor, shapeIds)
	const bounds = ids.length
		? Box.Common(compact(ids.map((id) => editor.getShapePageBounds(id))))
		: null
	if (bounds) {
		editor.zoomToBounds(bounds, {
			immediate: true,
			force: true,
			inset: getRepresentativeContentInset(width, height),
		})
	} else {
		editor.setCamera({ x: 0, y: 0, z: 1 }, { immediate: true })
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
	capture,
	token,
	onImage,
}: {
	theme: 'light' | 'dark'
	width: number
	height: number
	camera?: 'content'
	shapeIds?: string[]
	settleTimeoutMs?: number
	/** `live`: signal ready after settle and fit, without exporting — see ThumbnailRenderParams. */
	capture?: 'live'
	/** Authorises the timing beacon. Absent on the dev fixture page, which sends none. */
	token?: string
	onImage(blob: Blob): void | Promise<void>
}) {
	const editor = useEditor()

	useEffect(() => {
		let cancelled = false
		const settleDeadline = Date.now() + settleTimeoutMs

		;(async () => {
			await Promise.race([
				(async () => {
					// Fonts and asset warming are independent, so they overlap; the editor's own <img>
					// elements are watched last because they appear as the warmed assets resolve.
					await Promise.all([waitForFonts(), preloadImageAssets(editor, settleDeadline)])
					await waitForEditorImages(editor, settleDeadline)
				})(),
				sleep(settleTimeoutMs),
			])
			if (cancelled) return
			pageTimings.settledAt = performance.now()
			// Re-fit content now that fonts and assets have settled: autosized text re-measures after
			// the web font loads, so the fit computed in onMount (before fonts) is stale and would clip.
			if (shapeIds?.length) {
				fitShapesCamera(editor, shapeIds, width, height)
			} else if (camera === 'content') {
				fitContentCamera(editor, width, height)
			}
			// Live capture: the settled, fitted canvas is the picture — the screenshotting browser
			// rasterizes it, so the export (and the paint of its result) has nothing left to do.
			// The beacon's exportedAt stamp doubles as ready here; the deltas still read correctly.
			if (capture === 'live') {
				// The re-fit above is a store write the canvas catches up with on a later commit, and
				// shapes culled at the pre-fit camera have no DOM yet. Two animation frames guarantee a
				// commit and a paint at the fitted camera land before the marker; without them the
				// screenshot can race the paint and capture a mis-framed or incomplete canvas.
				await nextAnimationFrame()
				await nextAnimationFrame()
				if (cancelled) return
				if (token) sendTimingsBeacon(token, performance.now())
				signalThumbnailReady()
				return
			}
			const blob = await exportThumbnailImage(editor, theme, width, height, shapeIds)
			if (cancelled) return
			// Before onImage rather than after: the ready marker follows the image paint, and the
			// screenshot (then the session's teardown) follows the marker — keepalive covers the
			// race, but not starting one is better.
			if (token) sendTimingsBeacon(token, performance.now())
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
	}, [editor, theme, width, height, camera, shapeIds, settleTimeoutMs, capture, token, onImage])

	return null
}

// Measure mode. The page exists only to be a real editor: it settles, measures, posts, and marks
// itself ready. The worker's screenshot of it is discarded — driving a Browser Run session is simply
// how the measurement gets to happen, and the ready marker is how the worker knows it is done.
function ThumbnailMeasureSignal({ token }: { token: string }) {
	const editor = useEditor()

	useEffect(() => {
		let cancelled = false
		;(async () => {
			// Fonts first, for the same reason the export waits: autosizing text has no correct size
			// until the real web font has loaded, and its measured bounds are the whole point here.
			await Promise.race([waitForFonts(), sleep(THUMBNAIL_SETTLE_TIMEOUT_MS)])
			if (cancelled) return

			// Text comes from the shape's own util, which is the authoritative answer — a Worker
			// reading the record can only approximate it, and gets nothing at all for shapes whose
			// text is computed rather than stored.
			const bounds: Record<string, ThumbnailShapeMeasurement> = {}
			for (const id of editor.getCurrentPageShapeIds()) {
				const shape = editor.getShape(id)
				const box = editor.getShapePageBounds(id)
				if (!shape || !box) continue
				const text = editor.getShapeUtil(shape).getText(shape)
				bounds[id] = { x: box.x, y: box.y, w: box.w, h: box.h, ...(text ? { text } : null) }
			}
			await fetch(apiUrl(THUMBNAIL_RESULT_ENDPOINT), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, bounds }),
			})
			if (cancelled) return
			signalThumbnailReady()
		})().catch((error) => {
			if (cancelled) return
			setThumbnailError(error instanceof Error ? error.message : String(error))
		})
		return () => {
			cancelled = true
		}
	}, [editor, token])

	return null
}

// Exports the exact viewport rectangle through editor.toImage: bounds are the viewport in page
// space, scale is the camera zoom (so bounds.width * z lands back on the requested pixel width),
// and pixelRatio 1 keeps the bitmap at CSS-pixel size. Shapes culled at the current viewport
// cannot appear in that rectangle, so they are excluded to keep the export cheap on large boards.
async function exportThumbnailImage(
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

	if (shapeIds.length === 0) {
		return makeBlankThumbnail(width, height, editor.getCurrentTheme().colors[theme].background)
	}

	const { blob } = await editor.toImage(shapeIds, {
		format: 'png',
		bounds,
		scale: camera.z,
		padding: 0,
		background: true,
		darkMode: theme === 'dark',
		pixelRatio: 1,
	})
	return normalizeThumbnailSize(blob, width, height)
}

// The export's bitmap sizing floors fractional dimensions, so a fractional camera zoom can come
// back a pixel short of the requested output (e.g. 500 / 0.82 * 0.82 = 499.99…). Redraw onto an
// exactly-sized canvas when that happens; the sub-pixel stretch is invisible.
async function normalizeThumbnailSize(blob: Blob, width: number, height: number): Promise<Blob> {
	const bitmap = await createImageBitmap(blob)
	try {
		if (bitmap.width === width && bitmap.height === height) return blob

		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const context = canvas.getContext('2d')
		if (!context) return blob
		context.drawImage(bitmap, 0, 0, width, height)
		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(result) => (result ? resolve(result) : reject(new Error('Could not resize thumbnail'))),
				'image/png'
			)
		})
	} finally {
		bitmap.close()
	}
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

function nextAnimationFrame() {
	return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

async function waitForFonts() {
	if (!('fonts' in document)) return
	try {
		await document.fonts.ready
	} catch {
		// capture with fallback fonts rather than never becoming ready
	}
}

// Warm every image asset in the snapshot so the browser has the bytes before the shapes request
// them. Failures resolve rather than reject: a broken asset should not block the capture.
async function preloadImageAssets(editor: Editor, deadline: number) {
	const urls = new Set<string>()
	for (const record of editor.store.allRecords()) {
		if (record.typeName !== 'asset') continue
		if (record.type === 'image' && record.props.src) {
			urls.add(record.props.src)
		}
		if (record.type === 'bookmark' && record.props.image) {
			urls.add(record.props.image)
		}
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
	// Boards with no asset records — most cluster screenshots are text and geometry — have nothing
	// for the stability poll to watch, and its consecutive-checks heuristic costs several hundred ms
	// of pure waiting when the answer is knowable up front. Every <img> the canvas creates is backed
	// by an asset record (image and video shapes, bookmark previews), so none of those means none to
	// wait for.
	if (!editor.store.allRecords().some((record) => record.typeName === 'asset')) return
	let stableChecks = 0
	let lastCount = -1
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
