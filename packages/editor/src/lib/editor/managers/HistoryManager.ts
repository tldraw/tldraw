import { atom, transact } from '@tldraw/state'
import { devFreeze } from '@tldraw/store'
import { warnDeprecatedGetter } from '@tldraw/utils'
import { uniqueId } from '../../utils/uniqueId'
import { TLCommandHandler, TLCommandHistoryOptions, TLHistoryEntry } from '../types/history-types'
import { Stack, stack } from './Stack'

type CommandFn<Data> = (...args: any[]) =>
	| ({
			data: Data
	  } & TLCommandHistoryOptions)
	| null
	| undefined
	| void

type ExtractData<Fn> = Fn extends CommandFn<infer Data> ? Data : never
type ExtractArgs<Fn> = Parameters<Extract<Fn, (...args: any[]) => any>>

export class HistoryManager<
	CTX extends {
		emit: (name: 'change-history' | 'mark-history', ...args: any) => void
	}
> {
	_undos = atom<Stack<TLHistoryEntry>>('HistoryManager.undos', stack()) // Updated by each action that includes and undo
	_redos = atom<Stack<TLHistoryEntry>>('HistoryManager.redos', stack()) // Updated when a user undoes
	_batchDepth = 0 // A flag for whether the user is in a batch operation

	constructor(
		private readonly ctx: CTX,
		private readonly annotateError: (error: unknown) => void
	) {}

	onBatchComplete: () => void = () => void null

	private _commands: Record<string, TLCommandHandler<any>> = {}

	getNumUndos() {
		return this._undos.get().length
	}
	/**
	 * @deprecated use `getNumUndos` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get numUndos() {
		warnDeprecatedGetter('numUndos')
		return this.getNumUndos()
	}

	getNumRedos() {
		return this._redos.get().length
	}
	/**
	 * @deprecated use `getNumRedos` instead
	 */
	// eslint-disable-next-line no-restricted-syntax
	get numRedos() {
		warnDeprecatedGetter('numRedos')
		return this.getNumRedos()
	}

	createCommand = <Name extends string, Constructor extends CommandFn<any>>(
		name: Name,
		constructor: Constructor,
		handle: TLCommandHandler<ExtractData<Constructor>>
	) => {
		if (this._commands[name]) {
			throw new Error(`Duplicate command: ${name}`)
		}
		this._commands[name] = handle

		const exec = (...args: ExtractArgs<Constructor>) => {
			if (!this._batchDepth) {
				// If we're not batching, run again in a batch
				this.batch(() => exec(...args))
				return this.ctx
			}

			const result = constructor(...args)

			if (!result) {
				return this.ctx
			}

			const { data, ephemeral, squashing, preservesRedoStack } = result

			this.ignoringUpdates((undos, redos) => {
				handle.do(data)
				return { undos, redos }
			})

			if (!ephemeral) {
				const prev = this._undos.get().head
				if (
					squashing &&
					prev &&
					prev.type === 'command' &&
					prev.name === name &&
					prev.preservesRedoStack === preservesRedoStack
				) {
					// replace the last command with a squashed version
					this._undos.update((undos) =>
						undos.tail.push({
							...prev,
							id: uniqueId(),
							data: devFreeze(handle.squash!(prev.data, data)),
						})
					)
				} else {
					// add to the undo stack
					this._undos.update((undos) =>
						undos.push({
							type: 'command',
							name,
							data: devFreeze(data),
							id: uniqueId(),
							preservesRedoStack: preservesRedoStack,
						})
					)
				}

				if (!result.preservesRedoStack) {
					this._redos.set(stack())
				}

				this.ctx.emit('change-history', { reason: 'push' })
			}

			return this.ctx
		}

		return exec
	}

	batch = (fn: () => void) => {
		try {
			this._batchDepth++
			if (this._batchDepth === 1) {
				transact(() => {
					const mostRecentActionId = this._undos.get().head?.id
					fn()
					if (mostRecentActionId !== this._undos.get().head?.id) {
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
			undos: Stack<TLHistoryEntry>,
			redos: Stack<TLHistoryEntry>
		) => { undos: Stack<TLHistoryEntry>; redos: Stack<TLHistoryEntry> }
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
					const handler = this._commands[command.name]
					handler.undo(command.data)
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
					const handler = this._commands[command.name]
					if (handler.redo) {
						handler.redo(command.data)
					} else {
						handler.do(command.data)
					}
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
