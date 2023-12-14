import { computed, isUninitialized, RESET_VALUE, withDiff } from '@tldraw/state'
import { IncrementalSetConstructor } from '@tldraw/store'
import {
	isPageId,
	isShape,
	isShapeId,
	TLPageId,
	TLShape,
	TLShapeId,
	TLStore,
} from '@tldraw/tlschema'

/**
 * Get whether a shape is in the current page.
 *
 * @param store - The tldraw store.
 * @param pageId - The id of the page to check.
 * @param shape - The the shape to check.
 */
const isShapeInPage = (store: TLStore, pageId: TLPageId, shape: TLShape): boolean => {
	while (!isPageId(shape.parentId)) {
		const parent = store.get(shape.parentId)
		if (!parent) return false
		shape = parent
	}

	return shape.parentId === pageId
}

/**
 * A derivation that returns a list of shape ids in the current page.
 *
 * @param store - The tldraw store.
 * @param getCurrentPageId - A function that returns the current page id.
 */
export const deriveShapeIdsInCurrentPage = (store: TLStore, getCurrentPageId: () => TLPageId) => {
	const shapesIndex = store.query.ids('shape')
	let lastPageId: null | TLPageId = null
	function fromScratch() {
		const currentPageId = getCurrentPageId()
		lastPageId = currentPageId
		return new Set(
			[...shapesIndex.get()].filter((id) => isShapeInPage(store, currentPageId, store.get(id)!))
		)
	}
	return computed<Set<TLShapeId>>('_shapeIdsInCurrentPage', (prevValue, lastComputedEpoch) => {
		if (isUninitialized(prevValue)) {
			return fromScratch()
		}

		const currentPageId = getCurrentPageId()

		if (currentPageId !== lastPageId) {
			return fromScratch()
		}

		const diff = store.history.getDiffSince(lastComputedEpoch)

		if (diff === RESET_VALUE) {
			return fromScratch()
		}

		const builder = new IncrementalSetConstructor<TLShapeId>(
			prevValue
		) as IncrementalSetConstructor<TLShapeId>

		for (const changes of diff) {
			for (const record of Object.values(changes.added)) {
				if (isShape(record) && isShapeInPage(store, currentPageId, record)) {
					builder.add(record.id)
				}
			}

			for (const [_from, to] of Object.values(changes.updated)) {
				if (isShape(to)) {
					if (isShapeInPage(store, currentPageId, to)) {
						builder.add(to.id)
					} else {
						builder.remove(to.id)
					}
				}
			}

			for (const id of Object.keys(changes.removed)) {
				if (isShapeId(id)) {
					builder.remove(id)
				}
			}
		}

		const result = builder.get()
		if (!result) {
			return prevValue
		}

		return withDiff(result.value, result.diff)
	})
}
