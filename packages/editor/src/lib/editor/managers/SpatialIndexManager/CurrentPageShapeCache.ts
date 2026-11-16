import {
	Computed,
	RESET_VALUE,
	computed,
	isUninitialized,
	unsafe__withoutCapture,
} from '@tldraw/state'
import { TLPageId, TLShape, TLShapeId, isShape } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'
import { getShapesWithDirtyBounds } from './getShapesWithDirtyBounds'

/**
 * An incrementally maintained map of a bounds-derived value for every shape on the current page.
 *
 * A computed that reads per-shape bounds for the whole page has to revalidate every shape's
 * bounds on every store change, which costs milliseconds per change on large pages. This instead
 * rederives only the shapes that a change could have affected (see
 * `getShapesWithDirtyBounds`, which also describes what it can miss), plus a full rebuild
 * on page change and font load.
 *
 * `derive` runs without capturing, so it is only re-run for a shape when that shape is dirty:
 * it should depend on nothing but the shape's record and its page-space bounds or mask.
 *
 * @internal
 */
export class CurrentPageShapeCache<T> {
	private readonly values = new Map<TLShapeId, T>()
	private readonly epoch: Computed<number>
	private lastPageId: TLPageId | null = null
	private lastFontLoadEpoch = -1

	constructor(
		private readonly editor: Editor,
		name: string,
		/** Get the value for a shape. Return undefined to leave the shape out. */
		private readonly derive: (shape: TLShape) => T | undefined,
		/** Dependents are only invalidated when some shape's value stops being equal. */
		private readonly isEqual: (a: T, b: T) => boolean
	) {
		const shapeHistory = editor.store.query.filterHistory('shape')
		const bindingHistory = editor.store.query.filterHistory('binding')

		this.epoch = computed<number>(name, (prevEpoch, lastComputedEpoch) => {
			const shapeDiff = shapeHistory.getDiffSince(lastComputedEpoch)
			const bindingDiff = bindingHistory.getDiffSince(lastComputedEpoch)
			const currentPageId = editor.getCurrentPageId()
			const fontLoadEpoch = editor.fonts.getFontLoadEpoch()

			if (
				isUninitialized(prevEpoch) ||
				shapeDiff === RESET_VALUE ||
				bindingDiff === RESET_VALUE ||
				this.lastPageId !== currentPageId ||
				this.lastFontLoadEpoch !== fontLoadEpoch
			) {
				this.lastPageId = currentPageId
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
	 * The cached values by shape id, in no particular order. Reactive: reading it inside a
	 * computed or reaction subscribes to changes. The map is updated in place, so don't hold on
	 * to it or compare it by identity.
	 */
	get(): ReadonlyMap<TLShapeId, T> {
		this.epoch.get()
		return this.values
	}

	private rebuild() {
		this.values.clear()
		for (const shape of this.editor.getCurrentPageShapes()) {
			const value = this.derive(shape)
			if (value !== undefined) this.values.set(shape.id, value)
		}
	}

	private update(dirty: Set<TLShapeId>, removed: Set<TLShapeId>) {
		const { values } = this
		let didChange = false

		for (const id of removed) {
			if (values.delete(id)) didChange = true
		}

		for (const id of dirty) {
			const shape = this.editor.store.unsafeGetWithoutCapture(id)
			const value =
				shape && isShape(shape) && this.editor.getAncestorPageId(shape) === this.lastPageId
					? this.derive(shape)
					: undefined

			if (value === undefined) {
				if (values.delete(id)) didChange = true
			} else if (!values.has(id) || !this.isEqual(values.get(id)!, value)) {
				values.set(id, value)
				didChange = true
			}
		}

		return didChange
	}
}
