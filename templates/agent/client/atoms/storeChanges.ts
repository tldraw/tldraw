import { Editor, atom } from 'tldraw'
import { convertTldrawShapeToSimpleShape } from '../../shared/format/SimpleShape'
import { UserActionEntry, UserActionHistory } from '../../shared/types/UserActionHistory'

export const $userActionHistory = atom<UserActionHistory[]>('changes by shape id', [])

export function getUserActionHistory(editor: Editor) {
	const cleanUp = editor.store.listen(
		(change) => {
			// Handle create, update, and delete separately for clarity
			// CREATE
			Object.values(change.changes.added)
				.filter((record) => record.typeName === 'shape')
				.forEach((record) => {
					const simpleShape = convertTldrawShapeToSimpleShape(record, editor)
					const storeChange: UserActionEntry = {
						type: 'create',
						initialShape: null,
						finalShape: simpleShape,
					}

					// Add to shapeId-based changes
					$userActionHistory.update((prev) => {
						const existingShapeIndex = prev.findIndex(
							(history) => history.shapeId === simpleShape.shapeId
						)
						if (existingShapeIndex >= 0) {
							// Shape already exists, add to its history
							const updatedHistory = [...prev]
							updatedHistory[existingShapeIndex] = {
								...updatedHistory[existingShapeIndex],
								changes: [...updatedHistory[existingShapeIndex].changes, storeChange],
							}
							return updatedHistory
						} else {
							// New shape, create new history entry
							return [
								...prev,
								{
									shapeId: simpleShape.shapeId,
									changes: [storeChange],
								},
							]
						}
					})
				})

			// UPDATE
			Object.values(change.changes.updated)
				.filter(
					(pair) =>
						Array.isArray(pair) && pair[0].typeName === 'shape' && pair[1].typeName === 'shape'
				)
				.forEach((pair) => {
					const [from, to] = pair
					if (from.typeName !== 'shape' || to.typeName !== 'shape') return
					const initialShape = convertTldrawShapeToSimpleShape(from, editor)
					const finalShape = convertTldrawShapeToSimpleShape(to, editor)
					const storeChange: UserActionEntry = {
						type: 'update',
						initialShape,
						finalShape,
					}

					// Add to shapeId-based changes
					$userActionHistory.update((prev) => {
						const existingShapeIndex = prev.findIndex(
							(history) => history.shapeId === finalShape.shapeId
						)
						if (existingShapeIndex >= 0) {
							// Shape already exists, add to its history
							const updatedHistory = [...prev]
							updatedHistory[existingShapeIndex] = {
								...updatedHistory[existingShapeIndex],
								changes: [...updatedHistory[existingShapeIndex].changes, storeChange],
							}
							return updatedHistory
						} else {
							// New shape, create new history entry
							return [
								...prev,
								{
									shapeId: finalShape.shapeId,
									changes: [storeChange],
								},
							]
						}
					})
				})

			// DELETE
			Object.values(change.changes.removed)
				.filter((record) => record.typeName === 'shape')
				.forEach((record) => {
					const simpleShape = convertTldrawShapeToSimpleShape(record, editor)
					const storeChange: UserActionEntry = {
						type: 'delete',
						initialShape: simpleShape,
						finalShape: null,
					}

					// Add to shapeId-based changes
					$userActionHistory.update((prev) => {
						const existingShapeIndex = prev.findIndex(
							(history) => history.shapeId === simpleShape.shapeId
						)
						if (existingShapeIndex >= 0) {
							// Shape already exists, add to its history
							const updatedHistory = [...prev]
							updatedHistory[existingShapeIndex] = {
								...updatedHistory[existingShapeIndex],
								changes: [...updatedHistory[existingShapeIndex].changes, storeChange],
							}
							return updatedHistory
						} else {
							// New shape, create new history entry
							return [
								...prev,
								{
									shapeId: simpleShape.shapeId,
									changes: [storeChange],
								},
							]
						}
					})
				})
		},
		{ scope: 'document', source: 'user' }
	)

	return cleanUp
}
