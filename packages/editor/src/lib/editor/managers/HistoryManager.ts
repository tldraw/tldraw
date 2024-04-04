import { atom, transact } from '@tldraw/state'
import {
	RecordsDiff,
	Store,
	UnknownRecord,
	devFreeze,
	reverseRecordsDiff,
	squashRecordDiffs,
} from '@tldraw/store'
import { TLRecord } from '@tldraw/tlschema'
import { uniqueId } from '../../utils/uniqueId'
import { TLCommandHistoryOptions, TLHistoryEntry } from '../types/history-types'
import { Stack, stack } from './Stack'

type CommandFn = (...args: any[]) => TLCommandHistoryOptions | void

export class HistoryManager<
	R extends UnknownRecord,
	CTX extends {
		store: Store<R>
		emit: (name: 'change-history' | 'mark-history', ...args: any) => void
	},
> {
	_undos = atom<Stack<TLHistoryEntry<R>>>('HistoryManager.undos', stack()) // Updated by each action that includes and undo
	_redos = atom<Stack<TLHistoryEntry<R>>>('HistoryManager.redos', stack()) // Updated when a user undoes
	_batchDepth = 0 // A flag for whether the user is in a batch operation

	constructor(
		private readonly ctx: CTX,
		private readonly annotateError: (error: unknown) => void
	) {}

	onBatchComplete: () => void = () => void null

	private knownCommands = new Set<string>()

	getNumUndos() {
		return this._undos.get().length
	}
	getNumRedos() {
		return this._redos.get().length
	}
	createCommand = <Name extends string, Fn extends CommandFn>(name: Name, runCommand: Fn) => {
		if (this.knownCommands.has(name)) {
			throw new Error(`Duplicate command: ${name}`)
		}
		this.knownCommands.add(name)

		const exec = (...args: Parameters<Fn>): CTX => {
			if (!this._batchDepth) {
				// If we're not batching, run again in a batch
				this.batch(() => exec(...args))
				return this.ctx
			}

			let diff!: RecordsDiff<R>
			let options!: TLCommandHistoryOptions | void
			this.ignoringUpdates((undos, redos) => {
				diff = this.ctx.store!.extractingChanges(() => {
					options = runCommand(...args)
				})
				return { undos, redos }
			})

			// if nothing happend, we don't need to record a history entry:
			if (isDiffEmpty(diff)) return this.ctx

			const ephemeral = options?.ephemeral
			const preservesRedoStack = options?.preservesRedoStack

			if (!ephemeral) {
				const prev = this._undos.get().head
				if (
					prev &&
					prev.type === 'command' &&
					prev.name === name &&
					prev.preservesRedoStack === preservesRedoStack
				) {
					// replace the last command with a squashed version
					this._undos.update((undos) =>
						undos.tail.push({
							...prev,
							diff: devFreeze(squashRecordDiffs([prev.diff, diff])),
						})
					)
				} else {
					// add to the undo stack
					this._undos.update((undos) =>
						undos.push({
							type: 'command',
							name,
							diff: devFreeze(diff),
							preservesRedoStack: preservesRedoStack,
						})
					)
				}

				if (!preservesRedoStack) {
					this._redos.set(stack())
				}

				this.ctx.emit('change-history', { reason: 'push' })
			}

			return this.ctx
		}

		return exec
	}

	createCommand2 = this.createCommand

	batch = (fn: () => void) => {
		try {
			this._batchDepth++
			if (this._batchDepth === 1) {
				transact(() => {
					const mostRecentAction = this._undos.get().head
					fn()
					if (mostRecentAction !== this._undos.get().head) {
						this.onBatchComplete()
					}
				})
			} else {
				fn()
			}
		} catch (error) {
			this.annotateError(error)
			throw error
		} finally {
			this._batchDepth--
		}

		return this
	}

	private ignoringUpdates = (
		fn: (
			undos: Stack<TLHistoryEntry<R>>,
			redos: Stack<TLHistoryEntry<R>>
		) => { undos: Stack<TLHistoryEntry<R>>; redos: Stack<TLHistoryEntry<R>> }
	) => {
		let undos = this._undos.get()
		let redos = this._redos.get()

		this._undos.set(stack())
		this._redos.set(stack())
		try {
			;({ undos, redos } = transact(() => fn(undos, redos)))
		} finally {
			this._undos.set(undos)
			this._redos.set(redos)
		}
	}

	// History
	private _undo = ({
		pushToRedoStack,
		toMark = undefined,
	}: {
		pushToRedoStack: boolean
		toMark?: string
	}) => {
		this.ignoringUpdates((undos, redos) => {
			if (undos.length === 0) {
				return { undos, redos }
			}

			while (undos.head?.type === 'STOP') {
				const mark = undos.head
				undos = undos.tail
				if (pushToRedoStack) {
					redos = redos.push(mark)
				}
				if (mark.id === toMark) {
					this.ctx.emit(
						'change-history',
						pushToRedoStack ? { reason: 'undo' } : { reason: 'bail', markId: toMark }
					)
					return { undos, redos }
				}
			}

			if (undos.length === 0) {
				this.ctx.emit(
					'change-history',
					pushToRedoStack ? { reason: 'undo' } : { reason: 'bail', markId: toMark }
				)
				return { undos, redos }
			}

			while (undos.head) {
				const command = undos.head
				undos = undos.tail

				if (pushToRedoStack) {
					redos = redos.push(command)
				}

				if (command.type === 'STOP') {
					if (command.onUndo && (!toMark || command.id === toMark)) {
						this.ctx.emit(
							'change-history',
							pushToRedoStack ? { reason: 'undo' } : { reason: 'bail', markId: toMark }
						)
						return { undos, redos }
					}
				} else {
					this.ctx.store.applyDiff(reverseRecordsDiff(command.diff))
				}
			}

			this.ctx.emit(
				'change-history',
				pushToRedoStack ? { reason: 'undo' } : { reason: 'bail', markId: toMark }
			)
			return { undos, redos }
		})

		return this
	}

	undo = () => {
		this._undo({ pushToRedoStack: true })

		return this
	}

	redo = () => {
		this.ignoringUpdates((undos, redos) => {
			if (redos.length === 0) {
				return { undos, redos }
			}

			while (redos.head?.type === 'STOP') {
				undos = undos.push(redos.head)
				redos = redos.tail
			}

			if (redos.length === 0) {
				this.ctx.emit('change-history', { reason: 'redo' })
				return { undos, redos }
			}

			while (redos.head) {
				const command = redos.head
				undos = undos.push(redos.head)
				redos = redos.tail

				if (command.type === 'STOP') {
					if (command.onRedo) {
						break
					}
				} else {
					this.ctx.store.applyDiff(command.diff)
				}
			}

			this.ctx.emit('change-history', { reason: 'redo' })
			return { undos, redos }
		})

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

	mark = (id = uniqueId(), onUndo = true, onRedo = true) => {
		const mostRecent = this._undos.get().head
		// dedupe marks, why not
		if (mostRecent && mostRecent.type === 'STOP') {
			if (mostRecent.id === id && mostRecent.onUndo === onUndo && mostRecent.onRedo === onRedo) {
				return mostRecent.id
			}
		}

		this._undos.update((undos) => undos.push({ type: 'STOP', id, onUndo, onRedo }))

		this.ctx.emit('mark-history', { id })

		return id
	}

	clear() {
		this._undos.set(stack())
		this._redos.set(stack())
	}
}

function isDiffEmpty(diff: RecordsDiff<TLRecord>) {
	return (
		Object.keys(diff.added).length === 0 &&
		Object.keys(diff.updated).length === 0 &&
		Object.keys(diff.removed).length === 0
	)
}
