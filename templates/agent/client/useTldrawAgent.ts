import { useCallback } from 'react'
import {
	Box,
	BoxModel,
	Editor,
	FileHelpers,
	structuredClone,
	TLBinding,
	TLShape,
	uniqueId,
} from 'tldraw'
import { TLAgentModelName } from '../worker/models'
import { RoundedCoordinates } from './transforms/RoundedCoordinates'
import { SimpleText } from './transforms/SimpleText'
import { TldrawAgentTransformConstructor } from './transforms/TldrawAgentTransform'
import { UniqueIds } from './transforms/UniqueIds'
import { ChatHistoryItem } from './types/ChatHistoryItem'
import { ContextItem } from './types/ContextItem'
import { ScheduledRequest } from './types/ScheduledRequest'
import { TLAgentChange } from './types/TLAgentChange'

export interface TldrawAgent {
	prompt(options: TLAgentPromptOptions): { promise: Promise<void>; cancel(): void }
}

export interface TLAgentPromptOptions {
	message: string
	contextBounds: BoxModel
	promptBounds: BoxModel
	meta: TLAgentPromptMeta
}

export interface TLAgentContent {
	shapes: TLShape[]
	bindings: TLBinding[]
}

export type TLAgentPrompt = TLAgentPromptOptions & {
	canvasContent: TLAgentContent
	image: string | undefined
}

export interface TLAgentPromptMeta {
	modelName: TLAgentModelName
	historyItems: ChatHistoryItem[]
	contextItems: ContextItem[]
	currentPageShapes: TLShape[]
	currentUserViewportBounds: BoxModel
	userSelectedShapes: TLShape[]
	type: ScheduledRequest['type']
}

export interface TldrawAgentOptions {
	editor: Editor
	transforms?: TldrawAgentTransformConstructor[]
}

export function useTldrawAgentExample(editor: Editor) {
	return useTldrawAgent({
		editor,
		transforms: [RoundedCoordinates, SimpleText, UniqueIds],
	})
}

/**
 * A hook that calls `useTldrawAi` with static options.
 *
 * @param editor - (optional) The editor instance to use. If not provided, the hook will try to use the editor from React context.
 */
