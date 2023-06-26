import { exhaustiveSwitchError } from '@tldraw/utils'
import isEqual from 'lodash.isequal'
import { UnknownRecord } from '../BaseRecord'
import { ChangeOpType, Changes } from './changes'

/** @public */
export enum RecordOpType {
	Set = 'set',
	Patch = 'patch',
	Delete = 'delete',
}

/** @public */
export type RecordOp<R extends UnknownRecord> =
	| [RecordOpType.Set, R]
	| [RecordOpType.Patch, ObjectDiff]
	| [RecordOpType.Delete]

/**
 * A one-way (non-reversible) diff designed for small json footprint. These are mainly intended to
 * be sent over the wire. Either as push requests from the client to the server, or as patch
 * operations in the opposite direction.
 *
 * Each key in this object is the id of a record that has been added, updated, or removed.
 *
 * @public
 */
export type NetworkDiff<R extends UnknownRecord> = {
	[id: string]: RecordOp<R>
}

/**
 * Converts a (reversible, verbose) RecordsDiff into a (non-reversible, concise) NetworkDiff
 *
 * @public
 */
export const getNetworkDiff = <R extends UnknownRecord>(
	changes: Changes<R>
): NetworkDiff<R> | null => {
	let res: NetworkDiff<R> | null = null

	for (const op of Object.values(changes)) {
		switch (op.op) {
			case ChangeOpType.Set:
				if (op.prev) {
					const diff = diffRecord(op.prev, op.record)
					if (diff) {
						if (!res) res = {}
						res[op.record.id] = [RecordOpType.Patch, diff]
					}
				} else {
					if (!res) res = {}
					res[op.record.id] = [RecordOpType.Set, op.record]
				}
				break
			case ChangeOpType.Delete:
				if (!res) res = {}
				res[op.record.id] = [RecordOpType.Delete]
				break
			default:
				exhaustiveSwitchError(op[0])
		}
	}

	return res
}

/** @public */
export enum ValueOpType {
	Set = 'set',
	Delete = 'delete',
	Append = 'append',
	Patch = 'patch',
}
/** @public */
export type SetOp = [type: ValueOpType.Set, value: unknown]
/** @public */
export type AppendOp = [type: ValueOpType.Append, values: unknown[], offset: number]
/** @public */
export type PatchOp = [type: ValueOpType.Patch, diff: ObjectDiff]
/** @public */
export type DeleteOp = [type: ValueOpType.Delete]

/** @public */
export type ValueOp = SetOp | AppendOp | PatchOp | DeleteOp

/** @public */
export type ObjectDiff = {
	[k: string]: ValueOp
}

/** @public */
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
				result[key] = [ValueOpType.Set, nextVal]
			}
		}
	}
	for (const key of Object.keys(next)) {
		// if key is in next but not in prev then it was added
		if (!(key in prev)) {
			if (!result) result = {}
			result[key] = [ValueOpType.Set, (next as any)[key]]
		}
	}
	return result
}

function diffValue(valueA: unknown, valueB: unknown): ValueOp | null {
	if (Object.is(valueA, valueB)) return null
	if (Array.isArray(valueA) && Array.isArray(valueB)) {
		return diffArray(valueA, valueB)
	} else if (!valueA || !valueB || typeof valueA !== 'object' || typeof valueB !== 'object') {
		return isEqual(valueA, valueB) ? null : [ValueOpType.Set, valueB]
	} else {
		const diff = diffObject(valueA, valueB)
		return diff ? [ValueOpType.Patch, diff] : null
	}
}

function diffArray(prevArray: unknown[], nextArray: unknown[]): SetOp | AppendOp | PatchOp | null {
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
					return [ValueOpType.Set, nextArray]
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
				diff[i] = [ValueOpType.Set, nextItem]
			} else if (typeof prevItem === 'object' && typeof nextItem === 'object') {
				const op = diffValue(prevItem, nextItem)
				if (op) {
					diff[i] = op
				}
			} else {
				diff[i] = [ValueOpType.Set, nextItem]
			}
		}
		return [ValueOpType.Patch, diff]
	}

	// if lengths are not equal, check for append operation, and bail out
	// to replace whole array if any shared elems changed
	for (let i = 0; i < prevArray.length; i++) {
		if (!isEqual(prevArray[i], nextArray[i])) {
			return [ValueOpType.Set, nextArray]
		}
	}

	return [ValueOpType.Append, nextArray.slice(prevArray.length), prevArray.length]
}

/** @public */
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
			case ValueOpType.Set: {
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
