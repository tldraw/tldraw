import { UnknownRecord } from '@tldraw/store'
import { exhaustiveSwitchError, objectMapEntries, structuredClone } from '@tldraw/utils'
import {
	NetworkDiff,
	ObjectDiff,
	RecordOp,
	RecordOpType,
	ValueOpType,
	applyObjectDiff,
} from './diff'
import { TLSocketServerSentDataEvent } from './protocol'

interface State<R extends UnknownRecord> {
	lastPatch: (TLSocketServerSentDataEvent<R> & { type: 'patch' }) | null
	squished: TLSocketServerSentDataEvent<R>[]
}

type Bailed = boolean

function patchThePatch(lastPatch: ObjectDiff, newPatch: ObjectDiff): Bailed {
	for (const [newKey, newOp] of Object.entries(newPatch)) {
		switch (newOp[0]) {
			case ValueOpType.Put:
				lastPatch[newKey] = newOp
				break
			case ValueOpType.Append:
				if (lastPatch[newKey] === undefined) {
					lastPatch[newKey] = newOp
				} else {
					const lastOp = lastPatch[newKey]
					if (lastOp[0] === ValueOpType.Append) {
						const lastValues = lastOp[1]
						const lastOffset = lastOp[2]
						const newValues = newOp[1]
						const newOffset = newOp[2]
						if (newOffset === lastOffset + lastValues.length) {
							lastValues.push(...newValues)
						} else {
							// something weird is going on, bail out
							return true
						}
					} else {
						// bail out, it's too hard
						return true
					}
				}
				break
			case ValueOpType.Patch:
				if (lastPatch[newKey] === undefined) {
					lastPatch[newKey] = newOp
				} else {
					// bail out, recursive patching is too hard
					return true
				}
				break
			case ValueOpType.Delete:
				// overwrite whatever was there previously, no point if it's going to be removed
				// todo: check if it was freshly put and don't add if it wasn't?
				lastPatch[newKey] = newOp
				break
			default:
				exhaustiveSwitchError(newOp[0])
		}
	}

	return false
}

function patchTheOp<R extends UnknownRecord>(
	lastRecordOp: RecordOp<R>,
	newPatch: ObjectDiff
): Bailed {
	switch (lastRecordOp[0]) {
		case RecordOpType.Put:
			// patching a freshly added value is easy, just patch as normal
			lastRecordOp[1] = applyObjectDiff(lastRecordOp[1], newPatch)
			break
		case RecordOpType.Patch: {
			// both are patches, merge them
			const bailed = patchThePatch(lastRecordOp[1], newPatch)
			if (bailed) {
				return true
			}
			break
		}
		case RecordOpType.Remove:
			// we're trying to patch an object that was removed, just disregard the update
			break
		default:
			exhaustiveSwitchError(lastRecordOp[0])
	}

	return false
}

function squishInto<R extends UnknownRecord>(
	lastDiff: NetworkDiff<R>,
	newDiff: NetworkDiff<R>
): Bailed {
	for (const [newId, newOp] of objectMapEntries(newDiff)) {
		switch (newOp[0]) {
			case RecordOpType.Put:
				// we Put the same record several times, just overwrite whatever came previously
				lastDiff[newId] = newOp
				break
			case RecordOpType.Patch:
				if (lastDiff[newId] === undefined) {
					// this is the patch now
					lastDiff[newId] = newOp
				} else {
					// patch the previous RecordOp!
					const bailed = patchTheOp(lastDiff[newId], newOp[1])
					if (bailed) {
						return true
					}
				}
				break
			case RecordOpType.Remove:
				// overwrite whatever was there previously
				// todo: check if it was freshly put and don't add if it wasn't?
				lastDiff[newId] = newOp
				break
			default:
				exhaustiveSwitchError(newOp[0])
		}
	}

	return false
}

export function squishDataEvents<R extends UnknownRecord>(
	dataEvents: TLSocketServerSentDataEvent<R>[]
): TLSocketServerSentDataEvent<R>[] {
	if (dataEvents.length < 2) {
		// most common case
		return dataEvents
	}

	const state: State<R> = { lastPatch: null, squished: [] }

	for (const e of dataEvents) {
		switch (e.type) {
			case 'push_result':
				if (state.lastPatch !== null) {
					state.squished.push(state.lastPatch)
					state.lastPatch = null
				}
				state.squished.push(e)
				break
			case 'patch':
				if (state.lastPatch !== null) {
					// this structuredClone is necessary to avoid modifying the original list of events
					// (otherwise objects can get reused on put and then modified on patch)
					const bailed = squishInto(state.lastPatch.diff, structuredClone(e.diff))
					if (bailed) {
						// this is unfortunate, but some patches were too hard to patch, give up
						// and return the original list
						return dataEvents
					}

					state.lastPatch.serverClock = e.serverClock
				} else {
					state.lastPatch = structuredClone(e)
				}
				break
			default:
				exhaustiveSwitchError(e, 'type')
		}
	}

	if (state.lastPatch !== null) {
		state.squished.push(state.lastPatch)
	}

	return state.squished
}
