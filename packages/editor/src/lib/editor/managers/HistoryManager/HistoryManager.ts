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
import { exhaustiveSwitchError, noop } from '@tldraw/utils'
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

	/**
	 * Remember the undo history as it is now. `rollback` puts it back: the undo and redo stacks,
	 * and the pending undo entry, drop everything recorded since, marks included. `release` keeps
	 * it. The caller reverts the store itself; this only keeps the history in step.
	 *
	 * Marks and bails inside the checkpoint see the real history, so a denied run's undo steps
	 * vanish, and an allowed run's stay exactly as they would without a checkpoint.
	 *
	 * @internal
	 */
	_checkpoint(): { rollback(): void; release(): void } {
		const stacks = this.stacks.get()
		const journal = this.pendingDiff.openJournal()
		return {
			rollback: () => {
				this.pendingDiff.closeJournal(journal, true)
				this.stacks.set(stacks)
			},
			release: () => this.pendingDiff.closeJournal(journal, false),
		}
	}

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

/**
 * What the pending diff held, for each id a checkpoint's run touched, before the run touched it.
 * Only touches to `target` count: once a mark moves `target` onto the undo stack, it no longer
 * changes, and restoring the stacks drops what came after.
 */
interface PendingDiffJournal<R extends UnknownRecord> {
	readonly target: RecordsDiff<R>
	readonly before: Map<string, { added?: R; updated?: [R, R]; removed?: R }>
}

class PendingDiff<R extends UnknownRecord> {
	private diff = createEmptyRecordsDiff<R>()
	private isEmptyAtom = atom('PendingDiff.isEmpty', true)
	private journals: PendingDiffJournal<R>[] = []

	openJournal(): PendingDiffJournal<R> {
		const journal = { target: this.diff, before: new Map() }
		this.journals.push(journal)
		return journal
	}

	closeJournal(journal: PendingDiffJournal<R>, rollback: boolean) {
		const index = this.journals.indexOf(journal)
		if (index !== -1) this.journals.splice(index, 1)
		if (!rollback) return
		const { target } = journal
		const maps = target as unknown as Record<'added' | 'updated' | 'removed', Record<string, any>>
		for (const [id, before] of journal.before) {
			for (const key of ['added', 'updated', 'removed'] as const) {
				if (before[key] === undefined) delete maps[key][id]
				else maps[key][id] = before[key]
			}
		}
		this.diff = target
		this.isEmptyAtom.set(isRecordsDiffEmpty(target))
	}

	private journal(diff: RecordsDiff<R>) {
		for (const journal of this.journals) {
			if (journal.target !== this.diff) continue
			const { target, before } = journal
			for (const changes of [diff.added, diff.updated, diff.removed]) {
				for (const id in changes) {
					if (before.has(id)) continue
					const updated = target.updated[id as keyof typeof target.updated]
					before.set(id, {
						added: target.added[id as keyof typeof target.added],
						// squashing mutates update tuples in place, so keep a copy
						updated: updated && [updated[0], updated[1]],
						removed: target.removed[id as keyof typeof target.removed],
					})
				}
			}
		}
	}

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
		if (this.journals.length) this.journal(diff)
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
