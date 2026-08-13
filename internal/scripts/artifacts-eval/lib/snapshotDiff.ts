import type { SnapshotJson, SnapshotRecord } from './types'

export interface DocEntry {
	state: SnapshotRecord
	lastChangedClock?: number
	stateJson: string
}

export type DocMap = Map<string, DocEntry>

export function toDocMap(snapshot: SnapshotJson): DocMap {
	const map: DocMap = new Map()
	for (const doc of snapshot.documents) {
		map.set(doc.state.id, {
			state: doc.state,
			lastChangedClock: doc.lastChangedClock,
			stateJson: JSON.stringify(doc.state),
		})
	}
	return map
}

export interface SnapshotDiff {
	puts: Array<{ id: string; json: string }>
	deletes: string[]
}

/**
 * Content-faithful changed-record detection. Equal lastChangedClocks short-circuit as
 * unchanged (a record can't change without its clock moving); otherwise compare JSON,
 * because getChangesSince can report a put whose content is byte-identical and committing
 * that would diverge from what git records as a change.
 */
export function diffDocMaps(prev: DocMap | null, cur: DocMap): SnapshotDiff {
	const puts: SnapshotDiff['puts'] = []
	const deletes: string[] = []

	for (const [id, doc] of cur) {
		const prevDoc = prev?.get(id)
		if (!prevDoc) {
			puts.push({ id, json: doc.stateJson })
			continue
		}
		const clocksEqual =
			doc.lastChangedClock !== undefined && doc.lastChangedClock === prevDoc.lastChangedClock
		if (!clocksEqual && doc.stateJson !== prevDoc.stateJson) {
			puts.push({ id, json: doc.stateJson })
		}
	}

	if (prev) {
		for (const id of prev.keys()) {
			if (!cur.has(id)) deletes.push(id)
		}
	}

	return { puts, deletes }
}
