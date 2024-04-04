import { RecordsDiff, UnknownRecord } from '@tldraw/store'

/** @public */
export type TLCommandHistoryOptions = Partial<{
	/**
	 * When true, this command will not add anything to the undo / redo stack. Its change will never be undone or redone.
	 */
	ephemeral: boolean
	/**
	 * When true, adding this this command will not clear out the redo stack.
	 */
	preservesRedoStack: boolean
}>

/** @public */
export type TLHistoryMark = {
	type: 'STOP'
	id: string
	onUndo: boolean
	onRedo: boolean
}

/** @public */
export type TLCommand<R extends UnknownRecord> = {
	type: 'command'
	diff: RecordsDiff<R>
	name: string
	/**
	 * Allows for commands that change state and should be undoable, but are 'inconsequential' and
	 * should not clear the redo stack. e.g. modifying the set of selected ids.
	 */
	preservesRedoStack?: boolean
}

/** @public */
export type TLHistoryEntry<R extends UnknownRecord> = TLHistoryMark | TLCommand<R>
