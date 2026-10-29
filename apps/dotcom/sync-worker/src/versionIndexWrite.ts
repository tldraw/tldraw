import { countShapeChanges } from './versionChangeCounts'
import { SnapshotDelta } from './versionDelta'
import { VersionAuthor, VersionIndexRow } from './versionIndexStorage'

export interface VersionWindowSnapshot {
	authors: VersionAuthor[]
	hasUserChanges: boolean
}

export function buildVersionIndexRow(args: {
	iso: string
	documentClock: number
	window: VersionWindowSnapshot
	delta: SnapshotDelta | null
	override?: Partial<VersionIndexRow>
}): VersionIndexRow {
	return {
		ts: args.iso,
		documentClock: args.documentClock,
		// Server-side writes (asset rewrites, storage meta) never reach the window, so a version
		// with no authors is one nobody made.
		kind: args.window.hasUserChanges ? 'edit' : 'system',
		authors: args.window.authors,
		...countShapeChanges(args.delta?.diff ?? null),
		restoreId: null,
		restoredFrom: null,
		name: null,
		...args.override,
	}
}
