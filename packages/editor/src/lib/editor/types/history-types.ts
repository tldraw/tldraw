import { RecordsDiff, SerializedSchema, UnknownRecord } from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'

/** @public */
export interface TLHistoryMark {
	type: 'stop'
	id: string
}

/** @public */
export interface TLHistoryDiff<R extends UnknownRecord> {
	type: 'diff'
	diff: RecordsDiff<R>
}

/** @public */
export type TLHistoryEntry<R extends UnknownRecord> = TLHistoryMark | TLHistoryDiff<R>

/**
 * A serializable snapshot of the editor's undo/redo history. Capture one with
 * {@link Editor.getHistorySnapshot} and restore it with {@link Editor.loadHistorySnapshot}.
 *
 * The history entries contain full record values, so a snapshot can only be loaded into a
 * store whose schema matches the schema it was captured under. The `schema` property is
 * used to enforce this on load.
 *
 * @public
 */
export interface TLHistorySnapshot<R extends UnknownRecord = TLRecord> {
	/** The version of the history snapshot format. */
	version: number
	/** The serialized schema of the store the snapshot was captured from. */
	schema: SerializedSchema
	/** The undo stack, ordered from oldest to most recent entry. */
	undos: TLHistoryEntry<R>[]
	/** The redo stack, ordered from oldest to most recent entry. */
	redos: TLHistoryEntry<R>[]
}

/** @public */
export interface TLHistoryBatchOptions {
	/**
	 * How should this change interact with the history stack?
	 * - record: Add to the undo stack and clear the redo stack
	 * - record-preserveRedoStack: Add to the undo stack but do not clear the redo stack
	 * - ignore: Do not add to the undo stack or the redo stack
	 */
	history?: 'record' | 'record-preserveRedoStack' | 'ignore'
}
