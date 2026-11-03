import { UnknownRecord } from '@tldraw/store'

/**
 * Which comment records a restore removes or brings back. Loading a snapshot wipes the whole
 * comment lane, so an undo also has to put back comments written since the undone restore.
 */
export function planRestoreComments(args: {
	liveCommentRecords: UnknownRecord[]
	undoTombstones: UnknownRecord[] | null
}): { toTombstone: UnknownRecord[]; toReinsert: UnknownRecord[]; outboxIds: string[] } {
	if (!args.undoTombstones) {
		return {
			toTombstone: args.liveCommentRecords,
			toReinsert: [],
			outboxIds: args.liveCommentRecords.map((r) => r.id),
		}
	}
	const byId = new Map<string, UnknownRecord>()
	for (const r of args.liveCommentRecords) byId.set(r.id, r)
	for (const r of args.undoTombstones) byId.set(r.id, r)
	const toReinsert = [...byId.values()]
	return { toTombstone: [], toReinsert, outboxIds: toReinsert.map((r) => r.id) }
}
