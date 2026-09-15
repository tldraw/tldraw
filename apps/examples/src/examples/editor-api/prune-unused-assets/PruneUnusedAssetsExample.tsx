import { useRef } from 'react'
import {
	AssetRecordType,
	Editor,
	TLComponents,
	TLImageShape,
	Tldraw,
	TldrawUiButton,
	createShapeId,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './prune-unused-assets.css'

// There's a guide at the bottom of this file!

const IMAGE_SIZE = 180
const GRID_GAP = 24
const GRID_COLS = 4
const GRID_MARGIN = 40

// [1]
function makeImageDataUrl(size = 320) {
	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size
	const ctx = canvas.getContext('2d')!
	const hue = Math.floor(Math.random() * 360)
	ctx.fillStyle = `hsl(${hue}, 70%, 60%)`
	ctx.fillRect(0, 0, size, size)
	// Random noise keeps the PNG from compressing away, so the document size
	// visibly grows with every image — the whole point of the demo.
	const image = ctx.getImageData(0, 0, size, size)
	for (let i = 0; i < image.data.length; i += 4) {
		const n = Math.floor(Math.random() * 60)
		image.data[i] = Math.min(255, image.data[i] + n)
		image.data[i + 1] = Math.min(255, image.data[i + 1] + n)
		image.data[i + 2] = Math.min(255, image.data[i + 2] + n)
	}
	ctx.putImageData(image, 0, 0)
	return { src: canvas.toDataURL('image/png'), w: size, h: size }
}

// [2]
function addImage(editor: Editor, slot: number) {
	const { src, w, h } = makeImageDataUrl()
	const assetId = AssetRecordType.createId()
	editor.createAssets([
		{
			id: assetId,
			type: 'image',
			typeName: 'asset',
			props: { w, h, name: 'noise.png', isAnimated: false, mimeType: 'image/png', src },
			meta: {},
		},
	])
	// `slot` is a monotonic counter, so images never share a grid cell even
	// after some have been deleted.
	const col = slot % GRID_COLS
	const row = Math.floor(slot / GRID_COLS)
	editor.createShape<TLImageShape>({
		id: createShapeId(),
		type: 'image',
		x: GRID_MARGIN + col * (IMAGE_SIZE + GRID_GAP),
		y: GRID_MARGIN + row * (IMAGE_SIZE + GRID_GAP),
		props: { w: IMAGE_SIZE, h: IMAGE_SIZE, assetId },
	})
	editor.zoomToFit({ animation: { duration: 200 } })
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// [3]
function ControlPanel() {
	const editor = useEditor()
	// A monotonic grid slot so added images never share a cell, even after some
	// are deleted. Seeded from the current shape count so a restored document
	// starts past its existing shapes.
	const nextSlot = useRef(editor.getCurrentPageShapeIds().size)

	const stats = useValue(
		'asset stats',
		() => ({
			shapes: editor.getCurrentPageShapeIds().size,
			assets: editor.getAssets().length,
			unused: editor.getUnusedAssetIds().length,
			bytes: JSON.stringify(editor.getSnapshot().document).length,
		}),
		[editor]
	)

	return (
		<div className="prune-panel" onPointerDown={(e) => e.stopPropagation()}>
			<div className="prune-panel__stats">
				<span>Visible shapes</span>
				<b>{stats.shapes}</b>
				<span>Asset records</span>
				<b>{stats.assets}</b>
				<span>Unused (orphaned)</span>
				<b className={stats.unused ? 'prune-panel__warn' : undefined}>{stats.unused}</b>
				<span>Document size</span>
				<b>{formatBytes(stats.bytes)}</b>
			</div>

			<div className="prune-panel__actions">
				<TldrawUiButton type="normal" onClick={() => addImage(editor, nextSlot.current++)}>
					Add image
				</TldrawUiButton>
				<TldrawUiButton
					type="normal"
					onClick={() => editor.deleteShapes(editor.getSelectedShapeIds())}
				>
					Delete selected shapes
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={() => editor.pruneUnusedAssets()}>
					Prune unused assets
				</TldrawUiButton>
			</div>

			<p className="prune-panel__note">
				Only image, video, and bookmark shapes create asset records. Add a few images, delete their
				shapes, and watch the document size stay high while the orphan count climbs. Pruning
				reclaims that space.
			</p>
		</div>
	)
}

// [4]
const components: TLComponents = {
	TopPanel: ControlPanel,
	StylePanel: null,
}

export default function PruneUnusedAssetsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="prune-unused-assets-example"
				components={components}
				onMount={(editor) => {
					// [5]
					editor.pruneUnusedAssets()
				}}
			/>
		</div>
	)
}

/*
[1]
Generates a noisy PNG as a base64 data URL. With the default asset store these
data URLs are stored inline in the document, so every image meaningfully
increases the document's serialized size.

[2]
Creates an image asset plus an image shape that references it, laid out in a
grid so new images never overlap. Deleting the shape later does NOT delete this
asset record — that is the leak this example demonstrates.

[3]
The side panel, rendered through a UI slot (see [4]) so it sits in the clickable
UI layer. editor.getUnusedAssetIds() reports asset records that no shape
references; editor.pruneUnusedAssets() deletes them (and, with an external asset
store, calls its remove() to delete the underlying file), returning the removed
ids. The readout uses useValue so it recomputes reactively as the store changes.

[4]
We render the panel through the TopPanel UI slot (empty by default) and hide the
default StylePanel so it doesn't overlap our panel on the right.

[5]
The safest place to prune is at a persistence boundary. On load there is no undo
history, so pruning can't strip an asset that a future undo would need. Pruning
before you persist a snapshot keeps saved documents from carrying orphaned
assets.
*/
