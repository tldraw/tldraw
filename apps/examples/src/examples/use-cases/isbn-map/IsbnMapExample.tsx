import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	AssetRecordType,
	Box,
	Editor,
	TLAssetId,
	TLImageShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	Tldraw,
	TldrawUiButton,
	createShapeId,
	react,
	toRichText,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { PUBLISHERS, PublisherEntry } from './publishers'
import { bookshelfConfig, prettyPrefix } from './projection'
import { DATASETS, DatasetId, TILE_MANIFEST, tileUrl } from './tile-manifest'
import './isbn-map.css'

// [1]
const PROJECTION = bookshelfConfig({ width: 20000 })
const ZOOM_LEVEL = 3
const TILE_PREFIX = 'isbn-map-tile' as const
const LABEL_PREFIX = 'isbn-map-label' as const

// [2]
function tileShapeId(prefix: string): TLShapeId {
	return createShapeId(`${TILE_PREFIX}-${prefix}`)
}
function tileAssetId(dataset: DatasetId, zoom: number, prefix: string): TLAssetId {
	return AssetRecordType.createId(`${dataset}-z${zoom}-${prefix}`)
}
function labelShapeId(index: number): TLShapeId {
	return createShapeId(`${LABEL_PREFIX}-${index}`)
}

function getMapBounds(): Box {
	const tiles = TILE_MANIFEST.publishers[ZOOM_LEVEL]
	const rects = tiles.map((p) => PROJECTION.prefixToCoords(p))
	const minX = Math.min(...rects.map((r) => r.x))
	const minY = Math.min(...rects.map((r) => r.y))
	const maxX = Math.max(...rects.map((r) => r.x + r.width))
	const maxY = Math.max(...rects.map((r) => r.y + r.height))
	return new Box(minX, minY, maxX - minX, maxY - minY)
}

// [3]
function loadDataset(editor: Editor, dataset: DatasetId) {
	const tiles = TILE_MANIFEST[dataset][ZOOM_LEVEL]

	editor.run(
		() => {
			editor.createAssets(
				tiles.map((prefix) => {
					const rect = PROJECTION.prefixToCoords(prefix)
					return {
						id: tileAssetId(dataset, ZOOM_LEVEL, prefix),
						typeName: 'asset' as const,
						type: 'image' as const,
						meta: {},
						props: {
							w: rect.width,
							h: rect.height,
							mimeType: 'image/png',
							src: tileUrl(dataset, ZOOM_LEVEL, prefix),
							name: `${dataset}-${prefix}`,
							isAnimated: false,
						},
					}
				})
			)

			const partials: TLShapePartial<TLImageShape>[] = tiles.map((prefix) => {
				const rect = PROJECTION.prefixToCoords(prefix)
				return {
					id: tileShapeId(prefix),
					type: 'image',
					x: rect.x,
					y: rect.y,
					isLocked: true,
					props: {
						assetId: tileAssetId(dataset, ZOOM_LEVEL, prefix),
						w: rect.width,
						h: rect.height,
					},
				}
			})

			const existingIds = new Set(editor.getCurrentPageShapeIds())
			const toCreate = partials.filter((p) => !existingIds.has(p.id))
			const toUpdate = partials.filter((p) => existingIds.has(p.id))

			if (toCreate.length) editor.createShapes(toCreate)
			if (toUpdate.length) editor.updateShapes(toUpdate)
		},
		{ history: 'ignore' }
	)
}

// [4]
function setLabelsVisible(editor: Editor, visible: boolean) {
	const ids = PUBLISHERS.map((_, i) => labelShapeId(i))
	const existing = new Set(editor.getCurrentPageShapeIds())

	editor.run(
		() => {
			if (!visible) {
				const toDelete = ids.filter((id) => existing.has(id))
				if (toDelete.length) editor.deleteShapes(toDelete)
				return
			}

			const partials = PUBLISHERS.map(buildLabelShape).filter(
				(p) => !existing.has(p.id)
			)
			if (partials.length) editor.createShapes(partials)
		},
		{ history: 'ignore' }
	)
}

function buildLabelShape(entry: PublisherEntry, index: number): TLShapePartial<TLTextShape> {
	const rect = PROJECTION.prefixToCoords(entry.relativePrefix)
	// Scale the label so it's a reasonable fraction of its publisher rect --
	// big publishers (long ranges, like Penguin's 978-0-14) get big labels;
	// tiny publishers get small ones. The text autoSizes around this scale.
	const scale = Math.max(0.5, Math.min(rect.width, rect.height) / 60)
	return {
		id: labelShapeId(index),
		type: 'text',
		x: rect.x + rect.width / 2,
		y: rect.y + rect.height / 2,
		isLocked: true,
		opacity: 0.9,
		props: {
			color: 'white',
			size: 's',
			font: 'sans',
			textAlign: 'middle',
			autoSize: true,
			scale,
			richText: toRichText(`${entry.name}\n${prettyPrefix(entry.relativePrefix)}`),
		},
	}
}

function fitMap(editor: Editor) {
	const bounds = getMapBounds()
	editor.zoomToBounds(bounds, { animation: { duration: 250 }, inset: 64 })
}