export function useTldrawAgent(agentOptions: TldrawAgentOptions): TldrawAgent {
	const { editor, transforms: transformConstructors = [] } = agentOptions

	/**
	 * Get all the shapes and bindings from a given area in the current page.
	 *
	 * @param bounds - The bounds of the shapes and bindings to get.
	 *
	 * @returns An object containing the shapes and bindings.
	 */
	const getCanvasContent = useCallback(
		(bounds: BoxModel) => {
			const contentFromCurrentPage = editor.getContentFromCurrentPage(
				editor
					.getCurrentPageShapesSorted()
					.filter((s) => Box.From(bounds).includes(editor.getShapeMaskedPageBounds(s)!))
			)

			if (!contentFromCurrentPage) {
				return {
					shapes: [],
					bindings: [],
				}
			}

			return {
				shapes: structuredClone(contentFromCurrentPage.shapes),
				bindings: structuredClone(contentFromCurrentPage.bindings ?? []),
			}
		},
		[editor]
	)

	/**
	 * Get an image of the canvas content.
	 *
	 * @param shapes - The shapes to get the image of.
	 * @param bounds - The bounds of the image
	 *
	 * @returns The image data URL.
	 */
	const getScreenshot = useCallback(
		async (shapes: TLShape[], bounds: BoxModel) => {
			if (shapes.length === 0) return undefined
			const result = await editor.toImage(shapes, {
				format: 'jpeg',
				background: true,
				bounds: Box.From(bounds),
				padding: 0,
			})

			return await FileHelpers.blobToDataUrl(result.blob)
		},
		[editor]
	)

	/**
	 * Get a full prompt based on the provided prompt options, transformed by
	 * the specified transforms.
	 *
	 * @returns The fully transformed prompt, and a function to transform back
	 * the changes that come back from the agent.
	 */
	const preparePrompt = useCallback(
		async (promptOptions: TLAgentPromptOptions) => {
			const transforms = transformConstructors.map((v) => new v(editor))

			const canvasContent = getCanvasContent(promptOptions.contextBounds)
			const image = await getScreenshot(canvasContent.shapes, promptOptions.contextBounds)

			let prompt: TLAgentPrompt = {
				...promptOptions,
				canvasContent,
				image,
			}

			for (const transform of transforms) {
				if (transform.transformPrompt) {
					prompt = transform.transformPrompt(prompt)
				}
			}

			transforms.reverse()

			const transformChange = (change: TLAgentChange) => {
				for (const transform of transforms) {
					if (transform.transformChange) {
						change = transform.transformChange(change)
					}
				}
			}

			return {
				prompt,
				transformChange,
			}
		},
		[transformConstructors, editor, getCanvasContent, getScreenshot]
	)

	const stream = useCallback(async function* ({
		prompt: _prompt,
		signal: _signal,
	}: {
		prompt: TLAgentPrompt
		signal: AbortSignal
	}) {
		console.log('stream', _prompt)
		yield null
	}, [])

	const promptAgent = useCallback(
		(options: TLAgentPromptOptions) => {
			let cancelled = false
			const controller = new AbortController()
			const signal = controller.signal
			const markId = 'generating_' + uniqueId()

			const promise = new Promise<void>((resolve, reject) => {
				preparePrompt(options)
					.then(async ({ transformChange, prompt }) => {
						// Handle a stream of changes
						// todo: consider history while streaming... we could keep track of all of the changes that were made, apply them as they come in; and then once completed, revert those changes, make a history entry, and then reapply them all

						editor.markHistoryStoppingPoint(markId)
						for await (const change of stream({
							prompt,
							signal,
						})) {
							if (cancelled) break
							try {
								editor.run(
									() => {
										if (!change) return
										const _transformedChange = transformChange(change)
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

						resolve()
					})
					.catch((e) => {
						editor.bailToMark(markId)
						reject(e)
					})
			})

			const cancel = () => {
				cancelled = true
				controller.abort('Cancelled by user')
				editor.bailToMark(markId)
			}

			return {
				// the promise that will resolve the changes
				promise,
				// a helper to cancel the request
				cancel,
			}
		},
		[editor, preparePrompt, stream]
	)

	return {
		prompt: promptAgent,
	}
}

// const _STATIC_TLDRAWAI_OPTIONS: TldrawAiOptions = {
// 	transforms: [UniqueIds, RoundedCoordinates, SimpleText],
// 	apply: applyAiChange,

// 	// A function that calls the backend and return generated changes.
// 	// See worker/do/OpenAiService.ts#generate for the backend part.
// 	generate: async ({ editor, prompt, signal }) => {
// 		const res = await fetch('/generate', {
// 			method: 'POST',
// 			body: JSON.stringify(prompt),
// 			headers: {
// 				'Content-Type': 'application/json',
// 			},
// 			signal,
// 		})

// 		if (!res.ok) {
// 			const errorData = (await res.json().catch(() => ({ error: 'Unknown error' }))) as any
// 			throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
// 		}

// 		const agentChanges = (await res.json()) as TLAgentChange[]

// 		// Check if the response contains an error
// 		if ('error' in agentChanges) {
// 			throw new Error(agentChanges.error as string)
// 		}

// 		for (const change of agentChanges) {
// 			applyAgentChange({ editor, change: { ...change, complete: true } })
// 		}
// 		return getAiChangesFromAgentChanges(agentChanges)
// 	},
// 	// A function similar to `generate` but that will stream changes from
// 	// the AI as they are ready. See worker/do/OpenAiService.ts#stream for
// 	// the backend part.
// 	stream: async function* ({ editor, prompt, signal }) {
// 		const res = await fetch('/stream', {
// 			method: 'POST',
// 			body: JSON.stringify(prompt),
// 			headers: {
// 				'Content-Type': 'application/json',
// 			},
// 			signal,
// 		})

// 		if (!res.body) {
// 			throw Error('No body in response')
// 		}

// 		const reader = res.body.getReader()
// 		const decoder = new TextDecoder()
// 		let buffer = ''

// 		try {
// 			while (true) {
// 				const { value, done } = await reader.read()
// 				if (done) break

// 				buffer += decoder.decode(value, { stream: true })
// 				const events = buffer.split('\n\n')
// 				buffer = events.pop() || ''

// 				for (const event of events) {
// 					const match = event.match(/^data: (.+)$/m)
// 					if (match) {
// 						try {
// 							const data = JSON.parse(match[1])

// 							// If the response contains an error, throw it
// 							if ('error' in data) {
// 								throw new Error(data.error)
// 							}

// 							// Otherwise, it's a regular agent change
// 							const agentChange: Streaming<TLAgentChange> = data
// 							applyAgentChange({ editor, change: agentChange })

// 							const aiChange = getAiChangeFromAgentChange(agentChange)
// 							if (aiChange) {
// 								yield aiChange
// 							}
// 						} catch (err: any) {
// 							throw new Error(err.message)
// 						}
// 					}
// 				}
// 			}
// 		} finally {
// 			reader.releaseLock()
// 		}
// 	},
// }

// function getAiChangesFromAgentChanges(changes: TLAgentChange[]): TLAiChange[] {
// 	return changes
// 		.map((change) => getAiChangeFromAgentChange(change))
// 		.filter((change) => change !== null)
// }

// function getAiChangeFromAgentChange(
// 	change: Streaming<TLAgentChange> | (TLAgentChange & { complete?: boolean })
// ): TLAiChange | null {
// 	if (!change.complete) return null
// 	switch (change.type) {
// 		case 'createShape':
// 		case 'updateShape':
// 		case 'deleteShape':
// 		case 'createBinding':
// 		case 'updateBinding':
// 		case 'deleteBinding': {
// 			return change
// 		}
// 	}
// 	return null
// }
