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
import { TLHistoryBatchOptions, TLHistoryDiff, TLHistoryEntry } from '../../types/history-types'

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
		const stopIntercepting = this.store.addHistoryInterceptor((entry, source) => {
			if (source !== 'user') return
			if (this.state !== HistoryRecorderState.Paused) this.keepForRefusal()

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
		const stopSettling = this.store.onCheckedOperationSettled((outcome) => {
			const kept = this.keptForRefusal
			this.keptForRefusal = null
			// an aborted operation's transaction rolled the stacks back already, but not the pending
			// diff, which isn't an atom
			if (outcome !== 'accepted' && kept) {
				this.stacks.set(kept.stacks)
				this.pendingDiff.restore(kept.pendingDiff)
			}
		})
		this.dispose = () => {
			stopIntercepting()
			stopSettling()
		}
	}

	// History as it was when the checked operation in progress first touched it. A refused or
	// aborted operation leaves no trace in history, so this is put back: a redo stack the edit
	// cleared, the steps an undo or bail inside an outer operation moved.
	private keptForRefusal: {
		stacks: { undos: Stack<TLHistoryEntry<R>>; redos: Stack<TLHistoryEntry<R>> }
		pendingDiff: RecordsDiff<R>
	} | null = null

	private keepForRefusal() {
		if (this.keptForRefusal || !this.store.isInCheckedOperation()) return
		this.keptForRefusal = { stacks: this.stacks.get(), pendingDiff: this.pendingDiff.copy() }
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
	 * that never happened. With `changes` (the refused change as the user made it) only the refused
	 * fields are taken out of that chain of steps: from the newest step that wrote the user's
	 * version back to the server's version; a step left empty is removed. Newer steps on those records (pushes still pending)
	 * are kept, rebased to start from where the chain started. With ids alone, every step on those
	 * records is dropped. Redo steps on those records are always dropped.
	 *
	 * @internal
	 */
	removeRefused(refusal: { ids?: readonly string[]; changes?: RecordsDiff<R> }) {
		this.keepForRefusal()
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
	_undo(opts: { pushToRedoStack: boolean; toMark?: string }) {
		// an undo is judged like any other change; refused, it leaves history where it was
		this.store.checkAsOneOperation(() => this._undoUnchecked(opts))
		return this
	}

	private _undoUnchecked({
		pushToRedoStack,
		toMark = undefined,
	}: {
		pushToRedoStack: boolean
		toMark?: string
	}) {
		this.keepForRefusal()
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
		this.store.checkAsOneOperation(() => this._redoUnchecked())
		return this
	}

	private _redoUnchecked() {
		this.keepForRefusal()
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
		this.keepForRefusal()
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
		this.keepForRefusal()
		transact(() => {
			this.flushPendingDiff()
			this.stacks.update(({ undos, redos }) => ({ undos: undos.push({ type: 'stop', id }), redos }))
		})
	}

	clear() {
		this.keepForRefusal()
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

	copy() {
		const diff = createEmptyRecordsDiff<R>()
		squashRecordDiffsMutable(diff, [this.diff])
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

	if (isEqual(user, server)) return
	// Steps of pushes still pending sit above the refused chain, so its head is the newest step
	// that wrote the refused values, not simply the newest step on the record.
	const refusedPaths = changedPaths(server, user)
	let head = -1
	let refusedState: RecordState<R> = undefined
	for (let i = 0; i < entries.length && head === -1; i++) {
		const states = getEntryStates(entries[i], id)
		if (
			states &&
			agreesOn(states[1], user, refusedPaths) &&
			!agreesOn(states[0], user, refusedPaths)
		) {
			head = i
			refusedState = states[1]
		}
	}
	if (head === -1) return

	const chain: number[] = []
	let current = refusedState
	for (let i = head; i < entries.length; i++) {
		const states = getEntryStates(entries[i], id)
		if (!states) continue
		// a step that doesn't continue the chain means the record moved on without us: leave it
		if (!isEqual(states[1], current)) break
		chain.push(i)
		current = states[0]
	}

	// Each refused field reaches back to the step that moved it off the server's value. A field
	// no step brings back (a peer changed it since) extends nothing, or accepted steps would go.
	const reach = new Map<string, number>()
	for (const path of refusedPaths) {
		const only = new Set([path])
		const k = chain.findIndex((i) => agreesOn(getEntryStates(entries[i], id)![0], server, only))
		if (k !== -1) reach.set(path, k)
	}

	// One step can hold several pushes: take out only the refused fields, so an accepted change
	// in the same step stays undoable. Oldest first, so splicing keeps newer indices valid.
	for (let k = chain.length - 1; k >= 0; k--) {
		const paths = new Set([...reach].filter(([, end]) => end >= k).map(([path]) => path))
		if (paths.size === 0) continue
		const i = chain[k]
		if (paths.has(EXISTS)) {
			setStepStates(entries, i, id, null)
			continue
		}
		const [before, after] = getEntryStates(entries[i], id)!
		const before2 = withValuesAt(before, server, paths)
		const after2 = withValuesAt(after, server, paths)
		setStepStates(entries, i, id, isEqual(before2, after2) ? null : [before2, after2])
	}

	// Newer steps still hold the refused values, and undo or redo would write them back: move
	// each refused field to the server's value until a newer step changes it.
	const refusedFields = new Set(reach.keys())
	for (let i = head - 1; i >= 0 && refusedFields.size > 0; i--) {
		const states = getEntryStates(entries[i], id)
		if (!states) continue
		// a refused create or delete leaves no version for newer steps to build on
		if (refusedFields.has(EXISTS)) {
			setStepStates(entries, i, id, null)
			continue
		}
		const [before, after] = states
		const before2 = withValuesAt(before, server, refusedFields)
		for (const path of refusedFields) {
			if (!isEqual(valueAt(after, path), valueAt(refusedState, path))) refusedFields.delete(path)
		}
		const after2 = withValuesAt(after, server, refusedFields)
		setStepStates(entries, i, id, isEqual(before2, after2) ? null : [before2, after2])
	}
}

function getEntryStates<R extends UnknownRecord>(entry: TLHistoryEntry<R>, id: string) {
	return entry.type === 'diff' ? getStepStates(entry.diff, id) : null
}

/** Replace a step's change to a record, or remove it with null; true if the entry was removed. */
function setStepStates<R extends UnknownRecord>(
	entries: TLHistoryEntry<R>[],
	i: number,
	id: string,
	states: [RecordState<R>, RecordState<R>] | null
) {
	const diff = withoutRecord((entries[i] as TLHistoryDiff<R>).diff, id)
	if (states) {
		const [before, after] = states
		if (before && after) diff.updated[id as R['id']] = [before, after]
		else if (after) diff.added[id as R['id']] = after
		else if (before) diff.removed[id as R['id']] = before
	}
	if (isRecordsDiffEmpty(diff)) {
		entries.splice(i, 1)
		return true
	}
	entries[i] = { type: 'diff', diff }
	return false
}

// The path for "the record exists"; every other path is dot-joined keys.
const EXISTS = ''

function changedPaths(a: unknown, b: unknown): Set<string> {
	const out = new Set<string>()
	if (a === undefined || b === undefined) {
		if (a !== b) out.add(EXISTS)
		return out
	}
	collectChangedPaths(a, b, '', out)
	return out
}

function collectChangedPaths(a: any, b: any, prefix: string, out: Set<string>) {
	for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
		if (isEqual(a[key], b[key])) continue
		if (isPlainObject(a[key]) && isPlainObject(b[key])) {
			collectChangedPaths(a[key], b[key], `${prefix}${key}.`, out)
		} else {
			out.add(prefix + key)
		}
	}
}

function agreesOn(a: unknown, b: unknown, paths: Set<string>) {
	for (const path of paths) {
		if (path === EXISTS) {
			if ((a === undefined) !== (b === undefined)) return false
		} else if (!isEqual(valueAt(a, path), valueAt(b, path))) {
			return false
		}
	}
	return true
}

function valueAt(record: unknown, path: string) {
	let value: any = record
	for (const key of path.split('.')) value = value?.[key]
	return value
}

/** A copy of `record` with `source`'s value at each path. */
function withValuesAt<R extends UnknownRecord>(
	record: RecordState<R>,
	source: RecordState<R>,
	paths: Set<string>
): RecordState<R> {
	if (!record || !source || paths.size === 0) return record
	const out: any = { ...record }
	for (const path of paths) {
		const keys = path.split('.')
		let target = out
		let from: any = source
		for (const key of keys.slice(0, -1)) {
			target[key] = { ...target[key] }
			target = target[key]
			from = from?.[key]
		}
		const last = keys[keys.length - 1]
		if (from && last in from) target[last] = from[last]
		else delete target[last]
	}
	return out
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
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
