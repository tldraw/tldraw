import {
	Computed,
	RESET_VALUE,
	computed,
	isUninitialized,
	unsafe__withoutCapture,
} from '@tldraw/state'
import { TLPageId, TLShape, TLShapeId, TLTheme, isShape } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
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
 * The price is reactivity: `getBounds` runs without capturing, so a shape's entry is only
 * refreshed when that shape is dirty. Bounds that depend on anything other than the shape's
 * record, its ancestors, its bindings, the theme or its fonts go stale until the shape changes.
 *
 * @internal
 */
export class CurrentPageBoundsCache {
	private readonly bounds = new Map<TLShapeId, Box>()
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
		for (const shape of this.editor.getCurrentPageShapes()) {
			const bounds = this.getBounds(shape)
			if (bounds) this.bounds.set(shape.id, bounds)
		}
	}

	private update(dirty: Set<TLShapeId>, removed: Set<TLShapeId>) {
		let didChange = false

		for (const id of removed) {
			if (this.bounds.delete(id)) didChange = true
		}

		for (const id of dirty) {
			const shape = this.editor.store.unsafeGetWithoutCapture(id)
			const bounds =
				shape && isShape(shape) && this.editor.getAncestorPageId(shape) === this.lastPageId
					? this.getBounds(shape)
					: undefined
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
