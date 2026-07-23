import {
	DEFAULT_THUMBNAIL_WIDTH,
	MAX_THUMBNAIL_DIMENSION,
	MIN_THUMBNAIL_DIMENSION,
	THUMBNAIL_SETTLE_TIMEOUT_MS,
	ThumbnailRenderParams,
	ThumbnailSnapshotResponseBody,
	getLicenseKey,
} from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Editor,
	FileHelpers,
	Image,
	SerializedSchema,
	TLPageId,
	TLRecord,
	Tldraw,
	fetch,
	sleep,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { assetUrls } from '../utils/assetUrls'
import { defineLoader } from '../utils/defineLoader'
import { embedShapeUtils } from '../utils/embedShapeUtil'

const THUMBNAIL_SNAPSHOT_ENDPOINT = '/api/app/thumbnail-render/snapshot'

type LoaderData =
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

const { loader, useData } = defineLoader(async (args): Promise<LoaderData> => {
	const token = new URL(args.request.url).searchParams.get('token')
	if (!token) {
		return { ok: false, message: 'Missing render token' }
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

	return {
		ok: true,
		token,
		records: data.records,
		schema: data.schema,
		renderParams: data.renderParams,
	}
})

export { loader }

export function Component() {
	const data = useData()
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
	// screenshot captures the exact editor.toImage output rather than the live editor canvas.
	const [dataUrl, setDataUrl] = useState<string | null>(null)
	const handleImage = useCallback(async (blob: Blob) => {
		setDataUrl(await FileHelpers.blobToDataUrl(blob))
	}, [])

	if (dataUrl) return <ThumbnailImage dataUrl={dataUrl} width={width} height={height} />

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
					editor.user.updateUserPreferences({ colorScheme: theme })
					editor.updateInstanceState({ isReadonly: true })
					// Render the specific page the token asked for; without one, keep the page the
					// snapshot opens to (used by OG images).
					if (renderParams.pageId && editor.getPage(renderParams.pageId as TLPageId)) {
						editor.setCurrentPage(renderParams.pageId as TLPageId)
					}
					if (renderParams.camera === 'content') {
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
	dataUrl,
	width,
	height,
}: {
	dataUrl: string
	width: number
	height: number
}) {
	return (
		<img
			ref={signalThumbnailReadyIfComplete}
			src={dataUrl}
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
	settleTimeoutMs = THUMBNAIL_SETTLE_TIMEOUT_MS,
	onImage,
}: {
	theme: 'light' | 'dark'
	width: number
	height: number
	camera?: 'content'
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
					await waitForFonts()
					await preloadImageAssets(editor, settleDeadline)
					await waitForEditorImages(editor, settleDeadline)
				})(),
				sleep(settleTimeoutMs),
			])
			if (cancelled) return
			// Re-fit content now that fonts and assets have settled: autosized text re-measures after
			// the web font loads, so the fit computed in onMount (before fonts) is stale and would clip.
			if (camera === 'content') fitContentCamera(editor, width, height)
			const blob = await exportThumbnailImage(editor, theme, width, height)
			if (cancelled) return
			await onImage(blob)
		})().catch((error) => {
			if (cancelled) return
			setThumbnailError(error instanceof Error ? error.message : String(error))
		})

		return () => {
			cancelled = true
		}
	}, [editor, theme, width, height, camera, settleTimeoutMs, onImage])

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
	height: number
): Promise<Blob> {
	const camera = editor.getCamera()
	const bounds = editor.getViewportPageBounds().clone()
	const culled = editor.getCulledShapes()
	const shapeIds = [...editor.getCurrentPageShapeIds()].filter((id) => !culled.has(id))

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
	let stableChecks = 0
	let lastCount = -1
	while (Date.now() < deadline && stableChecks < 3) {
		const images = Array.from(editor.getContainer().querySelectorAll('img'))
		if (images.every((img) => img.complete) && images.length === lastCount) {
			stableChecks++
		} else {
			stableChecks = 0
		}
		lastCount = images.length
		await sleep(100)
	}
}
