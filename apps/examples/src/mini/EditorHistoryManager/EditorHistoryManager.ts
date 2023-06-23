import { atom, transact } from '@tldraw/state'
import { devFreeze } from '@tldraw/store'
import { uniqueId } from '@tldraw/tldraw'
import { Editor } from '../Editor'
import { EditorExtension } from '../EditorExtension'
import { Stack, stack } from './Stack'
import {
	CommandFn,
	EditorCommandHandler,
	EditorHistoryEntry,
	ExtractArgs,
	ExtractData,
} from './history-types'

export class EditorHistoryManager<E extends readonly EditorExtension[]> {
	_undos = atom<Stack<EditorHistoryEntry>>('HistoryManager.undos', stack()) // Updated by each action that includes and undo
	_redos = atom<Stack<EditorHistoryEntry>>('HistoryManager.redos', stack()) // Updated when a user undoes
	_batchDepth = 0 // A flag for whether the user is in a batch operation

	constructor(
		private readonly editor: Editor<E>,
		private readonly onBatchComplete: () => void,
		private readonly annotateError: (error: unknown) => void
	) {}

	get numUndos() {
		return this._undos.value.length
	}

	get numRedos() {
		return this._redos.value.length
	}

	private _commands: Record<string, EditorCommandHandler<any>> = {}

	createCommand = <Name extends string, Constructor extends CommandFn<any>>(
		name: Name,
		constructor: Constructor,
		handle: EditorCommandHandler<ExtractData<Constructor>>
	) => {
		// if (this._commands[name]) {
		// 	throw new Error(`Duplicate command: ${name}`)
		// }
		// this._commands[name] = handle

		const exec = (...args: ExtractArgs<Constructor>) => {
			if (!this._batchDepth) {
				// If we're not batching, run again in a batch
				this.batch(() => exec(...args))
				return this.editor
			}

			const result = constructor(...args)

			if (!result) {
				return this.editor
			}

			const { data, ephemeral, squashing, preservesRedoStack } = result

			this.ignoringUpdates((undos, redos) => {
				handle.do(data)
				return { undos, redos }
			})

			if (!ephemeral) {
				const prev = this._undos.value.head
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

				this.editor.emit('change-history', { editor: this.editor, reason: 'push' })
			}

			return this.editor
		}

		return exec
	}

	batch = (fn: () => void) => {
		try {
			this._batchDepth++
			if (this._batchDepth === 1) {
				transact(() => {
					const mostRecentActionId = this._undos.value.head?.id
					fn()
					if (mostRecentActionId !== this._undos.value.head?.id) {
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
			undos: Stack<EditorHistoryEntry>,
			redos: Stack<EditorHistoryEntry>
		) => { undos: Stack<EditorHistoryEntry>; redos: Stack<EditorHistoryEntry> }
	) => {
		let undos = this._undos.value
		let redos = this._redos.value

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
					this.editor.emit(
						'change-history',
						pushToRedoStack
							? { editor: this.editor, reason: 'undo' }
							: { editor: this.editor, reason: 'bail', markId: toMark }
					)
					return { undos, redos }
				}
			}

			if (undos.length === 0) {
				this.editor.emit(
					'change-history',
					pushToRedoStack
						? { editor: this.editor, reason: 'undo' }
						: { editor: this.editor, reason: 'bail', markId: toMark }
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
						this.editor.emit(
							'change-history',
							pushToRedoStack
								? { editor: this.editor, reason: 'undo' }
								: { editor: this.editor, reason: 'bail', markId: toMark }
						)
						return { undos, redos }
					}
				} else {
					const handler = this._commands[command.name]
					handler.undo(command.data)
				}
			}

			this.editor.emit(
				'change-history',
				pushToRedoStack
					? { editor: this.editor, reason: 'undo' }
					: { editor: this.editor, reason: 'bail', markId: toMark }
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
				this.editor.emit('change-history', { editor: this.editor, reason: 'redo' })
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

			this.editor.emit('change-history', { editor: this.editor, reason: 'redo' })
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
		const mostRecent = this._undos.value.head
		// dedupe marks, why not
		if (mostRecent && mostRecent.type === 'STOP') {
			if (mostRecent.id === id && mostRecent.onUndo === onUndo && mostRecent.onRedo === onRedo) {
				return mostRecent.id
			}
		}

		this._undos.update((undos) => undos.push({ type: 'STOP', id, onUndo, onRedo }))

		this.editor.emit('mark-history', { editor: this.editor, id })

		return id
	}

	clear() {
		this._undos.set(stack())
		this._redos.set(stack())
	}
}
