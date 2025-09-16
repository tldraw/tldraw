import { RecordsDiff, UnknownRecord } from '@tldraw/store'
import { isEqual, objectMapEntries, objectMapValues } from '@tldraw/utils'

/**
 * Constants representing the types of operations that can be applied to records in network diffs.
 * These operations describe how a record has been modified during synchronization.
 *
 * @internal
 */
export const RecordOpType = {
	Put: 'put',
	Patch: 'patch',
	Remove: 'remove',
} as const

/**
 * Union type of all possible record operation types.
 *
 * @internal
 */
export type RecordOpType = (typeof RecordOpType)[keyof typeof RecordOpType]

/**
 * Represents a single operation to be applied to a record during synchronization.
 *
 * @param R - The record type being operated on
 *
 * @internal
 */
export type RecordOp<R extends UnknownRecord> =
	| [typeof RecordOpType.Put, R]
	| [typeof RecordOpType.Patch, ObjectDiff]
	| [typeof RecordOpType.Remove]

/**
 * A one-way (non-reversible) diff designed for small json footprint. These are mainly intended to
 * be sent over the wire. Either as push requests from the client to the server, or as patch
 * operations in the opposite direction.
 *
 * Each key in this object is the id of a record that has been added, updated, or removed.
 *
 * @internal
 */
export interface NetworkDiff<R extends UnknownRecord> {
	[id: string]: RecordOp<R>
}

/**
 * Converts a (reversible, verbose) RecordsDiff into a (non-reversible, concise) NetworkDiff
 * suitable for transmission over the network. This function optimizes the diff representation
 * for minimal bandwidth usage while maintaining all necessary change information.
 *
 * @param diff - The RecordsDiff containing added, updated, and removed records
 * @returns A compact NetworkDiff for network transmission, or null if no changes exist
 *
 * @example
 * ```ts
 * const recordsDiff = {
 *   added: { 'shape:1': newShape },
 *   updated: { 'shape:2': [oldShape, updatedShape] },
 *   removed: { 'shape:3': removedShape }
 * }
 *
 * const networkDiff = getNetworkDiff(recordsDiff)
 * // Returns: {
 * //   'shape:1': ['put', newShape],
 * //   'shape:2': ['patch', { x: ['put', 100] }],
 * //   'shape:3': ['remove']
 * // }
 * ```
 *
 * @internal
 */
export function getNetworkDiff<R extends UnknownRecord>(
	diff: RecordsDiff<R>
): NetworkDiff<R> | null {
	let res: NetworkDiff<R> | null = null

	for (const [k, v] of objectMapEntries(diff.added)) {
		if (!res) res = {}
		res[k] = [RecordOpType.Put, v]
	}

	for (const [from, to] of objectMapValues(diff.updated)) {
		const diff = diffRecord(from, to)
		if (diff) {
			if (!res) res = {}
			res[to.id] = [RecordOpType.Patch, diff]
		}
	}

	for (const removed of Object.keys(diff.removed)) {
		if (!res) res = {}
		res[removed] = [RecordOpType.Remove]
	}

	return res
}

/**
 * Constants representing the types of operations that can be applied to individual values
 * within object diffs. These operations describe how object properties have changed.
 *
 * @internal
 */
export const ValueOpType = {
	Put: 'put',
	Delete: 'delete',
	Append: 'append',
	Patch: 'patch',
} as const
/**
 * Union type of all possible value operation types.
 *
 * @internal
 */
export type ValueOpType = (typeof ValueOpType)[keyof typeof ValueOpType]

/**
 * Operation that replaces a value entirely with a new value.
 *
 * @internal
 */
export type PutOp = [type: typeof ValueOpType.Put, value: unknown]
/**
 * Operation that appends new values to the end of an array.
 *
 * @internal
 */
export type AppendOp = [type: typeof ValueOpType.Append, values: unknown[], offset: number]
/**
 * Operation that applies a nested diff to an object or array.
 *
 * @internal
 */
