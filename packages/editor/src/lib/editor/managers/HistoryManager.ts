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
import { exhaustiveSwitchError } from '@tldraw/utils'
import { uniqueId } from '../../utils/uniqueId'
import { TLHistoryBatchOptions, TLHistoryEntry } from '../types/history-types'
import { stack } from './Stack'

enum HistoryRecorderState {
	Recording = 'recording',
	RecordingPreserveRedoStack = 'recordingPreserveRedoStack',
	Paused = 'paused',
}

export class HistoryManager<
	R extends UnknownRecord,
	CTX extends {
		store: Store<R>
		emit: (name: 'change-history' | 'mark-history', ...args: any) => void
	},
> {
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

	private state: HistoryRecorderState = HistoryRecorderState.Recording
	private readonly pendingDiff = new PendingDiff<R>()
	readonly dispose: () => void

	constructor(
		private readonly ctx: CTX,
		private readonly annotateError: (error: unknown) => void
	) {
		this.dispose = this.ctx.store.addHistoryInterceptor((entry, source) => {
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

	// private hasPendingDiff = atom('HistoryManager.hasPendingDiff', false)
	// private _pendingDiff = createEmptyDiff<R>()
	// private getPendingDiff() {
	// 	return this._pendingDiff
	// }
	// private setPendingDiff(diff: RecordsDiff<R>) {
	// 	this._pendingDiff = diff
	// 	this.didUpdatePendingDiff()
	// }
	// private didUpdatePendingDiff() {
	// 	this.hasPendingDiff.set(isRecordsDiffEmpty(this._pendingDiff))
	// }
	// private appendToPending
	flushPendingDiff() {
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
		this.state = opts?.history ? modeToState[opts.history] : this.state

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
					this.ctx.emit('change-history', { reason: 'push' })
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

	ephemeral(fn: () => void) {
		return this.batch(fn, { history: 'ephemeral' })
	}
	preserveRedoStack(fn: () => void) {
		return this.batch(fn, { history: 'preserveRedoStack' })
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

			this.ctx.store.applyDiff(diffToUndo)
			this.stacks.set({ undos, redos })

			this.ctx.emit(
				'change-history',
				pushToRedoStack ? { reason: 'undo' } : { reason: 'bail', markId: toMark }
			)
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

			this.ctx.store.applyDiff(diffToRedo)
			this.stacks.set({ undos, redos })

			this.ctx.emit('change-history', { reason: 'redo' })
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

		this.ctx.emit('mark-history', { id })

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
	ephemeral: HistoryRecorderState.Paused,
	preserveRedoStack: HistoryRecorderState.RecordingPreserveRedoStack,
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
