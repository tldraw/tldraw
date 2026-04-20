import type { SerializedSchema, TLAssetId, TLRecord, UnknownRecord } from '@tldraw/editor'
import type { TldrawFile } from './file'

/**
 * Mirrors the `RoomSnapshot` shape from `@tldraw/sync-core` without importing
 * that package (the `tldraw` package does not depend on sync-core). Any real
 * `RoomSnapshot` is structurally assignable to this.
 *
 * @public
 */
export interface RoomSnapshotLike {
	clock?: number
	documentClock?: number
	documents: Array<{ state: UnknownRecord; lastChangedClock: number }>
	tombstones?: Record<string, number>
	tombstoneHistoryStartsAtClock?: number
	schema?: SerializedSchema
}

const PERSISTENT_TYPE_NAMES = new Set(['document', 'page', 'shape', 'asset', 'binding'])

/**
 * Convert a `RoomSnapshot` JSON blob (as produced by the sync server) into a
 * `TldrawFile` that can be serialized to a `.tldr` file.
 *
 * This is a pure function: it does not touch the DOM, fetch network resources,
 * or rewrite asset URLs. Session-scoped records (`instance`, `instance_page_state`,
 * `instance_presence`, `camera`, `pointer`, `user`) are dropped, and any asset
 * records that are not referenced by a surviving shape are pruned.
 *
 * @param snapshot - The room snapshot to convert.
 * @returns A `TldrawFile` ready to stringify and write to disk.
 *
 * @public
 */
export function roomSnapshotToTldrawFile(snapshot: RoomSnapshotLike): TldrawFile {
	if (!snapshot.schema) {
		throw new Error('roomSnapshotToTldrawFile: snapshot is missing a schema')
	}

	const persistent: TLRecord[] = []
	for (const doc of snapshot.documents) {
		if (PERSISTENT_TYPE_NAMES.has(doc.state.typeName)) {
			persistent.push(doc.state as TLRecord)
		}
	}

	const usedAssets = new Set<TLAssetId>()
	for (const record of persistent) {
		if (record.typeName === 'shape' && 'assetId' in record.props && record.props.assetId) {
			usedAssets.add(record.props.assetId as TLAssetId)
		}
	}
	const records = persistent.filter((r) => r.typeName !== 'asset' || usedAssets.has(r.id))

	return {
		tldrawFileFormatVersion: 1,
		schema: snapshot.schema,
		records,
	}
}
