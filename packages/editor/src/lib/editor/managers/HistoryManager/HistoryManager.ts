import { atom, EMPTY_ARRAY, transact } from '@tldraw/state'
import {
	createEmptyRecordsDiff,
	isRecordsDiffEmpty,
	RecordsDiff,
	reverseRecordsDiff,
	squashRecordDiffsMutable,
	Store,
	UnknownRecord,
} from '@tldraw/store'
import { exhaustiveSwitchError, isEqual, noop } from '@tldraw/utils'
import { TLHistoryBatchOptions, TLHistoryEntry } from '../../types/history-types'

const HistoryRecorderState = {
	Recording: 'recording',
	RecordingPreserveRedoStack: 'recordingPreserveRedoStack',
	Paused: 'paused',
} as const
type HistoryRecorderState = (typeof HistoryRecorderState)[keyof typeof HistoryRecorderState]

/** @public */
export class HistoryManager<R extends UnknownRecord> {
	private readonly store: Store<R>

	readonly dispose: () => void

	private state: HistoryRecorderState = HistoryRecorderState.Recording
	private readonly pendingDiff = new PendingDiff<R>()
	private stacks = atom(
		'HistoryManager.stacks',
		{
			undos: stack<TLHistoryEntry<R>>(),
			redos: stack<TLHistoryEntry<R>>(),
		},
		{
			isEqual: (a, b) => a.undos === b.undos && a.redos === b.redos,
		}
	)

	private readonly annotateError: (error: unknown) => void

	constructor(opts: { store: Store<R>; annotateError?(error: unknown): void }) {
		this.store = opts.store
		this.annotateError = opts.annotateError ?? noop
		this.dispose = this.store.addHistoryInterceptor((entry, source) => {
			if (source !== 'user') return

			switch (this.state) {
				case HistoryRecorderState.Recording:
					this.pendingDiff.apply(entry.changes)
					// this interceptor runs for every store change, so skip the update when the
					// redo stack is already empty
					if (this.stacks.get().redos.length > 0) {
						this.stacks.update(({ undos }) => ({ undos, redos: stack() }))
					}
					break
				case HistoryRecorderState.RecordingPreserveRedoStack:
					this.pendingDiff.apply(entry.changes)
					break
				case HistoryRecorderState.Paused:
					break
				default:
					exhaustiveSwitchError(this.state)
			}
		})
	}

	private flushPendingDiff() {
		if (this.pendingDiff.isEmpty()) return

		const diff = this.pendingDiff.clear()
		this.stacks.update(({ undos, redos }) => ({
			undos: undos.push({ type: 'diff', diff }),
			redos,
		}))
	}

	/**
	 * Take a change the server refused out of the undo and redo stacks, so undo can't replay a step
	 * that never happened. With `changes` (the refused change as the user made it) only that
	 * chain of steps is removed from the undo stack: starting from the user's version, steps whose
	 * result is the current version are dropped until the server's version is reached. With ids
	 * alone, every step on those records is dropped. Redo steps on those records are always dropped.
	 *
	 * @internal
	 */
	removeRefused(refusal: { ids?: readonly string[]; changes?: RecordsDiff<R> }) {
		this.flushPendingDiff()
		const { undos, redos } = this.stacks.get()
		if (undos.length === 0 && redos.length === 0) return

		const changes = refusal.changes
		const ids = new Set<string>(
			changes
				? [
						...Object.keys(changes.added),
						...Object.keys(changes.updated),
						...Object.keys(changes.removed),
					]
				: (refusal.ids ?? [])
		)
		if (ids.size === 0) return

		const undoEntries = stackToArray(undos).slice()
		if (changes) {
			for (const id of ids) subtractRefusedChain(undoEntries, id, changes)
		} else {
			for (const id of ids) dropRecord(undoEntries, id)
		}
		const redoEntries = stackToArray(redos).slice()
		for (const id of ids) dropRecord(redoEntries, id)

		// a mark with nothing left under it would make getCanUndo() true for no work
		for (const entries of [undoEntries, redoEntries]) {
			while (entries.length > 0 && entries[entries.length - 1].type === 'stop') entries.pop()
		}

		this.stacks.set({ undos: arrayToStack(undoEntries), redos: arrayToStack(redoEntries) })
	}