function TopPanel({
	dataset,
	onChangeDataset,
	showLabels,
	onToggleLabels,
}: {
	dataset: DatasetId
	onChangeDataset(id: DatasetId): void
	showLabels: boolean
	onToggleLabels(): void
}) {
	const editor = useEditor()
	const description = useMemo(
		() => DATASETS.find((d) => d.id === dataset)?.description ?? '',
		[dataset]
	)
	return (
		<div className="tlui-menu isbn-map-top-panel">
			<div className="isbn-map-top-panel__row">
				{DATASETS.map((d) => (
					<TldrawUiButton
						key={d.id}
						type={d.id === dataset ? 'primary' : 'normal'}
						onClick={() => onChangeDataset(d.id)}
					>
						{d.name}
					</TldrawUiButton>
				))}
				<div className="isbn-map-top-panel__divider" />
				<TldrawUiButton type="normal" onClick={onToggleLabels}>
					{showLabels ? 'Hide labels' : 'Show labels'}
				</TldrawUiButton>
				<TldrawUiButton type="normal" onClick={() => fitMap(editor)}>
					Fit map
				</TldrawUiButton>
			</div>
			<div className="isbn-map-top-panel__description">{description}</div>
		</div>
	)
}

// [5]
function HoverReadout() {
	const editor = useEditor()
	const isbn = useValue(
		'hovered-isbn',
		() => {
			const point = editor.inputs.getCurrentPagePoint()
			for (const prefix of TILE_MANIFEST.publishers[ZOOM_LEVEL]) {
				const r = PROJECTION.prefixToCoords(prefix)
				if (
					point.x >= r.x &&
					point.x <= r.x + r.width &&
					point.y >= r.y &&
					point.y <= r.y + r.height
				) {
					return prettyPrefix(prefix) + '-…'
				}
			}
			return null
		},
		[editor]
	)
	if (!isbn) return null
	return <div className="isbn-map-readout">{isbn}</div>
}

export default function IsbnMapExample() {
	const [dataset, setDataset] = useState<DatasetId>('publishers')
	const [showLabels, setShowLabels] = useState(false)
	const editorRef = useRef<Editor | null>(null)

	const onMount = useCallback((editor: Editor) => {
		editorRef.current = editor

		// [6]
		editor.setCameraOptions({
			constraints: {
				bounds: getMapBounds(),
				padding: { x: 64, y: 64 },
				origin: { x: 0.5, y: 0.5 },
				initialZoom: 'fit-max',
				baseZoom: 'default',
				behavior: 'contain',
			},
			zoomSteps: [0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8],
		})
		// Reset the camera so the new constraints' initialZoom (fit-max) is
		// applied immediately, the same trick the PDF editor uses.
		editor.setCamera(editor.getCamera(), { reset: true })

		// [7]
		editor.sideEffects.registerBeforeChangeHandler('shape', (_prev, next) => {
			if (!isOurShape(next.id)) return next
			if (next.isLocked) return next
			return { ...next, isLocked: true }
		})

		loadDataset(editor, 'publishers')

		// [8]
		return react('keep tiles below user shapes', () => {
			const allIds = editor.getSortedChildIdsForParent(editor.getCurrentPageId())
			const tileIds = allIds.filter((id) => id.startsWith(`shape:${TILE_PREFIX}`))
			if (tileIds.length === 0) return
			const firstNonTileIndex = allIds.findIndex(
				(id) => !id.startsWith(`shape:${TILE_PREFIX}`)
			)
			if (firstNonTileIndex === -1 || firstNonTileIndex >= tileIds.length) return
			editor.sendToBack(tileIds)
		})
	}, [])

	useEffect(() => {
		const editor = editorRef.current
		if (!editor) return
		loadDataset(editor, dataset)
	}, [dataset])

	useEffect(() => {
		const editor = editorRef.current
		if (!editor) return
		setLabelsVisible(editor, showLabels)
	}, [showLabels])

	const components = useMemo(
		() => ({
			TopPanel: () => (
				<TopPanel
					dataset={dataset}
					onChangeDataset={setDataset}
					showLabels={showLabels}
					onToggleLabels={() => setShowLabels((v) => !v)}
				/>
			),
			OnTheCanvas: () => <HoverReadout />,
		}),
		[dataset, showLabels]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={onMount} components={components} />
		</div>
	)
}

function isOurShape(id: TLShapeId): boolean {
	return id.startsWith(`shape:${TILE_PREFIX}`) || id.startsWith(`shape:${LABEL_PREFIX}`)
}

/*
[1] We use the same "bookshelf" projection as the upstream isbn-visualization
project, with width=20000 (matching the canvas size used to generate the
zoom-3 tiles). Each tile PNG is a snapshot of one prefix-aligned slice of
that 2D map; we just need to compute (x, y, w, h) for each.

[2] Stable, deterministic shape and asset IDs let us re-run loadDataset to
swap the active dataset's textures without churn. createShapeId(seed) and
AssetRecordType.createId(seed) both return typed IDs derived from the seed.

[3] The PDF editor pattern: create one image asset and one image shape per
tile, locked so the user can't accidentally move them. Switching datasets
just updates the existing shapes' assetId props in place.

[4] A hand-curated set of well-known publisher labels rendered as ordinary
tldraw text shapes -- so users can edit, delete, or restyle them like any
other shape.

[5] A small live readout that shows which ISBN prefix the cursor is over.
useValue subscribes to the editor's reactive store so it updates on every
input movement.

[6] Constrain the camera to the bounded map (similar to the PDF example),
with a wide range of zoomSteps so users can pull all the way back or zoom
in to inspect individual tiles.

[7] Belt-and-braces: even if the user manages to unlock a tile via the UI,
re-lock it on the next change so they can't drag it away.

[8] On mount, ensure tile shapes are at the bottom of the z-stack so any
annotations the user adds (arrows, sticky notes, sketches) sit on top.
*/
