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
