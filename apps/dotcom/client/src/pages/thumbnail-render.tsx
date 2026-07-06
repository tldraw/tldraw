import {
	ThumbnailRenderParams,
	ThumbnailSnapshotResponseBody,
	getLicenseKey,
} from '@tldraw/dotcom-shared'
import { useEffect, useMemo } from 'react'
import { Editor, Image, SerializedSchema, TLRecord, Tldraw, fetch, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { assetUrls } from '../utils/assetUrls'
import { defineLoader } from '../utils/defineLoader'
import { embedShapeUtils } from '../utils/embedShapeUtil'

export const DEFAULT_THUMBNAIL_WIDTH = 1200
export const DEFAULT_THUMBNAIL_HEIGHT = 630
export const MIN_THUMBNAIL_DIMENSION = 200
export const MAX_THUMBNAIL_DIMENSION = 1600

const THUMBNAIL_SNAPSHOT_ENDPOINT = '/api/app/thumbnail-snapshot'
const THUMBNAIL_READY_TIMEOUT_MS = 15_000

type LoaderData =
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
					editor.setCamera(
						{ x: renderParams.x, y: renderParams.y, z: renderParams.z },
						{ immediate: true }
					)
				}}
			>
				<ThumbnailReadySignal />
			</Tldraw>
		</div>
	)
}

function ThumbnailRenderError({ message }: { message: string }) {
	useEffect(() => {
		document.body.dataset.thumbnailError = message
		return () => {
			delete document.body.dataset.thumbnailError
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

// Signals capture readiness by setting data-thumbnail-ready once fonts have settled, image assets
// have loaded, and the editor's <img> elements are stable. Browser Run waits on this selector. A
// deadline caps the wait so one broken asset degrades the capture instead of failing it outright.
export function ThumbnailReadySignal({
	timeoutMs = THUMBNAIL_READY_TIMEOUT_MS,
}: {
	timeoutMs?: number
}) {
	const editor = useEditor()

	useEffect(() => {
		let cancelled = false

		const signalReady = () => {
			if (cancelled) return
			;(window as any).__tldrawThumbnailReady = true
			document.body.dataset.thumbnailReady = 'true'
			document.documentElement.dataset.thumbnailReady = 'true'
		}

		const deadline = Date.now() + timeoutMs

		Promise.race([
			(async () => {
				await waitForFonts()
				await preloadImageAssets(editor, deadline)
				await waitForEditorImages(editor, deadline)
			})(),
			sleep(timeoutMs),
		]).then(() => {
			// two frames so the canvas paints the settled state before the selector resolves
			requestAnimationFrame(() => {
				requestAnimationFrame(signalReady)
			})
		})

		return () => {
			cancelled = true
		}
	}, [editor, timeoutMs])

	useEffect(() => {
		;(window as any).editor = editor
	}, [editor])

	return null
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

function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
