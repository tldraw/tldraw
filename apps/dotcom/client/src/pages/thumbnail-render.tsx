/* oxlint-disable react/only-export-components -- its own HTML entry, captured headlessly rather than hot-edited */
import {
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_DIMENSION,
	MIN_THUMBNAIL_DIMENSION,
	THUMBNAIL_RENDER_GLOBAL,
	THUMBNAIL_RENDER_PUSH_PARAM,
	THUMBNAIL_SETTLE_TIMEOUT_MS,
	ThumbnailRenderParams,
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
	sleep,
	useEditor,
	TLAssetId,
	TLAssetStore,
	TLBookmarkShape,
	TLImageShape,
	getUncroppedSize,
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
import { resolveUserContentImageUrl } from '../utils/resolveUserContentImageUrl'

// The thumbnail render page: a real editor, loaded with one board's records, that exports itself
// and displays the export for Browser Run to screenshot. Served as its own Vite entry
// (thumbnail-render.html + thumbnail-render-main.tsx) rather than as an SPA route, so a capture
// boots the SDK and nothing else — no router, no Clerk, no service worker. The client's own build
// leaves it out: the render worker builds this entry and serves it at /__thumbnail-render
// (render-worker/page.vite.config.ts), and in dev this dev server does
// (vite-thumbnail-screenshot-plugin.ts).

export type ThumbnailRenderData =
	| {
			ok: true
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
// and the OG queue retries it like any other.
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

/**
 * The render job the worker pushes into the page: the records to draw and how to draw them. A page
 * nobody announced a push to (someone opening the URL by hand) fails straight away instead of waiting
 * for records that are not coming.
 */
export async function acquireThumbnailRenderData(url: URL): Promise<ThumbnailRenderData> {
	const pushed =
		window[THUMBNAIL_RENDER_GLOBAL] ??
		(url.searchParams.get(THUMBNAIL_RENDER_PUSH_PARAM) === '1' ? await awaitPushedSnapshot() : null)
	if (!pushed) return { ok: false, message: 'No render job was pushed' }
	return {
		ok: true,
		records: pushed.records,
		schema: pushed.schema,
		renderParams: pushed.renderParams,
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
				assets={renderAssetStore}
				shapeUtils={embedShapeUtils}
				components={{ ErrorFallback: ThumbnailRenderCrash }}
				snapshot={snapshot}
				onMount={(editor) => {
					editor.user.updateUserPreferences({ colorScheme: theme })
					// Render the specific page the job asked for; without one, keep the page the
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

// What the export refuses: a job whose shapes are no longer on the page it named. The
// snapshot endpoint proves every requested id still exists *somewhere* on the board, which is all it
// can see, so a live shared-file snapshot that moved them to another page since the mint gets here.
export const SHAPES_NOT_ON_PAGE = 'requested shapes are not on the requested page'

// Like fitContentCamera, but framed on a subset of the page. Uses the same inset so a shapes
// screenshot and a page screenshot of the same board have matching margins. Run again before export
// for the same reason content fits are: autosized text re-measures once web fonts load.
function fitShapesCamera(editor: Editor, shapeIds: string[], width: number, height: number) {
	const ids = getRequestedShapeIds(editor, shapeIds)
	const bounds = ids.length ? getRequestedBounds(editor, ids) : null
	fitBoundsCamera(editor, bounds, width, height)
}

// The pre-export fit for either capture kind. An explicit viewport capture is deliberately left
// alone: its camera is the one the job asked for, set on mount.
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
			// Runs again because the race may have timed out before the fit above: without this the
			// export would fall back to onMount's pre-font camera and clip re-measured text.
			fitExportCamera(editor, shapeIds, camera, width, height)
			const blob = await exportThumbnailImage(editor, theme, width, height, shapeIds)
			if (cancelled) return
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
// switches to the page the job asked for — that page's fonts can still be loading here. Waiting
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

// Without it the SDK's default store resolves every image to its original upload, so a thumbnail of a
// board full of photos downloaded and decoded each one at full size — enough to exhaust the tab on
// image-heavy boards (Browser Run then fails with "Cannot read properties of null (reading
// 'screenshot')", TLDRAW-SYNC-3VJ) or to run out the capture's time.
//
// Asked for at a pixel ratio of 2 whatever the context says. The resized width is the asset's width
// times a power-of-two zoom step (floored at 1/32) times the pixel ratio, so at 1 the floor asks for
// 1/32 widths that the app on a 2x screen never does (its floor lands at 1/16). At 2 the render page
// asks for the variants the app has already asked for, so the edge cache can answer and no transform
// exists only for thumbnails.
//
// Animated images resize to their first frame too: the export draws only that frame anyway, but
// from the whole original file, so a few GIFs could outweigh every other image on the board.
//
// Every request for an asset is lifted to the largest scale any drawn shape of it needs. The SDK
// caches an image's export per asset, from whichever shape resolves it first, so two shapes drawing
// one asset at different sizes would otherwise both get the first one's variant, and the larger
// would draw blurry from the smaller.
export const renderAssetStore: TLAssetStore = {
	upload: async () => {
		throw new Error('The thumbnail render page is read-only')
	},
	resolve: (asset, context) => {
		const largest = largestScreenScaleByAsset.get(asset.id) ?? 0
		return resolveUserContentImageUrl(
			asset,
			{
				...context,
				screenScale: Math.max(context.screenScale, largest),
				steppedScreenScale: Math.max(context.steppedScreenScale, stepScreenScale(largest)),
				dpr: 2,
			},
			{ stillAnimations: true }
		)
	},
}

// Filled by preloadImageAssets, which runs before the export and knows every shape it will draw.
const largestScreenScaleByAsset = new Map<TLAssetId, number>()

// The SDK's power-of-two zoom step (see Editor.resolveAssetUrl); stepping keeps the max of two scales.
function stepScreenScale(screenScale: number) {
	return screenScale > 0 ? 2 ** Math.ceil(Math.log2(screenScale)) : 0
}

// Warm the images the capture will draw, so the browser has the bytes before the shapes request
// them. Only those: the store holds every asset on every page of the board, and the settle budget
// is fixed, so a board with thousands of images elsewhere spent it fetching pictures the export
// never shows and then timed out — production timeouts track the board's asset count, not the
// page's. The drawn set is the export's own (see exportThumbnailImage): the requested shapes and
// their descendants, or the page's shapes that survive culling at the camera the export will use —
// so this must run after the pre-export fit, not before it.
// Failures resolve rather than reject: a broken asset should not block the capture.
export async function preloadImageAssets(
	editor: Editor,
	deadline: number,
	requestedShapeIds?: string[]
) {
	const culled = editor.getCulledShapes()
	const roots = requestedShapeIds?.length
		? getRequestedShapeIds(editor, requestedShapeIds)
		: [...editor.getCurrentPageShapeIds()].filter((id) => !culled.has(id))
	const urls = new Set<string>()
	// The export's zoom: fitExportCamera has run, and the export uses the camera's zoom as its scale.
	const scale = editor.getCamera().z
	largestScreenScaleByAsset.clear()
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
		if (asset.type === 'image' && asset.props.src) {
			// The scale the export will ask for (see resolveAssetUrl in the SDK's getSvgJsx, and the
			// uncropped width ImageShapeUtil.toSvg passes it).
			const width = editor.isShapeOfType<TLImageShape>(shape, 'image')
				? getUncroppedSize(shape.props, shape.props.crop).w
				: ((shape.props as { w?: number }).w ?? asset.props.w)
			const screenScale = scale * (width / asset.props.w)
			largestScreenScaleByAsset.set(
				asset.id,
				Math.max(largestScreenScaleByAsset.get(asset.id) ?? 0, screenScale)
			)
		}
		if (asset.type === 'bookmark' && asset.props.image) urls.add(asset.props.image)
	}
	// Warm the URL the export will ask for: warming the original instead would fetch exactly the
	// full-size bytes the asset store exists to avoid.
	const resolved = await Promise.all(
		[...largestScreenScaleByAsset].map(([assetId, screenScale]) =>
			editor.resolveAssetUrl(assetId, { screenScale, dpr: 1 }).catch(() => null)
		)
	)
	for (const url of resolved) if (url) urls.add(url)
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
