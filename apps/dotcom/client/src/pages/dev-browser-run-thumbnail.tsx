import { useEffect } from 'react'
import {
	Editor,
	TLEditorSnapshot,
	TLStoreSnapshot,
	Tldraw,
	defaultShapeUtils,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import snapshotExampleSnapshot from '../../../../examples/src/examples/editor-api/snapshots/snapshot.json'
import layerPanelSnapshot from '../../../../examples/src/examples/ui/layer-panel/snapshot.json'

const DEFAULT_THUMBNAIL_WIDTH = 1200
const DEFAULT_THUMBNAIL_HEIGHT = 630
const MIN_THUMBNAIL_DIMENSION = 200
const MAX_THUMBNAIL_DIMENSION = 1600

const fixtures = {
	'snapshot-example': {
		snapshot: snapshotExampleSnapshot as TLEditorSnapshot,
		camera: { x: 310, y: 120, z: 0.55 },
	},
	'layer-panel': {
		snapshot: layerPanelSnapshot as TLStoreSnapshot,
		camera: { x: 340, y: 120, z: 0.82 },
	},
} as const

type FixtureName = keyof typeof fixtures

export function Component() {
	const params = new URLSearchParams(location.search)
	const fixtureName = getFixtureName(params.get('fixture'))
	const fixture = fixtures[fixtureName]
	const width = getDimensionParam(params, 'width', DEFAULT_THUMBNAIL_WIDTH)
	const height = getDimensionParam(params, 'height', DEFAULT_THUMBNAIL_HEIGHT)
	const theme = params.get('theme') === 'dark' ? 'dark' : 'light'

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
				snapshot={fixture.snapshot}
				shapeUtils={defaultShapeUtils}
				onMount={(editor) => {
					editor.user.updateUserPreferences({ colorScheme: theme })
					editor.updateInstanceState({ isReadonly: true })
					editor.setCamera(getCamera(params, fixture.camera), { immediate: true })
				}}
			>
				<ThumbnailReadySignal />
			</Tldraw>
		</div>
	)
}

function ThumbnailReadySignal() {
	const editor = useEditor()

	useEffect(() => {
		const signalReady = () => {
			;(window as any).__tldrawThumbnailReady = true
			document.body.dataset.thumbnailReady = 'true'
			document.documentElement.dataset.thumbnailReady = 'true'
		}

		// Fonts and image assets can finish after the editor mounts. Wait two frames after fonts settle
		// so Browser Run's selector wait sees a stable canvas instead of the first paint.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if ('fonts' in document) {
					document.fonts.ready.then(signalReady, signalReady)
				} else {
					signalReady()
				}
			})
		})
	}, [])

	;(window as any).editor = editor
	return null
}

function getFixtureName(value: string | null): FixtureName {
	return value && value in fixtures ? (value as FixtureName) : 'snapshot-example'
}

function getCamera(
	params: URLSearchParams,
	fallback: ReturnType<Editor['getCamera']>
): ReturnType<Editor['getCamera']> {
	const x = getNumberParam(params, 'x')
	const y = getNumberParam(params, 'y')
	const z = getNumberParam(params, 'z')
	return {
		x: x ?? fallback.x,
		y: y ?? fallback.y,
		z: z ?? fallback.z,
	}
}

function getNumberParam(params: URLSearchParams, key: string) {
	const value = params.get(key)
	if (value === null) return null
	const number = Number(value)
	return Number.isFinite(number) ? number : null
}

function getDimensionParam(params: URLSearchParams, key: string, fallback: number) {
	const number = getNumberParam(params, key)
	if (number === null) return fallback
	return Math.max(MIN_THUMBNAIL_DIMENSION, Math.min(MAX_THUMBNAIL_DIMENSION, Math.floor(number)))
}
