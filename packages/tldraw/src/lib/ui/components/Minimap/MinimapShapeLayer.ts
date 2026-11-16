import {
	Box,
	Editor,
	RESET_VALUE,
	TLShape,
	TLShapeId,
	computed,
	isUninitialized,
	objectMapValues,
	unsafe__withoutCapture,
} from '@tldraw/editor'

// In device pixels. Smaller tiles repaint less area per change but mean more regions to
// repaint when a change is spread out.
const TILE_SIZE = 16

// The shapes, on any page, whose util hides them from the minimap. `hideInMinimap` is asked when a
// shape's record is added or changed and never tracked, so the per-shape cost stays out of both
// the reactive graph and the minimap's repaints.
function createHiddenShapeIds(editor: Editor) {
	const shapeHistory = editor.store.query.filterHistory('shape')
	const isHidden = (shape: TLShape) => !!editor.getShapeUtil(shape).hideInMinimap?.(shape)

	return computed<ReadonlySet<TLShapeId>>('minimap hidden shapes', (prev, lastComputedEpoch) => {
		const diffs = shapeHistory.getDiffSince(lastComputedEpoch)

		return unsafe__withoutCapture(() => {
			if (isUninitialized(prev) || diffs === RESET_VALUE) {
				const hidden = new Set<TLShapeId>()
				for (const record of editor.store.allRecords()) {
					if (record.typeName === 'shape' && isHidden(record)) hidden.add(record.id)
				}
				return hidden
			}

			// Copied only if a shape's answer changes, which keeps the value (and so the paths)
			// stable while hidden shapes are merely moved or restyled.
			let next: Set<TLShapeId> | undefined
			const setHidden = (id: TLShapeId, hidden: boolean) => {
				if ((next ?? prev).has(id) === hidden) return
				next ??= new Set(prev)
				if (hidden) next.add(id)
				else next.delete(id)
			}
			for (const diff of diffs) {
				for (const shape of objectMapValues(diff.added)) setHidden(shape.id, isHidden(shape))
				for (const [, shape] of objectMapValues(diff.updated)) {
					setHidden(shape.id, isHidden(shape))
				}
				for (const shape of objectMapValues(diff.removed)) setHidden(shape.id, false)
			}
			return next ?? prev
		})
	})
}

/** Where the layer's pixels sit in page space. Sizes are in device pixels. */
export interface MinimapShapeLayerView {
	width: number
	height: number
	/** The page point at the layer's top left corner. */
	minX: number
	minY: number
	/** Device pixels per page unit. */
	scale: number
}

export interface MinimapShapeLayerFills {
	shape: string
	selected: string
}

/**
 * The minimap's shapes, kept as a bitmap so that a render is one `drawImage` no matter how many
 * shapes there are. Filling a rect per shape instead costs milliseconds per render on a large
 * page, and the minimap renders on every camera move.
 *
 * When shapes or the selection change, only the tiles they touch are repainted, using the
 * spatial index to find the other shapes in those tiles. The whole layer is repainted when
 * its view or fills change.
 */
export class MinimapShapeLayer {
	private readonly canvas: HTMLCanvasElement
	private readonly ctx: CanvasRenderingContext2D
	private readonly hiddenShapeIds: ReturnType<typeof createHiddenShapeIds>
	private readonly stopListening: () => void

	private view: MinimapShapeLayerView = { width: 0, height: 0, minX: 0, minY: 0, scale: 1 }
	private fills: MinimapShapeLayerFills = { shape: '', selected: '' }

	private selectedIds: readonly TLShapeId[] = []
	private selected: ReadonlySet<TLShapeId> = new Set()
	private hidden: ReadonlySet<TLShapeId> = new Set()

	private needsFullRepaint = true
	private cols = 0
	private dirtyTiles = new Uint8Array(0)
	private dirtyCount = 0

