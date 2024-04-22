import { getOwnProperty, mapObjectMapValues, objectMapEntries } from '@tldraw/utils'
import { IdOf, UnknownRecord } from './BaseRecord'
import { RecordsDiff } from './RecordsDiff'

/** @internal */
export interface PatchedRecordsDiff<R extends UnknownRecord> {
	added: Record<IdOf<R>, R>
	patched: Record<IdOf<R>, RecordPatch<R>>
	removed: Record<IdOf<R>, R>
}

/** @internal */
export type RecordPatch<R extends UnknownRecord> = {
	[Prop in Exclude<keyof R, 'id' | 'typeName'>]?: [R[Prop], R[Prop]]
}

/** @internal */
export function createEmptyPatchedRecordsDiff<R extends UnknownRecord>(): PatchedRecordsDiff<R> {
	return { added: {}, patched: {}, removed: {} } as PatchedRecordsDiff<R>
}

/** @internal */
export function createRecordPatch<R extends UnknownRecord>(
	before: R,
	after: R
): RecordPatch<R> | null {
	let patch: RecordPatch<R> | null = null

	for (const key of Object.keys(before)) {
		if (key === 'id' || key === 'typeName') continue
		const beforeValue = getOwnProperty(before, key)
		const afterValue = getOwnProperty(after, key)
		if (Object.is(beforeValue, afterValue)) continue

		if (!patch) patch = {}
		;(patch as any)[key] = [beforeValue, afterValue]
	}

	return patch
}

/** @internal */
export function isPatchedRecordsDiffEmpty<R extends UnknownRecord>(diff: PatchedRecordsDiff<R>) {
	return (
		Object.keys(diff.added).length === 0 &&
		Object.keys(diff.patched).length === 0 &&
		Object.keys(diff.removed).length === 0
	)
}

/** @internal */
export function applyRecordPatch<R extends UnknownRecord>(record: R, patch: RecordPatch<R>) {
	let changed: R | null = null
	for (const [key, change] of objectMapEntries(patch)) {
		if (!change) continue
		if (Object.is(getOwnProperty(record, key), change[1])) continue
		if (!changed) changed = { ...record }
		;(changed as any)[key] = change[1]
	}

	return changed || record
}

/** @internal */
export function squashRecordPatches<R extends UnknownRecord>(
	a: RecordPatch<R>,
	b: RecordPatch<R>
): RecordPatch<R> {
	const result = { ...a }
	for (const [key, change] of objectMapEntries(b)) {
		if (!change) continue

		const existing = getOwnProperty(result, key)
		if (existing) {
			;(result as any)[key] = [existing[0], change[1]]
		} else {
			;(result as any)[key] = change
		}
	}
	return result
}

/** @internal */
export function reverseRecordPatch<R extends UnknownRecord>(patch: RecordPatch<R>): RecordPatch<R> {
	return mapObjectMapValues(patch, (key, change) => {
		if (!change) return undefined
		return [change[1], change[0]]
	})
}

/** @internal */
export function reversePatchedRecordsDiff<R extends UnknownRecord>(diff: PatchedRecordsDiff<R>) {
	const result = { added: diff.removed, removed: diff.added, patched: {} } as PatchedRecordsDiff<R>
	for (const [id, patch] of objectMapEntries(diff.patched)) {
		if (!patch) continue
		result.patched[id] = reverseRecordPatch(patch)
	}
	return result
}

/** @internal */
export function squashPatchedRecordsDiff<R extends UnknownRecord>(diffs: PatchedRecordsDiff<R>[]) {
	const result = createEmptyPatchedRecordsDiff()
	for (const diff of diffs) {
		squashPatchedRecordsDiffMutable(result, diff)
	}
	return result
}

/** @internal */
export function squashPatchedRecordsDiffMutable<R extends UnknownRecord>(
	target: PatchedRecordsDiff<R>,
	diff: PatchedRecordsDiff<R>
) {
	for (const [id, value] of objectMapEntries(diff.added)) {
		if (target.removed[id]) {
			const original = target.removed[id]
			delete target.removed[id]
			if (original !== value) {
				const patch = createRecordPatch(original, value)
				if (patch) target.patched[id] = patch
			}
		} else {
			target.added[id] = value
		}
	}

	for (const [id, patch] of objectMapEntries(diff.patched)) {
		if (target.added[id]) {
			target.added[id] = applyRecordPatch(target.added[id], patch)
			delete target.patched[id]
			delete target.removed[id]
			continue
		}
		if (target.patched[id]) {
			target.patched[id] = squashRecordPatches(target.patched[id], patch)
			delete target.removed[id]
			continue
		}

		target.patched[id] = patch
		delete target.removed[id]
	}

	for (const [id, value] of objectMapEntries(diff.removed)) {
		// the same record was added in this diff sequence, just drop it
		if (target.added[id]) {
			delete target.added[id]
		} else if (target.patched[id]) {
			target.removed[id] = applyRecordPatch(value, reverseRecordPatch(target.patched[id]))
			delete target.patched[id]
		} else {
			target.removed[id] = value
		}
	}
}

/** @internal */
export function createPatchedRecordsDiffFromRecordsDiff<R extends UnknownRecord>(
	recordsDiff: RecordsDiff<R>
) {
	const result = createEmptyPatchedRecordsDiff<R>()
	result.added = recordsDiff.added
	result.removed = recordsDiff.removed

	for (const [id, [before, after]] of objectMapEntries(recordsDiff.updated)) {
		const patch = createRecordPatch(before, after)
		if (!patch) continue
		result.patched[id] = patch
	}

	return result
}
