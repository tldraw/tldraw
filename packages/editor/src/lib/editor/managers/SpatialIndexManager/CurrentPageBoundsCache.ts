import {
	Computed,
	RESET_VALUE,
	computed,
	isUninitialized,
	unsafe__withoutCapture,
} from '@tldraw/state'
import { TLPageId, TLShape, TLShapeId, TLTheme, isShape } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
import type { VecLike } from '../../../primitives/Vec'
import type { Editor } from '../../Editor'
import { getShapesWithDirtyBounds } from './getShapesWithDirtyBounds'

/**
 * An incrementally maintained map of page-space bounds for the shapes on the current page.
 *
 * A computed that reads per-shape bounds for the whole page has to revalidate every shape's
 * bounds on every store change, which costs milliseconds per change on large pages. This instead
 * recomputes only the shapes that a change could have affected (see `getShapesWithDirtyBounds`),
 * and rebuilds on page, theme and font changes.
 *
 * `getBounds` may depend on ancestors' clip paths (masked bounds): when a dirty shape's clip path
 * changes without its record changing, as with a container whose geometry fits its children, its
 * descendants are rechecked too.
 *
 * The price is reactivity: `getBounds` runs without capturing, so a shape's entry is only
 * refreshed when that shape is dirty. Bounds that depend on anything other than the shape's
 * record, its ancestors, its bindings, the theme or its fonts go stale until the shape changes.
 * That includes geometry, `getClipPath` or `shouldClipChild` that read an atom or other editor
 * state. The spatial index already has the same limit for geometry.
 *
 * @internal
 */
export class CurrentPageBoundsCache {
	private readonly bounds = new Map<TLShapeId, Box>()
	// Local-space clip paths of the shapes that have one, to spot clip changes that come from
	// derived geometry rather than a record change.
	private readonly clipPaths = new Map<TLShapeId, VecLike[]>()
	private readonly epoch: Computed<number>
	private lastPageId: TLPageId | null = null
	private lastTheme: TLTheme | null = null
	private lastFontLoadEpoch = -1

	constructor(
		private readonly editor: Editor,
		name: string,
		/** Get the page-space bounds for a shape. Return undefined to leave the shape out. */
		private readonly getBounds: (shape: TLShape) => Box | undefined
	) {
		const shapeHistory = editor.store.query.filterHistory('shape')
		const bindingHistory = editor.store.query.filterHistory('binding')

		this.epoch = computed<number>(name, (prevEpoch, lastComputedEpoch) => {
			const shapeDiff = shapeHistory.getDiffSince(lastComputedEpoch)
			const bindingDiff = bindingHistory.getDiffSince(lastComputedEpoch)
			const currentPageId = editor.getCurrentPageId()
			const theme = editor.getCurrentTheme()
			const fontLoadEpoch = editor.fonts.getFontLoadEpoch()

			if (
				isUninitialized(prevEpoch) ||
				shapeDiff === RESET_VALUE ||
				bindingDiff === RESET_VALUE ||
				this.lastPageId !== currentPageId ||
				// Which shapes a theme change or font load resizes isn't known without
				// visiting every shape; both are rare.
				this.lastTheme !== theme ||
				this.lastFontLoadEpoch !== fontLoadEpoch
			) {
				this.lastPageId = currentPageId
				this.lastTheme = theme
				this.lastFontLoadEpoch = fontLoadEpoch
				unsafe__withoutCapture(() => this.rebuild())
				return isUninitialized(prevEpoch) ? 0 : prevEpoch + 1
			}

			if (shapeDiff.length === 0 && bindingDiff.length === 0) return prevEpoch

			const didChange = unsafe__withoutCapture(() => {
				const { dirty, removed } = getShapesWithDirtyBounds(editor, shapeDiff, bindingDiff)
				return this.update(dirty, removed)
			})
			return didChange ? prevEpoch + 1 : prevEpoch
		})
	}

	/**
	 * The bounds by shape id, in no particular order. Reactive: reading it inside a computed or
	 * reaction subscribes to changes. The map is updated in place, so don't hold on to it or
	 * compare it by identity.
	 */
	get(): ReadonlyMap<TLShapeId, Box> {
		this.epoch.get()
		return this.bounds
	}

	private rebuild() {
		this.bounds.clear()
		this.clipPaths.clear()
		for (const shape of this.editor.getCurrentPageShapes()) {
			const bounds = this.getBounds(shape)
			if (bounds) this.bounds.set(shape.id, bounds)
			const clipPath = this.editor.getShapeUtil(shape).getClipPath?.(shape)
			if (clipPath) this.clipPaths.set(shape.id, clipPath)
		}
	}

	/** Record the shape's current clip path; true if it differs from the last one seen. */
	private updateClipPath(shape: TLShape | undefined, id: TLShapeId): boolean {
		const next = shape ? this.editor.getShapeUtil(shape).getClipPath?.(shape) : undefined
		const prev = this.clipPaths.get(id)
		if (next) this.clipPaths.set(id, next)
		else this.clipPaths.delete(id)
		return !arePolygonsEqual(prev, next)
	}

	private update(dirty: Set<TLShapeId>, removed: Set<TLShapeId>) {
		let didChange = false

		for (const id of removed) {
			if (this.bounds.delete(id)) didChange = true
			this.clipPaths.delete(id)
		}

		const queue = [...dirty]
		const queued = new Set(dirty)
		while (queue.length) {
			const id = queue.pop()!
			const record = this.editor.store.unsafeGetWithoutCapture(id)
			const shape =
				record && isShape(record) && this.editor.getAncestorPageId(record) === this.lastPageId
					? record
					: undefined

			// Descendants' masks are built from this shape's clip path. A record change that moves
			// or resizes it already dirtied them, but a clip path derived from other shapes (like
			// children) can change while its record doesn't.
			if (this.updateClipPath(shape, id)) {
				this.editor.visitDescendants(id, (childId) => {
					if (!queued.has(childId)) {
						queued.add(childId)
						queue.push(childId)
					}
				})
			}

			const bounds = shape ? this.getBounds(shape) : undefined
			const prev = this.bounds.get(id)

			if (!bounds) {
				if (this.bounds.delete(id)) didChange = true
			} else if (!prev || !Box.Equals(prev, bounds)) {
				this.bounds.set(id, bounds)
				didChange = true
			}
		}

		return didChange
	}
}

function arePolygonsEqual(a: VecLike[] | undefined, b: VecLike[] | undefined) {
	if (a === b) return true
	if (!a || !b || a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false
	}
	return true
}
