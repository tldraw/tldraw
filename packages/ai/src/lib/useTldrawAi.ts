import { useCallback, useMemo, useRef } from 'react'
import { Editor, uniqueId, useMaybeEditor } from 'tldraw'
import { defaultApplyChange } from './defaultApplyChange'
import { TldrawAiModule, TldrawAiModuleOptions } from './TldrawAiModule'
import { TLAiChange, TLAiPrompt, TLAiSerializedPrompt } from './types'

/**
 * An object that contains methods for interacting with the tldraw AI module.
 *
 * @public
 */
export interface TldrawAi {
	/**
	 * Prompt the AI for a response. If the stream flag is set to true, the call will stream changes as they are ready.
	 *
	 * @param message - The message to prompt the AI with OR an object with the message and stream flag.
	 *
	 * @returns An object with a promise that will resolve when all changes have been applied and a cancel function to abort the work.
	 *
	 * @public
	 */
	prompt(options: TldrawAiPromptOptions): { promise: Promise<void>; cancel(): void }

	/**
	 * Cancel the current request.
	 *
	 * @public
	 */
	cancel(): void

	/**
	 * Repeat the previous prompt and changes.
	 *
	 * This is useful for when you want to re-run the same prompt and changes
	 * without having to re-generate the prompt. Mainly used for debugging.
	 *
	 * @returns A promise that resolves when all changes have been applied.
	 *
	 * @public
	 */
	repeat(): { promise: Promise<void>; cancel: (() => void) | null }
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
}) => AsyncGenerator<TLAiChange>

/**
 * The function signature for applying changes to the editor.
 * @public
 */
export type TldrawAiApplyFn = (opts: { change: TLAiChange; editor: Editor }) => void

/** @public */
export interface TldrawAiOptions extends Omit<TldrawAiModuleOptions, 'editor'> {
	editor?: Editor
	generate?: TldrawAiGenerateFn
	stream?: TldrawAiStreamFn
	apply?: TldrawAiApplyFn
}

/** @public */
export type TldrawAiPromptOptions = string | (Partial<TLAiPrompt> & { stream?: boolean })

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
	const rPreviousChanges = useRef<TLAiChange[]>([])

	const prompt = useCallback(
		(options: TldrawAiPromptOptions) => {
			let cancelled = false
			const controller = new AbortController()
			const signal = controller.signal

			// Pull out options, keeping in mind that the argument may be just a string
			const opts = typeof options === 'string' ? { message: options } : options
			const { stream = false, meta = {} } = opts

			const markId = 'generating_' + uniqueId()

			const promise = new Promise<void>((resolve, reject) => {
				if (!ai) {
					reject()
					return
				}

				ai.generate(opts)
					.then(async ({ handleChange, prompt }) => {
						const serializedPrompt: TLAiSerializedPrompt = {
							...prompt,
							meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined,
							promptBounds: prompt.promptBounds.toJson(),
							contextBounds: prompt.contextBounds.toJson(),
						}

						const pendingChanges: TLAiChange[] = []

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
					.catch((e) => {
						editor.bailToMark(markId)
						reject(e)
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

	return { prompt, repeat, cancel }
}