	getNumUndos() {
		return this.stacks.get().undos.length + (this.pendingDiff.isEmpty() ? 0 : 1)
	}

	getNumRedos() {
		return this.stacks.get().redos.length
	}

	/** @internal */
	private _isReplaying = false

	/** @internal */
	isReplaying() {
		return this._isReplaying
	}

	/** @internal */
	_isInBatch = false

	batch(fn: () => void, opts?: TLHistoryBatchOptions) {
		const previousState = this.state

		// we move to the new state only if we haven't explicitly paused
		if (previousState !== HistoryRecorderState.Paused && opts?.history) {
			this.state = modeToState[opts.history]
		}

		try {
			if (this._isInBatch) {
				transact(fn)
				return this
			}

			this._isInBatch = true
			try {
				transact(fn)
			} catch (error) {
				this.annotateError(error)
				throw error
			} finally {
				this._isInBatch = false
			}

			return this
		} finally {
			this.state = previousState
		}
	}

	// History
	_undo({ pushToRedoStack, toMark = undefined }: { pushToRedoStack: boolean; toMark?: string }) {
		const previousState = this.state
		const previousIsReplaying = this._isReplaying
		this.state = HistoryRecorderState.Paused
		this._isReplaying = true
		try {
			let { undos, redos } = this.stacks.get()

			// start by collecting the pending diff (everything since the last mark).
			// we'll accumulate the diff to undo in this variable so we can apply it atomically.
			const pendingDiff = this.pendingDiff.clear()
			const isPendingDiffEmpty = isRecordsDiffEmpty(pendingDiff)
			const diffToUndo = reverseRecordsDiff(pendingDiff)

			if (pushToRedoStack && !isPendingDiffEmpty) {
				redos = redos.push({ type: 'diff', diff: pendingDiff })
			}

			let didFindMark = false
			if (isPendingDiffEmpty) {
				// if nothing has happened since the last mark, pop any intermediate marks off the stack
				while (undos.head?.type === 'stop') {
					const mark = undos.head
					undos = undos.tail
					if (pushToRedoStack) {
						redos = redos.push(mark)
					}
					if (mark.id === toMark) {
						didFindMark = true
						break
					}
				}
			}

			if (!didFindMark) {
				loop: while (undos.head) {
					const undo = undos.head
					undos = undos.tail

					if (pushToRedoStack) {
						redos = redos.push(undo)
					}

					switch (undo.type) {
						case 'diff':
							squashRecordDiffsMutable(diffToUndo, [reverseRecordsDiff(undo.diff)])
							break
						case 'stop':
							if (!toMark) break loop
							if (undo.id === toMark) {
								didFindMark = true
								break loop
							}
							break
						default:
							exhaustiveSwitchError(undo)
					}
				}
			}

			if (!didFindMark && toMark) {
				// we didn't find the mark we were looking for — restore state and bail
				this.pendingDiff.restore(pendingDiff)
				return this
			}
			this.store.applyDiff(diffToUndo, { ignoreEphemeralKeys: true })
			this.store.ensureStoreIsUsable()
			this.stacks.set({ undos, redos })
		} finally {
			this._isReplaying = previousIsReplaying
			this.state = previousState
		}

		return this
	}

	undo() {
		this._undo({ pushToRedoStack: true })

		return this
	}

