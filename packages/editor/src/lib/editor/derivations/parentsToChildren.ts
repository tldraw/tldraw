import { computed, isUninitialized, RESET_VALUE } from '@tldraw/state'
import { RecordsDiff } from '@tldraw/store'
import { isShape, TLParentId, TLRecord, TLShape, TLShapeId, TLStore } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import { sortByIndex } from '../../utils/reordering/reordering'

type Parents2Children = Record<TLParentId, TLShapeId[]>

export const parentsToChildren = (store: TLStore) => {
	const shapeIdsQuery = store.query.ids<'shape'>('shape')

	function fromScratch() {
		const result: Parents2Children = {}
		const shapeIds = shapeIdsQuery.get()
		const shapes = Array(shapeIds.size) as TLShape[]
		shapeIds.forEach((id) => shapes.push(store.get(id)!))

		// Sort the shapes by index
		shapes.sort(sortByIndex)

		// Populate the result object with an array for each parent.
		shapes.forEach((shape) => {
			if (!result[shape.parentId]) {
				result[shape.parentId] = []
			}
			result[shape.parentId].push(shape.id)
		})

		return result
	}

	return computed<Parents2Children>(
		'parentsToChildrenWithIndexes',
		(lastValue, lastComputedEpoch) => {
			if (isUninitialized(lastValue)) {
				return fromScratch()
			}

			const diff = store.history.getDiffSince(lastComputedEpoch)

			if (diff === RESET_VALUE) {
				return fromScratch()
			}

			if (diff.length === 0) return lastValue

			let newValue: Record<TLParentId, TLShapeId[]> | null = null

			const ensureNewArray = (parentId: TLParentId) => {
				if (!newValue) {
					newValue = { ...lastValue }
				}
				if (!newValue[parentId]) {
					newValue[parentId] = []
				} else if (newValue[parentId] === lastValue[parentId]) {
					newValue[parentId] = [...newValue[parentId]!]
				}
			}

			const toSort = new Set<TLShapeId[]>()

			let changes: RecordsDiff<TLRecord>

			for (let i = 0, n = diff.length; i < n; i++) {
				changes = diff[i]

				// Iterate through the added shapes, add them to the new value and mark them for sorting
				for (const record of Object.values(changes.added)) {
					if (!isShape(record)) continue
					ensureNewArray(record.parentId)
					newValue![record.parentId].push(record.id)
					toSort.add(newValue![record.parentId])
				}

				// Iterate through the updated shapes, add them to their parents in the new value and mark them for sorting
				for (const [from, to] of Object.values(changes.updated)) {
					if (!isShape(to)) continue
					if (!isShape(from)) continue

					if (from.parentId !== to.parentId) {
						// If the parents have changed, remove the new value from the old parent and add it to the new parent
						ensureNewArray(from.parentId)
						ensureNewArray(to.parentId)
						newValue![from.parentId].splice(newValue![from.parentId].indexOf(to.id), 1)
						newValue![to.parentId].push(to.id)
						toSort.add(newValue![to.parentId])
					} else if (from.index !== to.index) {
						// If the parent is the same but the index has changed (e.g. if they've been reordered), update the parent's array at the new index
						ensureNewArray(to.parentId)
						const idx = newValue![to.parentId].indexOf(to.id)
						newValue![to.parentId][idx] = to.id
						toSort.add(newValue![to.parentId])
					}
				}

				// Iterate through the removed shapes, remove them from their parents in new value
				for (const record of Object.values(changes.removed)) {
					if (!isShape(record)) continue
					ensureNewArray(record.parentId)
					newValue![record.parentId].splice(newValue![record.parentId].indexOf(record.id), 1)
				}
			}

			// Sort the arrays that have been marked for sorting
			for (const arr of toSort) {
				// It's possible that some of the shapes may be deleted. But in which case would this be so?
				const shapesInArr = compact(arr.map((id) => store.get(id)))
				shapesInArr.sort(sortByIndex)
				arr.splice(0, arr.length, ...shapesInArr.map((shape) => shape.id))
			}

			return newValue ?? lastValue
		}
	)
}
