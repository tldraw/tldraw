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
import { TLHistoryBatchOptions, TLHistoryEntry } from '../../types/history-types'
import { TLPageId } from '@tldraw/tlschema'

enum HistoryRecorderState {
	Recording = 'recording',
	RecordingPreserveRedoStack = 'recordingPreserveRedoStack',
	Paused = 'paused',
}

/** @public */
export class HistoryManager<R extends UnknownRecord> {
	private readonly store: Store<R>
	private readonly getCurrentPageId: () => TLPageId

	readonly dispose: () => void

	private state: HistoryRecorderState = HistoryRecorderState.Recording
	private readonly pendingDiffs = atom(
		'HistoryManager.pendingDiffs',
		new Map<TLPageId, PendingDiff<R>>(),
		{
			isEqual: (a, b) => {
				if (a.size !== b.size) return false
				for (const [pageId, diffA] of a) {
					const diffB = b.get(pageId)
					if (!diffB || !diffA.isEqual(diffB)) {
						return false
					}
				}
				return true
			},
		}
	)
	private stacks = atom(
		'HistoryManager.stacks',
		new Map<TLPageId, { undos: Stack<TLHistoryEntry<R>>; redos: Stack<TLHistoryEntry<R>> }>(),
		{
			isEqual: (a, b) => {
				if (a.size !== b.size) return false
				for (const [pageId, stacksA] of a) {
					const stacksB = b.get(pageId)
					if (!stacksB || stacksA.undos !== stacksB.undos || stacksA.redos !== stacksB.redos) {
						return false
					}
				}
				return true
			},
		}
	)

	private readonly annotateError: (error: unknown) => void

	constructor(opts: {
		store: Store<R>
		getCurrentPageId?: () => TLPageId
		annotateError?(error: unknown): void
	}) {
		this.store = opts.store
		this.getCurrentPageId = opts.getCurrentPageId ?? (() => 'page:global' as TLPageId)
		this.annotateError = opts.annotateError ?? noop
		this.dispose = this.store.addHistoryInterceptor((entry, source) => {
			if (source !== 'user') return

			const currentPageId = this.getCurrentPageId()
			const currentPendingDiff = this.getCurrentPendingDiff()

			switch (this.state) {
				case HistoryRecorderState.Recording:
					currentPendingDiff.apply(entry.changes)
					this.stacks.update((stacks) => {
						const pageStacks = stacks.get(currentPageId) || {
							undos: stack<TLHistoryEntry<R>>(),
							redos: stack<TLHistoryEntry<R>>(),
						}
						const newStacks = new Map(stacks)
						newStacks.set(currentPageId, {
							undos: pageStacks.undos,
							redos: stack<TLHistoryEntry<R>>(),
						})
						return newStacks
					})
					break
				case HistoryRecorderState.RecordingPreserveRedoStack:
					currentPendingDiff.apply(entry.changes)
					break
				case HistoryRecorderState.Paused:
					break
				default:
					exhaustiveSwitchError(this.state)
			}
		})
	}

	private getPageStacks(pageId: TLPageId) {
		const stacks = this.stacks.get()
		let pageStacks = stacks.get(pageId)
		if (!pageStacks) {
			pageStacks = {
				undos: stack<TLHistoryEntry<R>>(),
				redos: stack<TLHistoryEntry<R>>(),
			}
			const newStacks = new Map(stacks)
			newStacks.set(pageId, pageStacks)
			this.stacks.set(newStacks)
		}
		return pageStacks
	}

	private getCurrentPageStacks() {
		return this.getPageStacks(this.getCurrentPageId())
	}

	private getCurrentPendingDiff() {
		const pageId = this.getCurrentPageId()
		const pendingDiffs = this.pendingDiffs.get()
		let pendingDiff = pendingDiffs.get(pageId)
		if (!pendingDiff) {
			pendingDiff = new PendingDiff<R>()
			const newPendingDiffs = new Map(pendingDiffs)
			newPendingDiffs.set(pageId, pendingDiff)
			this.pendingDiffs.set(newPendingDiffs)
		}
		return pendingDiff
	}