	redo() {
		const previousState = this.state
		const previousIsReplaying = this._isReplaying
		this.state = HistoryRecorderState.Paused
		this._isReplaying = true
		try {
			this.flushPendingDiff()

			let { undos, redos } = this.stacks.get()
			if (redos.length === 0) {
				return this
			}

			// ignore any intermediate marks - this should take us to the first `diff` entry
			while (redos.head?.type === 'stop') {
				undos = undos.push(redos.head)
				redos = redos.tail
			}

			// accumulate diffs to be redone so they can be applied atomically
			const diffToRedo = createEmptyRecordsDiff<R>()

			while (redos.head) {
				const redo = redos.head
				undos = undos.push(redo)
				redos = redos.tail

				if (redo.type === 'diff') {
					squashRecordDiffsMutable(diffToRedo, [redo.diff])
				} else {
					break
				}
			}
			this.store.applyDiff(diffToRedo, { ignoreEphemeralKeys: true })
			this.store.ensureStoreIsUsable()
			this.stacks.set({ undos, redos })
		} finally {
			this._isReplaying = previousIsReplaying
			this.state = previousState
		}

		return this
	}

	bail() {
		this._undo({ pushToRedoStack: false })

		return this
	}

	bailToMark(id: string) {
		if (id) {
			this._undo({ pushToRedoStack: false, toMark: id })
		}

		return this
	}

	squashToMark(id: string) {
		// remove marks between head and the mark

		let top = this.stacks.get().undos
		const popped: Array<RecordsDiff<R>> = []

		while (top.head && !(top.head.type === 'stop' && top.head.id === id)) {
			if (top.head.type === 'diff') {
				popped.push(top.head.diff)
			}
			top = top.tail
		}

		if (!top.head || top.head?.id !== id) {
			console.error('Could not find mark to squash to: ', id)
			return this
		}
		if (popped.length === 0) {
			return this
		}

		const diff = createEmptyRecordsDiff<R>()
		squashRecordDiffsMutable(diff, popped.reverse())

		this.stacks.update(({ redos }) => ({
			undos: top.push({
				type: 'diff',
				diff,
			}),
			redos,
		}))

		return this
	}

	/** @internal */
	_mark(id: string) {
		transact(() => {
			this.flushPendingDiff()
			this.stacks.update(({ undos, redos }) => ({ undos: undos.push({ type: 'stop', id }), redos }))
		})
	}

	clear() {
		this.stacks.set({ undos: stack(), redos: stack() })
		this.pendingDiff.clear()
	}

	/** @internal */
	getMarkIdMatching(idSubstring: string) {
		let top = this.stacks.get().undos
		while (top.head) {
			if (top.head.type === 'stop' && top.head.id.includes(idSubstring)) {
				return top.head.id
			}
			top = top.tail
		}
		return null
	}

	/** @internal */
	debug() {
		const { undos, redos } = this.stacks.get()
		return {
			undos: stackToArray(undos),
			redos: stackToArray(redos),
			pendingDiff: this.pendingDiff.debug(),
			state: this.state as string,
		}
	}
}

const modeToState = {
	record: HistoryRecorderState.Recording,
	'record-preserveRedoStack': HistoryRecorderState.RecordingPreserveRedoStack,
	ignore: HistoryRecorderState.Paused,
} as const

class PendingDiff<R extends UnknownRecord> {
	private diff = createEmptyRecordsDiff<R>()
	private isEmptyAtom = atom('PendingDiff.isEmpty', true)

	clear() {
		const diff = this.diff
		this.diff = createEmptyRecordsDiff<R>()
		this.isEmptyAtom.set(true)
		return diff
	}

	restore(diff: RecordsDiff<R>) {
		this.diff = diff
		this.isEmptyAtom.set(isRecordsDiffEmpty(diff))
	}

	isEmpty() {
		return this.isEmptyAtom.get()
	}

	apply(diff: RecordsDiff<R>) {
		squashRecordDiffsMutable(this.diff, [diff])
		// Recomputing emptiness from the accumulated diff is O(N) (for-in over a
		// dictionary-mode object pays an O(N) key-collection prologue), and this runs on
		// every history interceptor call — e.g. every input tick while resizing many
		// shapes. Updates can never cancel out existing entries during a squash, so the
		// full recompute is only needed when the incoming diff adds or removes records.
		if (hasAnyKey(diff.added) || hasAnyKey(diff.removed)) {
			this.isEmptyAtom.set(isRecordsDiffEmpty(this.diff))
		} else if (this.isEmptyAtom.__unsafe__getWithoutCapture()) {
			this.isEmptyAtom.set(!hasAnyKey(diff.updated))
		}
	}

