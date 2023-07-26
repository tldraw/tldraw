import { computed, isUninitialized, RESET_VALUE } from '@tldraw/state'
import { RecordsDiff } from '@tldraw/store'
import { isShape, TLParentId, TLRecord, TLShapeId, TLStore } from '@tldraw/tlschema'

type Parents2Children = Record<TLParentId, [id: TLShapeId, index: string][]>

export const parentsToChildrenWithIndexes = (store: TLStore) => {
	const shapeIds = store.query.ids<'shape'>('shape')
	function fromScratch() {
		const result: Parents2Children = {}

		// Populate the result object with an array for each parent.
		shapeIds.value.forEach((id) => {
			const shape = store.get(id)!

			if (!result[shape.parentId]) {
				result[shape.parentId] = []
			}

			result[shape.parentId].push([id, shape.index])
		})

		// Sort the children by index
		Object.values(result).forEach((arr) => arr.sort((a, b) => (a[1] < b[1] ? -1 : 1)))

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

			let newValue: Record<TLParentId, [id: TLShapeId, index: string][]> | null = null

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

			const toSort = new Set<[id: TLShapeId, index: string][]>()

			let changes: RecordsDiff<TLRecord>

			for (let i = 0, n = diff.length; i < n; i++) {
				changes = diff[i]

				// Iterate through the added shapes, add them to the new value and mark them for sorting
				for (const record of Object.values(changes.added)) {
					if (!isShape(record)) continue
					ensureNewArray(record.parentId)
					newValue![record.parentId].push([record.id, record.index])
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
						newValue![from.parentId].splice(
							newValue![from.parentId].findIndex((i) => i[0] === to.id),
							1
						)
						newValue![to.parentId].push([to.id, to.index])
						toSort.add(newValue![to.parentId])
					} else if (from.index !== to.index) {
						// If the parent is the same but the index has changed (e.g. if they've been reordered), update the parent's array at the new index
						ensureNewArray(to.parentId)
						const idx = newValue![to.parentId].findIndex((i) => i[0] === to.id)
						newValue![to.parentId][idx] = [to.id, to.index]
						toSort.add(newValue![to.parentId])
					}
				}

				// Iterate through the removed shapes, remove them from their parents in new value
				for (const record of Object.values(changes.removed)) {
					if (!isShape(record)) continue
					ensureNewArray(record.parentId)
					newValue![record.parentId].splice(
						newValue![record.parentId].findIndex((i) => i[0] === record.id),
						1
					)
				}
			}

			// Sort the arrays that have been marked for sorting
			for (const arr of toSort) {
				arr.sort((a, b) => (a[1] < b[1] ? -1 : 1))
			}

			return newValue ?? lastValue
		}
	)
}