	private flushPendingDiffToPage(pageId: TLPageId) {
		const pendingDiffs = this.pendingDiffs.get()
		const pendingDiff = pendingDiffs.get(pageId)
		if (!pendingDiff || pendingDiff.isEmpty()) return

		const diff = pendingDiff.clear()
		this.stacks.update((stacks) => {
			const pageStacks = stacks.get(pageId) || {
				undos: stack<TLHistoryEntry<R>>(),
				redos: stack<TLHistoryEntry<R>>(),
			}
			const newStacks = new Map(stacks)
			newStacks.set(pageId, {
				undos: pageStacks.undos.push({ type: 'diff', diff }),
				redos: pageStacks.redos,
			})
			return newStacks
		})
	}

	private flushPendingDiff() {
		this.flushPendingDiffToPage(this.getCurrentPageId())
	}

	getNumUndos() {
		const pageStacks = this.getCurrentPageStacks()
		const currentPendingDiff = this.getCurrentPendingDiff()
		return pageStacks.undos.length + (currentPendingDiff.isEmpty() ? 0 : 1)
	}

	getNumRedos() {
		const pageStacks = this.getCurrentPageStacks()
		return pageStacks.redos.length
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
		this.state = HistoryRecorderState.Paused
		try {
			const pageId = this.getCurrentPageId()
			const stacks = this.stacks.get()
			let pageStacks = stacks.get(pageId) || {
				undos: stack<TLHistoryEntry<R>>(),
				redos: stack<TLHistoryEntry<R>>(),
			}
			let { undos, redos } = pageStacks

			// start by collecting the pending diff (everything since the last mark).
			// we'll accumulate the diff to undo in this variable so we can apply it atomically.
			const currentPendingDiff = this.getCurrentPendingDiff()
			const pendingDiff = currentPendingDiff.clear()
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
				// whoops, we didn't find the mark we were looking for
				// don't do anything
				return this
			}

			this.store.applyDiff(diffToUndo, { ignoreEphemeralKeys: true })
			this.store.ensureStoreIsUsable()
			const newStacks = new Map(stacks)
			newStacks.set(pageId, { undos, redos })
			this.stacks.set(newStacks)
		} finally {
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
		this.state = HistoryRecorderState.Paused
		try {
			this.flushPendingDiff()

			const pageId = this.getCurrentPageId()
			const stacks = this.stacks.get()
			let pageStacks = stacks.get(pageId) || {
				undos: stack<TLHistoryEntry<R>>(),
				redos: stack<TLHistoryEntry<R>>(),
			}
			let { undos, redos } = pageStacks
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
			const newStacks = new Map(stacks)
			newStacks.set(pageId, { undos, redos })
			this.stacks.set(newStacks)
		} finally {
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
		this.flushPendingDiff()
		// remove marks between head and the mark

		const pageId = this.getCurrentPageId()
		const stacks = this.stacks.get()
		let pageStacks = stacks.get(pageId) || {
			undos: stack<TLHistoryEntry<R>>(),
			redos: stack<TLHistoryEntry<R>>(),
		}
		let top = pageStacks.undos
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

		const newStacks = new Map(stacks)
		newStacks.set(pageId, {
			undos: top.push({
				type: 'diff',
				diff,
			}),
			redos: pageStacks.redos,
		})
		this.stacks.set(newStacks)

		return this
	}

	/** @internal */
	_mark(id: string) {
		transact(() => {
			this.flushPendingDiff()
			this.stacks.update((stacks) => {
				const pageId = this.getCurrentPageId()
				const pageStacks = stacks.get(pageId) || {
					undos: stack<TLHistoryEntry<R>>(),
					redos: stack<TLHistoryEntry<R>>(),
				}
				const newStacks = new Map(stacks)
				newStacks.set(pageId, {
					undos: pageStacks.undos.push({ type: 'stop', id }),
					redos: pageStacks.redos,
				})
				return newStacks
			})
		})
	}

	clear() {
		const pageId = this.getCurrentPageId()
		this.stacks.update((stacks) => {
			const newStacks = new Map(stacks)
			newStacks.set(pageId, {
				undos: stack<TLHistoryEntry<R>>(),
				redos: stack<TLHistoryEntry<R>>(),
			})
			return newStacks
		})
		this.pendingDiffs.update((pendingDiffs) => {
			const newPendingDiffs = new Map(pendingDiffs)
			newPendingDiffs.set(pageId, new PendingDiff<R>())
			return newPendingDiffs
		})
	}

	/** @internal */
	getMarkIdMatching(idSubstring: string) {
		const pageStacks = this.getCurrentPageStacks()
		let top = pageStacks.undos
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
		// Flush all pending diffs for debugging purposes
		const pendingDiffs = this.pendingDiffs.get()
		for (const [pageId, pendingDiff] of pendingDiffs) {
			if (pendingDiff && !pendingDiff.isEmpty()) {
				this.flushPendingDiffToPage(pageId)
			}
		}

		const stacks = this.stacks.get()
		const currentPageId = this.getCurrentPageId()
		const currentPageStacks = stacks.get(currentPageId) || {
			undos: stack<TLHistoryEntry<R>>(),
			redos: stack<TLHistoryEntry<R>>(),
		}

		// For backward compatibility, if using the global page, return the old format
		if (currentPageId === 'page:global') {
			const currentPendingDiff = this.pendingDiffs.get().get(currentPageId)
			return {
				undos: currentPageStacks.undos.toArray(),
				redos: currentPageStacks.redos.toArray(),
				pendingDiff: currentPendingDiff?.debug() ?? { diff: {}, isEmpty: true },
				state: this.state as string,
			}
		}

		// For per-page usage, return the new format
		const allPages = Array.from(stacks.entries()).map(([pageId, pageStacks]) => ({
			pageId,
			undos: pageStacks.undos.toArray(),
			redos: pageStacks.redos.toArray(),
		}))
		const currentPendingDiff = this.pendingDiffs.get().get(currentPageId)
		return {
			currentPageId,
			currentPage: {
				undos: currentPageStacks.undos.toArray(),
				redos: currentPageStacks.redos.toArray(),
			},
			allPages,
			pendingDiff: currentPendingDiff?.debug() ?? { diff: {}, isEmpty: true },
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

	isEmpty() {
		return this.isEmptyAtom.get()
	}

	apply(diff: RecordsDiff<R>) {
		squashRecordDiffsMutable(this.diff, [diff])
		this.isEmptyAtom.set(isRecordsDiffEmpty(this.diff))
	}

	isEqual(other: PendingDiff<R>) {
		// Compare the diff objects - this is a simple comparison
		return this.isEmpty() === other.isEmpty() && JSON.stringify(this.diff) === JSON.stringify(other.diff)
	}

	debug() {
		return { diff: this.diff, isEmpty: this.isEmpty() }
	}
}

import { EMPTY_ARRAY } from '@tldraw/state'

export type Stack<T> = StackItem<T> | EmptyStackItem<T>

export function stack<T>(items?: Array<T>): Stack<T> {
	if (items) {
		let result = EMPTY_STACK_ITEM as Stack<T>
		while (items.length) {
			result = result.push(items.pop()!)
		}
		return result
	}
	return EMPTY_STACK_ITEM as any
}

class EmptyStackItem<T> implements Iterable<T> {
	readonly length = 0
	readonly head = null
	readonly tail: Stack<T> = this

	push(head: T): Stack<T> {
		return new StackItem<T>(head, this)
	}

	toArray() {
		return EMPTY_ARRAY
	}

	[Symbol.iterator]() {
		return {
			next() {
				return { value: undefined, done: true as const }
			},
		}
	}
}

const EMPTY_STACK_ITEM = new EmptyStackItem()

class StackItem<T> implements Iterable<T> {
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

	toArray() {
		return Array.from(this)
	}

	[Symbol.iterator]() {
		let stack = this as Stack<T>
		return {
			next() {
				if (stack.length) {
					const value = stack.head!
					stack = stack.tail
					return { value, done: false as const }
				} else {
					return { value: undefined, done: true as const }
				}
			},
		}
	}
}