	debug() {
		return { diff: this.diff, isEmpty: this.isEmpty() }
	}
}

function hasAnyKey(obj: object) {
	for (const _ in obj) return true
	return false
}

type Stack<T> = StackItem<T> | EmptyStackItem<T>

function stack<T>(): Stack<T> {
	return EMPTY_STACK_ITEM as any
}

class EmptyStackItem<T> {
	readonly length = 0
	readonly head = null
	readonly tail: Stack<T> = this

	push(head: T): Stack<T> {
		return new StackItem<T>(head, this)
	}
}

const EMPTY_STACK_ITEM = new EmptyStackItem()

class StackItem<T> {
	length: number
	constructor(
		public readonly head: T,
		public readonly tail: Stack<T>
	) {
		this.length = tail.length + 1
	}

	push(head: T): Stack<T> {
		return new StackItem(head, this)
	}
}

/** Entries are newest first, like the stacks. */
function arrayToStack<T>(entries: T[]): Stack<T> {
	let result = stack<T>()
	for (let i = entries.length - 1; i >= 0; i--) result = result.push(entries[i])
	return result
}

type RecordState<R> = R | undefined

/** A record's state before and after one history step, or null if the step didn't touch it. */
function getStepStates<R extends UnknownRecord>(
	diff: RecordsDiff<R>,
	id: string
): [RecordState<R>, RecordState<R>] | null {
	if (id in diff.added) return [undefined, diff.added[id as R['id']]]
	if (id in diff.updated) return diff.updated[id as R['id']]
	if (id in diff.removed) return [diff.removed[id as R['id']], undefined]
	return null
}

function withoutRecord<R extends UnknownRecord>(diff: RecordsDiff<R>, id: string): RecordsDiff<R> {
	const omit = <T>(map: Record<string, T>) =>
		Object.fromEntries(Object.entries(map).filter(([key]) => key !== id))
	return {
		added: omit(diff.added),
		updated: omit(diff.updated),
		removed: omit(diff.removed),
	} as RecordsDiff<R>
}

/** Remove a record's changes from entries (newest first); an entry left empty is removed. */
function dropRecord<R extends UnknownRecord>(entries: TLHistoryEntry<R>[], id: string) {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i]
		if (entry.type !== 'diff' || !getStepStates(entry.diff, id)) continue
		const diff = withoutRecord(entry.diff, id)
		if (isRecordsDiffEmpty(diff)) entries.splice(i, 1)
		else entries[i] = { type: 'diff', diff }
	}
}

function subtractRefusedChain<R extends UnknownRecord>(
	entries: TLHistoryEntry<R>[],
	id: string,
	refused: RecordsDiff<R>
) {
	let user: RecordState<R>
	let server: RecordState<R>
	if (id in refused.added) {
		;[server, user] = [undefined, refused.added[id as R['id']]]
	} else if (id in refused.updated) {
		;[server, user] = refused.updated[id as R['id']]
	} else {
		;[server, user] = [refused.removed[id as R['id']], undefined]
	}

	let current = user
	for (let i = 0; i < entries.length && !isEqual(current, server); i++) {
		const entry = entries[i]
		if (entry.type !== 'diff') continue
		const states = getStepStates(entry.diff, id)
		if (!states) continue
		// a step that doesn't continue the chain means the record moved on without us: leave it
		if (!isEqual(states[1], current)) return
		current = states[0]
		const diff = withoutRecord(entry.diff, id)
		if (isRecordsDiffEmpty(diff)) {
			entries.splice(i, 1)
			i--
		} else {
			entries[i] = { type: 'diff', diff }
		}
	}
}

function stackToArray<T>(stack: Stack<T>) {
	if (!stack.length) {
		return EMPTY_ARRAY
	}
	const arr: T[] = []
	while (stack.length) {
		arr.push(stack.head!)
		stack = stack.tail
	}
	return arr
}
