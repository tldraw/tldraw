/** @public */
export type TLCommandHistoryOptions = Partial<{
	/**
	 * When true, this command will be squashed with the previous command in the undo / redo stack.
	 */
	squashing: boolean
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
export type TLCommand<Name extends string = any, Data = any> = {
	type: 'command'
	id: string
	data: Data
	name: Name
	/**
	 * Allows for commands that change state and should be undoable, but are 'inconsequential' and
	 * should not clear the redo stack. e.g. modifying the set of selected ids.
	 */
	preservesRedoStack?: boolean
}

/** @public */
export type TLHistoryEntry = TLHistoryMark | TLCommand

/** @public */
export type TLCommandHandler<Data> = {
	do: (data: Data) => void
	undo: (data: Data) => void
	redo?: (data: Data) => void
	/**
	 * Allow to combine the next command with the previous one if possible. Useful for, e.g. combining
	 * a series of shape translation commands into one command in the undo stack
	 */
	squash?: (prevData: Data, nextData: Data) => Data
}