	constructor(
		private readonly editor: Editor,
		document: Document
	) {
		this.canvas = document.createElement('canvas')
		const ctx = this.canvas.getContext('2d')
		if (!ctx) throw new Error('Minimap: could not get 2D canvas context')
		this.ctx = ctx

		this.hiddenShapeIds = createHiddenShapeIds(editor)
		// Shapes that hide in the minimap are reported too. Their tiles are repainted without
		// them, which costs a little and changes nothing.
		this.stopListening = editor.addCurrentPageShapeMaskedBoundsListener({
			onChange: (_id, prev, next) => {
				this.markDirty(prev)
				this.markDirty(next)
			},
			onRebuild: () => {
				this.needsFullRepaint = true
			},
		})
	}

	dispose() {
		this.stopListening()
	}

	/**
	 * Bring the layer up to date and draw it to `target`, which must have the identity transform
	 * and the same pixel size as the view. Reactive: reads the shapes and selection.
	 */
	draw(
		target: CanvasRenderingContext2D,
		view: MinimapShapeLayerView,
		fills: MinimapShapeLayerFills
	) {
		// Reading the rects applies any pending changes, which marks their tiles dirty. That has
		// to happen against the view the layer was last painted with, so before the view is updated.
		const rects = this.editor.getCurrentPageShapeMaskedBounds()
		this.updateHidden(rects)
		this.updateSelection(rects)
		this.updateView(view, fills)

		// drawImage throws on an empty canvas, which is what we have until the first layout.
		if (view.width === 0 || view.height === 0 || !Number.isFinite(view.scale)) return

		if (this.needsFullRepaint) {
			this.repaintAll(rects)
		} else if (this.dirtyCount > 0) {
			this.repaintDirtyTiles(rects)
		}

		target.drawImage(this.canvas, 0, 0)
	}

	private updateView(view: MinimapShapeLayerView, fills: MinimapShapeLayerFills) {
		const prev = this.view
		if (
			prev.width === view.width &&
			prev.height === view.height &&
			prev.minX === view.minX &&
			prev.minY === view.minY &&
			prev.scale === view.scale &&
			this.fills.shape === fills.shape &&
			this.fills.selected === fills.selected
		) {
			return
		}

		if (prev.width !== view.width || prev.height !== view.height) {
			this.canvas.width = view.width
			this.canvas.height = view.height
			this.cols = Math.ceil(view.width / TILE_SIZE)
			this.dirtyTiles = new Uint8Array(this.cols * Math.ceil(view.height / TILE_SIZE))
		}

		this.view = { ...view }
		this.fills = { ...fills }
		this.needsFullRepaint = true
	}

	private updateSelection(rects: ReadonlyMap<TLShapeId, Box>) {
		const selectedIds = this.editor.getSelectedShapeIds()
		if (selectedIds === this.selectedIds) return

		const prev = this.selected
		const next = new Set(selectedIds)
		for (const id of prev) if (!next.has(id)) this.markDirty(rects.get(id))
		for (const id of next) if (!prev.has(id)) this.markDirty(rects.get(id))

		this.selectedIds = selectedIds
		this.selected = next
	}

	private updateHidden(rects: ReadonlyMap<TLShapeId, Box>) {
		const next = this.hiddenShapeIds.get()
		const prev = this.hidden
		if (next === prev) return

		// A shape whose answer changed along with its bounds was already marked by the listener.
		// This covers one whose answer changed alone.
		for (const id of prev) if (!next.has(id)) this.markDirty(rects.get(id))
		for (const id of next) if (!prev.has(id)) this.markDirty(rects.get(id))
		this.hidden = next
	}

