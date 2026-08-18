import { Editor, getIndexBetween, getIndicesBetween, TLParentId } from 'tldraw'

/**
 * Registers side effects that keep connection shapes below all other shapes in the same parent,
 * so connections never render on top of nodes.
 */
export function keepConnectionsAtBottom(editor: Editor) {
	// Parents whose children may need re-sorting once the current operation completes
	let pendingChangedParentIds = new Set<TLParentId>()

	editor.sideEffects.registerAfterCreateHandler('shape', (shape, source) => {
		if (source === 'remote') return
		pendingChangedParentIds.add(shape.parentId)
	})
	editor.sideEffects.registerAfterChangeHandler('shape', (oldShape, newShape, source) => {
		if (source === 'remote') return
		if (oldShape.parentId === newShape.parentId && oldShape.index === newShape.index) return
		pendingChangedParentIds.add(newShape.parentId)
	})

	editor.sideEffects.registerOperationCompleteHandler(() => {
		if (pendingChangedParentIds.size === 0) return

		const changedParentIds = pendingChangedParentIds
		pendingChangedParentIds = new Set()

		const updates = []

		for (const parentId of changedParentIds) {
			// Because this runs after every operation, children are always roughly sorted already,
			// so we only need to find non-connections that sit below the highest connection and
			// move them up above it (keeping their relative order).
			const childIds = editor.getSortedChildIdsForParent(parentId)

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

			const shapesToMove = []
			for (; i >= 0; i--) {
				const child = editor.getShape(childIds[i])
				if (child && child.type !== 'connection') shapesToMove.push(child)
			}
			shapesToMove.reverse()

			const newIndexes = getIndicesBetween(
				highestConnectionIndex,
				nextIndexAboveHighestConnectionIndex,
				shapesToMove.length
			)

			for (let i = 0; i < shapesToMove.length; i++) {
				const shape = shapesToMove[i]
				updates.push({ id: shape.id, type: shape.type, index: newIndexes[i] } as const)
			}
		}

		editor.updateShapes(updates)
	})
}

/**
 * Get an index just above the highest connection in the given parent, but below every other shape.
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
