import { atom, transact } from '@tldraw/state'
import {
	RecordsDiff,
	Store,
	UnknownRecord,
	createEmptyRecordsDiff,
	isRecordsDiffEmpty,
	reverseRecordsDiff,
	squashRecordDiffsMutable,
} from '@tldraw/store'
import { exhaustiveSwitchError, noop } from '@tldraw/utils'
import { uniqueId } from '../../utils/uniqueId'
import { TLHistoryBatchOptions, TLHistoryEntry } from '../types/history-types'
import { stack } from './Stack'

enum HistoryRecorderState {
	Recording = 'recording',
	RecordingPreserveRedoStack = 'recordingPreserveRedoStack',
	Paused = 'paused',
}

/** @public */
export class HistoryManager<R extends UnknownRecord> {
	private readonly store: Store<R>

	readonly dispose: () => void

	private state: HistoryRecorderState = HistoryRecorderState.Recording
	private readonly pendingDiff = new PendingDiff<R>()
	/** @internal */
	stacks = atom(
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

	constructor(opts: { store: Store<R>; annotateError?: (error: unknown) => void }) {
		this.store = opts.store
		this.annotateError = opts.annotateError ?? noop
		this.dispose = this.store.addHistoryInterceptor((entry, source) => {
			if (source !== 'user') return

			switch (this.state) {
				case HistoryRecorderState.Recording:
					this.pendingDiff.apply(entry.changes)
					this.stacks.update(({ undos }) => ({ undos, redos: stack() }))
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

	onBatchComplete: () => void = () => void null

	getNumUndos() {
		return this.stacks.get().undos.length + (this.pendingDiff.isEmpty() ? 0 : 1)
	}
	getNumRedos() {
		return this.stacks.get().redos.length
	}

	/** @internal */
	_isInBatch = false
	batch = (fn: () => void, opts?: TLHistoryBatchOptions) => {
		const previousState = this.state

		// we move to the new state only if we haven't explicitly paused
		if (previousState !== HistoryRecorderState.Paused && opts?.history) {
			this.state = modeToState[opts.history]
		}

		try {
			if (this._isInBatch) {
				fn()
				return this
			}

			this._isInBatch = true
			try {
				transact(() => {
					fn()
					this.onBatchComplete()
				})
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

	ignore(fn: () => void) {
		return this.batch(fn, { history: 'ignore' })
	}

	// History
	private _undo = ({
		pushToRedoStack,
		toMark = undefined,
	}: {
		pushToRedoStack: boolean
		toMark?: string
	}) => {
		const previousState = this.state
		this.state = HistoryRecorderState.Paused
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
							if (undo.id === toMark) break loop
							break
						default:
							exhaustiveSwitchError(undo)
					}
				}
			}

			this.store.applyDiff(diffToUndo, { ignoreEphemeralKeys: true })
			this.store.ensureStoreIsUsable()
			this.stacks.set({ undos, redos })
		} finally {
			this.state = previousState
		}

		return this
	}

	undo = () => {
		this._undo({ pushToRedoStack: true })

		return this
	}

	redo = () => {
		const previousState = this.state
		this.state = HistoryRecorderState.Paused
		try {
			this.flushPendingDiff()

			let { undos, redos } = this.stacks.get()
			if (redos.length === 0) {
				return
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
			this.state = previousState
		}

		return this
	}

	bail = () => {
		this._undo({ pushToRedoStack: false })

		return this
	}

	bailToMark = (id: string) => {
		this._undo({ pushToRedoStack: false, toMark: id })

		return this
	}

	mark = (id = uniqueId()) => {
		transact(() => {
			this.flushPendingDiff()
			this.stacks.update(({ undos, redos }) => ({ undos: undos.push({ type: 'stop', id }), redos }))
		})

		return id
	}

	clear() {
		this.stacks.set({ undos: stack(), redos: stack() })
		this.pendingDiff.clear()
	}

	/** @internal */
	debug() {
		const { undos, redos } = this.stacks.get()
		return {
			undos: undos.toArray(),
			redos: redos.toArray(),
			pendingDiff: this.pendingDiff.debug(),
			state: this.state,
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

	isEmpty() {
		return this.isEmptyAtom.get()
	}

	apply(diff: RecordsDiff<R>) {
		squashRecordDiffsMutable(this.diff, [diff])
		this.isEmptyAtom.set(isRecordsDiffEmpty(this.diff))
	}

	debug() {
		return { diff: this.diff, isEmpty: this.isEmpty() }
	}
}