export type PatchOp = [type: typeof ValueOpType.Patch, diff: ObjectDiff]
/**
 * Operation that removes a property from an object.
 *
 * @internal
 */
export type DeleteOp = [type: typeof ValueOpType.Delete]

/**
 * Union type representing any value operation that can be applied during diffing.
 *
 * @internal
 */
export type ValueOp = PutOp | AppendOp | PatchOp | DeleteOp

/**
 * Represents the differences between two objects as a mapping of property names
 * to the operations needed to transform one object into another.
 *
 * @internal
 */
export interface ObjectDiff {
	[k: string]: ValueOp
}

/**
 * Computes the difference between two record objects, generating an ObjectDiff
 * that describes how to transform the previous record into the next record.
 * This function is optimized for tldraw records and treats 'props' as a nested object.
 *
 * @param prev - The previous version of the record
 * @param next - The next version of the record
 * @returns An ObjectDiff describing the changes, or null if no changes exist
 *
 * @example
 * ```ts
 * const oldShape = { id: 'shape:1', x: 100, y: 200, props: { color: 'red' } }
 * const newShape = { id: 'shape:1', x: 150, y: 200, props: { color: 'blue' } }
 *
 * const diff = diffRecord(oldShape, newShape)
 * // Returns: {
 * //   x: ['put', 150],
 * //   props: ['patch', { color: ['put', 'blue'] }]
 * // }
 * ```
 *
 * @internal
 */
export function diffRecord(prev: object, next: object): ObjectDiff | null {
	return diffObject(prev, next, new Set(['props']))
}

function diffObject(prev: object, next: object, nestedKeys?: Set<string>): ObjectDiff | null {
	if (prev === next) {
		return null
	}
	let result: ObjectDiff | null = null
	for (const key of Object.keys(prev)) {
		// if key is not in next then it was deleted
		if (!(key in next)) {
			if (!result) result = {}
			result[key] = [ValueOpType.Delete]
			continue
		}
		// if key is in both places, then compare values
		const prevVal = (prev as any)[key]
		const nextVal = (next as any)[key]
		if (!isEqual(prevVal, nextVal)) {
			if (nestedKeys?.has(key) && prevVal && nextVal) {
				const diff = diffObject(prevVal, nextVal)
				if (diff) {
					if (!result) result = {}
					result[key] = [ValueOpType.Patch, diff]
				}
			} else if (Array.isArray(nextVal) && Array.isArray(prevVal)) {
				const op = diffArray(prevVal, nextVal)
				if (op) {
					if (!result) result = {}
					result[key] = op
				}
			} else {
				if (!result) result = {}
				result[key] = [ValueOpType.Put, nextVal]
			}
		}
	}
	for (const key of Object.keys(next)) {
		// if key is in next but not in prev then it was added
		if (!(key in prev)) {
			if (!result) result = {}
			result[key] = [ValueOpType.Put, (next as any)[key]]
		}
	}
	return result
}

function diffValue(valueA: unknown, valueB: unknown): ValueOp | null {
	if (Object.is(valueA, valueB)) return null
	if (Array.isArray(valueA) && Array.isArray(valueB)) {
		return diffArray(valueA, valueB)
	} else if (!valueA || !valueB || typeof valueA !== 'object' || typeof valueB !== 'object') {
		return isEqual(valueA, valueB) ? null : [ValueOpType.Put, valueB]
	} else {
		const diff = diffObject(valueA, valueB)
		return diff ? [ValueOpType.Patch, diff] : null
	}
}

