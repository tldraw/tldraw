import { Editor, getIndexBetween, getIndicesBetween, TLParentId } from 'tldraw'

export function keepConnectionsAtBottom(editor: Editor) {
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
				if (!child) continue

				if (child.type !== 'connection') {
					shapesToMove.push(child)
				}
			}

			shapesToMove.reverse()

			const newIndexes = getIndicesBetween(
				highestConnectionIndex,
				nextIndexAboveHighestConnectionIndex,
				shapesToMove.length
			)

			for (let i = 0; i < shapesToMove.length; i++) {
				const shape = shapesToMove[i]
				const newIndex = newIndexes[i]
				updates.push({
					id: shape.id,
					type: shape.type,
					index: newIndex,
				} as const)
			}
		}

		editor.updateShapes(updates)
	})
}

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
