import { useCallback, useMemo, useRef } from 'react'
import {
	Box,
	Editor,
	exhaustiveSwitchError,
	TLShapeId,
	TLShapePartial,
	uniqueId,
	useMaybeEditor,
} from 'tldraw'
import { TldrawAiModule, TldrawAiModuleOptions } from './TldrawAiModule'
import { TLAiChange, TLAiPrompt, TLAiSerializedPrompt, TLAiStreamingChange } from './types'

/** @public */
export interface TldrawAi {
	prompt(message: TldrawAiPromptOptions): { promise: Promise<void>; cancel(): void }
	repeat(): { promise: Promise<void>; cancel: (() => void) | null }
	cancel(): void
	lockViewport(editor: Editor): void
	unlockViewport(): void
}

/**
 * The function signature for generating changes from an AI prompt.
 * @public
 */
export type TldrawAiGenerateFn = (opts: {
	editor: Editor
	prompt: TLAiSerializedPrompt
	signal: AbortSignal
}) => Promise<TLAiChange[]>

/**
 * The function signature for streaming changes from an AI prompt.
 * @public
 */
export type TldrawAiStreamFn = (opts: {
	editor: Editor
	prompt: TLAiSerializedPrompt
	signal: AbortSignal
}) => AsyncGenerator<TLAiStreamingChange>

/**
 * The function signature for applying changes to the editor.
 * @public
 */
export type TldrawAiApplyFn = (opts: { change: TLAiStreamingChange; editor: Editor }) => void

/** @public */
export interface TldrawAiOptions extends Omit<TldrawAiModuleOptions, 'editor'> {
	editor?: Editor
	generate?: TldrawAiGenerateFn
	stream?: TldrawAiStreamFn
	apply?: TldrawAiApplyFn
}

/** @public */
export type TldrawAiPromptOptions =
	| string
	| (Partial<TLAiPrompt> & { stream?: boolean; message: string })