function diffArray(prevArray: unknown[], nextArray: unknown[]): PutOp | AppendOp | PatchOp | null {
	if (Object.is(prevArray, nextArray)) return null
	// if lengths are equal, check for patch operation
	if (prevArray.length === nextArray.length) {
		// bail out if more than len/5 items need patching
		const maxPatchIndexes = Math.max(prevArray.length / 5, 1)
		const toPatchIndexes = []
		for (let i = 0; i < prevArray.length; i++) {
			if (!isEqual(prevArray[i], nextArray[i])) {
				toPatchIndexes.push(i)
				if (toPatchIndexes.length > maxPatchIndexes) {
					return [ValueOpType.Put, nextArray]
				}
			}
		}
		if (toPatchIndexes.length === 0) {
			// same length and no items changed, so no diff
			return null
		}
		const diff: ObjectDiff = {}
		for (const i of toPatchIndexes) {
			const prevItem = prevArray[i]
			const nextItem = nextArray[i]
			if (!prevItem || !nextItem) {
				diff[i] = [ValueOpType.Put, nextItem]
			} else if (typeof prevItem === 'object' && typeof nextItem === 'object') {
				const op = diffValue(prevItem, nextItem)
				if (op) {
					diff[i] = op
				}
			} else {
				diff[i] = [ValueOpType.Put, nextItem]
			}
		}
		return [ValueOpType.Patch, diff]
	}

	// if lengths are not equal, check for append operation, and bail out
	// to replace whole array if any shared elems changed
	for (let i = 0; i < prevArray.length; i++) {
		if (!isEqual(prevArray[i], nextArray[i])) {
			return [ValueOpType.Put, nextArray]
		}
	}

	return [ValueOpType.Append, nextArray.slice(prevArray.length), prevArray.length]
}

/**
 * Applies an ObjectDiff to an object, returning a new object with the changes applied.
 * This function handles all value operation types and creates a shallow copy when modifications
 * are needed. If no changes are required, the original object is returned.
 *
 * @param object - The object to apply the diff to
 * @param objectDiff - The ObjectDiff containing the operations to apply
 * @returns A new object with the diff applied, or the original object if no changes were needed
 *
 * @example
 * ```ts
 * const original = { x: 100, y: 200, props: { color: 'red' } }
 * const diff = {
 *   x: ['put', 150],
 *   props: ['patch', { color: ['put', 'blue'] }]
 * }
 *
 * const updated = applyObjectDiff(original, diff)
 * // Returns: { x: 150, y: 200, props: { color: 'blue' } }
 * ```
 *
 * @internal
 */
export function applyObjectDiff<T extends object>(object: T, objectDiff: ObjectDiff): T {
	// don't patch nulls
	if (!object || typeof object !== 'object') return object
	const isArray = Array.isArray(object)
	let newObject: any | undefined = undefined
	const set = (k: any, v: any) => {
		if (!newObject) {
			if (isArray) {
				newObject = [...object]
			} else {
				newObject = { ...object }
			}
		}
		if (isArray) {
			newObject[Number(k)] = v
		} else {
			newObject[k] = v
		}
	}
	for (const [key, op] of Object.entries(objectDiff)) {
		switch (op[0]) {
			case ValueOpType.Put: {
				const value = op[1]
				if (!isEqual(object[key as keyof T], value)) {
					set(key, value)
				}
				break
			}
			case ValueOpType.Append: {
				const values = op[1]
				const offset = op[2]
				const arr = object[key as keyof T]
				if (Array.isArray(arr) && arr.length === offset) {
					set(key, [...arr, ...values])
				}
				break
			}
			case ValueOpType.Patch: {
				if (object[key as keyof T] && typeof object[key as keyof T] === 'object') {
					const diff = op[1]
					const patched = applyObjectDiff(object[key as keyof T] as object, diff)
					if (patched !== object[key as keyof T]) {
						set(key, patched)
					}
				}
				break
			}
			case ValueOpType.Delete: {
				if (key in object) {
					if (!newObject) {
						if (isArray) {
							console.error("Can't delete array item yet (this should never happen)")
							newObject = [...object]
						} else {
							newObject = { ...object }
						}
					}
					delete newObject[key]
				}
			}
		}
	}

	return newObject ?? object
}
