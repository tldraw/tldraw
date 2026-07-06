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

const THUMBNAIL_WIDTH = 1200
const THUMBNAIL_HEIGHT = 630

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
		document.body.style.width = `${THUMBNAIL_WIDTH}px`
		document.body.style.height = `${THUMBNAIL_HEIGHT}px`
		document.documentElement.style.width = `${THUMBNAIL_WIDTH}px`
		document.documentElement.style.height = `${THUMBNAIL_HEIGHT}px`

		return () => {
			document.body.style.margin = previousBodyStyle.margin
			document.body.style.overflow = previousBodyStyle.overflow
			document.body.style.width = previousBodyStyle.width
			document.body.style.height = previousBodyStyle.height
			document.documentElement.style.width = previousHtmlStyle.width
			document.documentElement.style.height = previousHtmlStyle.height
		}
	}, [])

	return (
		<div
			style={{
				width: THUMBNAIL_WIDTH,
				height: THUMBNAIL_HEIGHT,
				overflow: 'hidden',
				background: 'white',
			}}
		>
			<Tldraw
				hideUi
				snapshot={fixture.snapshot}
				shapeUtils={defaultShapeUtils}
				onMount={(editor) => {
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