	private markDirty(rect: Box | undefined) {
		if (!rect || this.needsFullRepaint) return
		const { view, cols, dirtyTiles } = this

		// A pixel of padding covers antialiasing and rounding at the rect's edges.
		const x0 = Math.max(0, Math.floor((rect.minX - view.minX) * view.scale) - 1)
		const y0 = Math.max(0, Math.floor((rect.minY - view.minY) * view.scale) - 1)
		const x1 = Math.min(view.width, Math.ceil((rect.maxX - view.minX) * view.scale) + 1)
		const y1 = Math.min(view.height, Math.ceil((rect.maxY - view.minY) * view.scale) + 1)
		// Also false for NaN bounds.
		if (!(x1 > x0 && y1 > y0)) return

		const col1 = Math.ceil(x1 / TILE_SIZE)
		const row1 = Math.ceil(y1 / TILE_SIZE)
		for (let row = Math.floor(y0 / TILE_SIZE); row < row1; row++) {
			for (let col = Math.floor(x0 / TILE_SIZE); col < col1; col++) {
				const i = row * cols + col
				if (!dirtyTiles[i]) {
					dirtyTiles[i] = 1
					this.dirtyCount++
				}
			}
		}
	}

	private repaintAll(rects: ReadonlyMap<TLShapeId, Box>) {
		const { ctx, view, selected, hidden } = this
		ctx.resetTransform()
		ctx.clearRect(0, 0, view.width, view.height)

		const shapesPath = new Path2D()
		const selectedPath = new Path2D()
		for (const [id, rect] of rects) {
			if (hidden.size > 0 && hidden.has(id)) continue
			const path = selected.has(id) ? selectedPath : shapesPath
			path.rect(rect.x, rect.y, rect.w, rect.h)
		}
		this.fillPaths(shapesPath, selectedPath)

		this.needsFullRepaint = false
		this.dirtyTiles.fill(0)
		this.dirtyCount = 0
	}

	private repaintDirtyTiles(rects: ReadonlyMap<TLShapeId, Box>) {
		const { ctx, view, cols, dirtyTiles, selected, hidden, editor } = this

		// Past this point, finding the shapes tile by tile costs more than painting them all.
		if (this.dirtyCount * 2 > dirtyTiles.length) {
			this.repaintAll(rects)
			return
		}

		// The clip keeps the repaint inside the dirty tiles. Its edges are on pixel boundaries,
		// so shapes that cross them come out the same as in the tiles next door.
		const clip = new Path2D()
		const ids = new Set<TLShapeId>()
		const queryBox = new Box()

		for (let i = 0; i < dirtyTiles.length; i++) {
			if (!dirtyTiles[i]) continue
			// Extend to the end of this run of dirty tiles in the row.
			const start = i
			const rowEnd = i - (i % cols) + cols
			while (i + 1 < rowEnd && dirtyTiles[i + 1]) i++

			const x = (start % cols) * TILE_SIZE
			const y = Math.floor(start / cols) * TILE_SIZE
			const w = (i - start + 1) * TILE_SIZE
			clip.rect(x, y, w, TILE_SIZE)

			// The index holds unmasked bounds, so this can return shapes whose (masked) rect
			// is outside the tiles. They are clipped away.
			queryBox.x = view.minX + x / view.scale
			queryBox.y = view.minY + y / view.scale
			queryBox.w = w / view.scale
			queryBox.h = TILE_SIZE / view.scale
			for (const id of editor.getShapeIdsInsideBounds(queryBox)) ids.add(id)
		}

		const shapesPath = new Path2D()
		const selectedPath = new Path2D()
		for (const id of ids) {
			const rect = rects.get(id)
			if (!rect || hidden.has(id)) continue
			const path = selected.has(id) ? selectedPath : shapesPath
			path.rect(rect.x, rect.y, rect.w, rect.h)
		}

		ctx.save()
		ctx.resetTransform()
		ctx.clip(clip)
		ctx.clearRect(0, 0, view.width, view.height)
		this.fillPaths(shapesPath, selectedPath)
		ctx.restore()

		dirtyTiles.fill(0)
		this.dirtyCount = 0
	}

	private fillPaths(shapesPath: Path2D, selectedPath: Path2D) {
		const { ctx, view, fills } = this
		ctx.setTransform(view.scale, 0, 0, view.scale, -view.minX * view.scale, -view.minY * view.scale)
		ctx.fillStyle = fills.shape
		ctx.fill(shapesPath)
		ctx.fillStyle = fills.selected
		ctx.fill(selectedPath)
	}
}