/** @public */
export function useTldrawAi(opts: TldrawAiOptions): TldrawAi {
	const {
		editor: _editor,
		generate: generateFn,
		stream: streamFn,
		transforms,
		apply: applyFn = defaultApplyChange,
	} = opts

	// If the editor is provided as a prop, use that. Otherwise, use the editor in react context and throw if not present.
	const maybeEditor = useMaybeEditor()

	const editor = _editor ?? maybeEditor
	if (!editor) {
		throw new Error(
			'useTldrawAi must be used inside of the <Tldraw /> or <TldrawEditor /> components, or else you must pass an editor prop.'
		)
	}

	const ai = useMemo(() => new TldrawAiModule({ editor, transforms }), [editor, transforms])

	const rCancelFunction = useRef<(() => void) | null>(null)
	const rPreviousArguments = useRef<TldrawAiPromptOptions>('')
	const rPreviousChanges = useRef<TLAiStreamingChange[]>([])
	const rLockedViewportBounds = useRef<{ promptBounds: Box; contextBounds: Box } | null>(null)

	const lockViewport = useCallback((editor: Editor, bounds?: Box) => {
		rLockedViewportBounds.current = {
			promptBounds: bounds ?? editor.getViewportPageBounds(),
			contextBounds: bounds ?? editor.getViewportPageBounds(),
		}
	}, [])

	const unlockViewport = useCallback(() => {
		rLockedViewportBounds.current = null
	}, [])

	/**
	 * Prompt the AI for a response. If the stream flag is set to true, the call will stream changes as they are ready.
	 *
	 * @param message - The message to prompt the AI with OR an object with the message and stream flag.
	 *
	 * @returns An object with a promise that will resolve when all changes have been applied and a cancel function to abort the work.
	 */
	const prompt = useCallback(
		(message: TldrawAiPromptOptions) => {
			let cancelled = false
			const controller = new AbortController()
			const signal = controller.signal

			// Pull out options, keeping in mind that the argument may be just a string
			const opts = typeof message === 'string' ? { message } : message
			const { stream = false, meta = {} } = opts

			const markId = 'generating_' + uniqueId()

			const promise = new Promise<void>((resolve, reject) => {
				if (!ai) {
					reject()
					return
				}

				const messageWithBounds = typeof message === 'string' ? { message } : { ...message }
				if (rLockedViewportBounds.current) {
					if (typeof messageWithBounds === 'object') {
						messageWithBounds.promptBounds = rLockedViewportBounds.current.promptBounds
						messageWithBounds.contextBounds = rLockedViewportBounds.current.contextBounds
					}
				}

				ai.generate(messageWithBounds).then(async ({ handleChange, prompt }) => {
					const serializedPrompt: TLAiSerializedPrompt = {
						...prompt,
						meta,
						promptBounds: prompt.promptBounds.toJson(),
						contextBounds: prompt.contextBounds.toJson(),
					}

					const pendingChanges: TLAiStreamingChange[] = []

					if (stream) {
						if (!streamFn) {
							throw Error(
								`Stream function not found. You should pass a generate method in your call to the useTldrawAi hook.`
							)
						}
						// Handle a stream of changes
						// todo: consider history while streaming... we could keep track of all of the changes that were made, apply them as they come in; and then once completed, revert those changes, make a history entry, and then reapply them all

						editor.markHistoryStoppingPoint(markId)
						for await (const change of streamFn({
							editor,
							prompt: serializedPrompt,
							signal,
						})) {
							if (!cancelled) {
								try {
									editor.run(
										() => {
											handleChange(change, applyFn)
										},
										{
											ignoreShapeLock: false, // ? should this be true?
											history: 'record', // ? should this be 'ignore'?
										}
									)
									pendingChanges.push(change)
								} catch (e) {
									// If we encounter an error, revert previous changes and throw the error
									editor.bailToMark(markId)
									throw e
								}
							}
						}
					} else {
						if (!generateFn) {
							throw Error(
								`Generate function not found. You should pass a generate method in your call to the useTldrawAi hook.`
							)
						}
						// Handle a one-off generation
						const changes = await generateFn({ editor, prompt: serializedPrompt, signal }).catch(
							(error) => {
								if (error.name === 'AbortError') {
									console.error('Cancelled')
								} else {
									console.error('Fetch error:', error)
								}
							}
						)

						if (changes && !cancelled) {
							// todo: consider history while generating. Is this configurable? Can we guarantee that these changes won't interrupt the user's changes?
							editor.markHistoryStoppingPoint(markId)
							try {
								editor.run(
									() => {
										for (const change of changes) {
											pendingChanges.push(change)
											handleChange(change, applyFn)
										}
									},
									{
										ignoreShapeLock: false, // ? should this be true?
										history: 'record', // ? should this be 'ignore'?
									}
								)
							} catch (e) {
								// If we encounter an error, revert previous changes and throw the error
								editor.bailToMark(markId)
								throw e
							}
						}
					}

					// If successful, save the previous options / response
					rPreviousArguments.current = opts
					rPreviousChanges.current = pendingChanges

					rCancelFunction.current = null
					resolve()
				})
			})

			rCancelFunction.current = () => {
				cancelled = true
				controller.abort('Cancelled by user')
				editor.bailToMark(markId) // ? should we bail on cancels or preserve the generated items so far?
				rCancelFunction.current = null
			}

			return {
				// the promise that will resolve the changes
				promise,
				// a helper to cancel the request
				cancel: rCancelFunction.current,
			}
		},
		[ai, editor, generateFn, streamFn, applyFn]
	)

	/**
	 * Repeat the previous prompt and changes.
	 *
	 * This is useful for when you want to re-run the same prompt and changes
	 * without having to re-generate the prompt. Mainly used for debugging.
	 *
	 * @returns A promise that resolves when all changes have been applied.
	 */
	const repeat = useCallback(() => {
		async function runChanges() {
			if (!editor) throw Error('tldraw editor not found')
			if (!ai) throw Error('tldraw AI instance not found')

			// Repeat the previous arguments and changes
			const prevOpts = rPreviousArguments.current
			const { handleChange } = await ai.generate(prevOpts)
			editor.run(
				() => {
					for (const change of rPreviousChanges.current) {
						handleChange(change, applyFn)
					}
				},
				{
					ignoreShapeLock: false, // should this be true?
					history: 'record', // should this be 'ignore'?
				}
			)

			rCancelFunction.current = null
			return
		}

		const promise = new Promise<void>((resolve, reject) => {
			try {
				runChanges().then(() => {
					resolve()
				})
			} catch (e) {
				// If we encounter an error, revert previous changes and throw the error
				reject(e)
			}
		})

		return {
			promise,
			cancel: rCancelFunction.current,
		}
	}, [ai, editor, applyFn])

	const cancel = useCallback(() => {
		rCancelFunction.current?.()
	}, [])

	return { prompt, repeat, cancel, lockViewport, unlockViewport }
}

/**
 * The default apply function for the AI module.
 *
 * @param change - The change to apply
 * @param editor - The editor to apply the change to
 *
 * @public
 */
export function defaultApplyChange({
	change,
	editor,
}: {
	change: TLAiStreamingChange
	editor: Editor
}) {
	if (editor.isDisposed) return
	if (!change.complete) return

	try {
		switch (change.type) {
			case 'createShape': {
				editor.createShape(change.shape as TLShapePartial)
				break
			}
			case 'updateShape': {
				editor.updateShape(change.shape as TLShapePartial)
				break
			}
			case 'deleteShape': {
				editor.deleteShape(change.shapeId as TLShapeId)
				break
			}
			case 'createBinding': {
				editor.createBinding(change.binding)
				break
			}
			case 'updateBinding': {
				editor.updateBinding(change.binding)
				break
			}
			case 'deleteBinding': {
				editor.deleteBinding(change.bindingId)
				break
			}
			case 'custom': {
				break
			}
			default:
				exhaustiveSwitchError(change)
		}
	} catch (e) {
		console.error('Error handling change:', e)
	}
}
