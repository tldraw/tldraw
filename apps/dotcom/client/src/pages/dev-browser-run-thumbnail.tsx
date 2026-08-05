import { DEFAULT_THUMBNAIL_HEIGHT, DEFAULT_THUMBNAIL_WIDTH } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { FileHelpers, TLEditorSnapshot, TLStoreSnapshot, Tldraw, defaultShapeUtils } from 'tldraw'
import 'tldraw/tldraw.css'
import snapshotExampleSnapshot from '../../../../examples/src/examples/editor-api/snapshots/snapshot.json'
import layerPanelSnapshot from '../../../../examples/src/examples/ui/layer-panel/snapshot.json'
import {
	ThumbnailExportSignal,
	ThumbnailImage,
	clampThumbnailDimension,
	useThumbnailPageSize,
} from './thumbnail-render'

const fixtures = {
	'snapshot-example': {
		snapshot: snapshotExampleSnapshot as unknown as TLEditorSnapshot,
		camera: { x: 310, y: 120, z: 0.55 },
	},
	'layer-panel': {
		snapshot: layerPanelSnapshot as unknown as TLStoreSnapshot,
		camera: { x: 340, y: 120, z: 0.82 },
	},
} as const

type FixtureName = keyof typeof fixtures

// Dev-only fixture variant of the production thumbnail render page. It renders allowlisted
// example snapshots from plain query params so render behavior can be iterated on locally
// without a sync worker, published file, or signed render token. There is no worker to upload
// to here, so the editor.toImage output is shown as a full-viewport <img> (making a screenshot
// of this page pixel-identical to the export) and exposed as a data URL for the capture script.
export function Component() {
	const params = new URLSearchParams(location.search)
	const fixtureName = getFixtureName(params.get('fixture'))
	const fixture = fixtures[fixtureName]
	const width = getDimensionParam(params, 'width', DEFAULT_THUMBNAIL_WIDTH)
	const height = getDimensionParam(params, 'height', DEFAULT_THUMBNAIL_HEIGHT)
	const theme = params.get('theme') === 'dark' ? 'dark' : 'light'

	useThumbnailPageSize(width, height)

	const [dataUrl, setDataUrl] = useState<string | null>(null)
	const handleImage = useCallback(async (blob: Blob) => {
		setDataUrl(await FileHelpers.blobToDataUrl(blob))
	}, [])

	if (dataUrl) {
		return <ThumbnailPreview dataUrl={dataUrl} width={width} height={height} />
	}

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
				<ThumbnailExportSignal theme={theme} width={width} height={height} onImage={handleImage} />
			</Tldraw>
		</div>
	)
}

// The production ThumbnailImage signals data-thumbnail-ready/-error exactly as the render page
// does; this wrapper additionally exposes the data URL for the capture script's local mode, which
// reads the exact export bytes instead of screenshotting the viewport.
function ThumbnailPreview({
	dataUrl,
	width,
	height,
}: {
	dataUrl: string
	width: number
	height: number
}) {
	useEffect(() => {
		;(window as any).__tldrawThumbnailDataUrl = dataUrl
		return () => {
			delete (window as any).__tldrawThumbnailDataUrl
		}
	}, [dataUrl])

	return <ThumbnailImage dataUrl={dataUrl} width={width} height={height} />
}

function getFixtureName(value: string | null): FixtureName {
	return value && value in fixtures ? (value as FixtureName) : 'snapshot-example'
}

function getCamera(params: URLSearchParams, fallback: { x: number; y: number; z: number }) {
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
	return clampThumbnailDimension(number)
}
