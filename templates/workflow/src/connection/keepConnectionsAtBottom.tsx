import { Editor, getIndexBetween, getIndicesBetween, TLParentId } from 'tldraw'

/**
 * This function registers side effects that will make sure connection shapes are always below all
 * other shapes in the same parent. We do this because we don't want to connections on top of nodes,
 * which might be distracting.
 */
export function keepConnectionsAtBottom(editor: Editor) {
	// whenever an operation happens, we'll keep track of the parent ids that we might need to
	// re-sort the children of. An operation is any atomic change to the tldraw store.
	let pendingChangedParentIds = new Set<TLParentId>()

	// whenever a shape is created, we'll add the parent id to the set of parent ids that we might
	// need to re-sort the children of.
	editor.sideEffects.registerAfterCreateHandler('shape', (shape, source) => {
		if (source === 'remote') return
		pendingChangedParentIds.add(shape.parentId)
	})
	// whenever a shape's index or parent id changes, we'll add the parent id to the set of parent
	// ids that we might need to re-sort the children of.
	editor.sideEffects.registerAfterChangeHandler('shape', (oldShape, newShape, source) => {
		if (source === 'remote') return
		if (oldShape.parentId === newShape.parentId && oldShape.index === newShape.index) return
		pendingChangedParentIds.add(newShape.parentId)
	})

	// then, when the operation is complete, we re-sort the children as needed:
	editor.sideEffects.registerOperationCompleteHandler(() => {
		if (pendingChangedParentIds.size === 0) return

		// reset the set of pending changed parent ids
		const changedParentIds = pendingChangedParentIds
		pendingChangedParentIds = new Set()

		const updates = []

		for (const parentId of changedParentIds) {
			// iterate through all the children of this parent. We want all the connections at the
			// bottom (first), and everything else after that. Because this fn runs all the time,
			// things should always be roughly in the right place to begin with. Because of that,
			// we'll just find any non-connections that are in the wrong place and move them up.

			const childIds = editor.getSortedChildIdsForParent(parentId)

			// we iterate in reverse because we want to find the highest connection index:
			let i = childIds.length - 1
			let highestConnectionIndex = null
			let nextIndexAboveHighestConnectionIndex = null
			for (; i >= 0; i--) {
				const child = editor.getShape(childIds[i])
				if (!child) continue

				if (child.type === 'connection') {
					highestConnectionIndex = child.index
					break
				} else {
					nextIndexAboveHighestConnectionIndex = child.index
				}
			}

			// now that we've found the highest connection index, we switch to looking for
			// non-connection shapes. these need to be moved up above the highest connection index.
			const shapesToMove = []
			for (; i >= 0; i--) {
				const child = editor.getShape(childIds[i])
				if (!child) continue

				if (child.type !== 'connection') {
					shapesToMove.push(child)
				}
			}

			// the shapesToMove array will be in reverse order, so we need to reverse it:
			shapesToMove.reverse()

			// now we need the new indexes for each shape. These need to stay in the same relative
			// order, and be inserted above the `hightestConnectionIndex`, but below the index of
			// the next non-connection shape.
			const newIndexes = getIndicesBetween(
				highestConnectionIndex,
				nextIndexAboveHighestConnectionIndex,
				shapesToMove.length
			)

			// now we can create the update partials for those shapes:
			for (let i = 0; i < shapesToMove.length; i++) {
				const shape = shapesToMove[i]
				const newIndex = newIndexes[i]
				updates.push({
					id: shape.id,
					type: shape.type,
					index: newIndex,
				})
			}
		}

		editor.updateShapes(updates)
	})
}

/**
 * Get the index of the next connection shape in the given parent. This will be above all other
 * connections, but the connections should be below all other shapes.
 */
export function getNextConnectionIndex(
	editor: Editor,
	parentId: TLParentId = editor.getCurrentPageId()
) {
	const childIds = editor.getSortedChildIdsForParent(parentId)

	let prevIndex = null
	let highestConnectionIndex = null
	for (let i = childIds.length - 1; i >= 0; i--) {
		const child = editor.getShape(childIds[i])
		if (!child) continue

		if (child.type === 'connection') {
			highestConnectionIndex = child.index
			break
		}
		prevIndex = child.index
	}

	return getIndexBetween(highestConnectionIndex, prevIndex)
}
