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
import { DEFAULT_MODEL_NAME, TLAgentModelName } from '../worker/models'
import { applyAgentChange } from './applyAgentChange'
import { RoundedCoordinates } from './transforms/RoundedCoordinates'
import { SimpleText } from './transforms/SimpleText'
import { TldrawAgentTransformConstructor } from './transforms/TldrawAgentTransform'
import { UniqueIds } from './transforms/UniqueIds'
import { ChatHistoryItem } from './types/ChatHistoryItem'
import { ContextItem } from './types/ContextItem'
import { ScheduledRequest } from './types/ScheduledRequest'
import { Streaming, TLAgentChange } from './types/TLAgentChange'

export interface TldrawAgent {
	prompt(options: Partial<TLAgentPromptOptions>): { promise: Promise<void>; cancel(): void }
}

export interface TLAgentPromptOptions {
	editor: Editor
	transforms: TldrawAgentTransformConstructor[]

	message: string
	contextBounds: BoxModel
	promptBounds: BoxModel
	meta: TLAgentPromptMeta
}

export interface TLAgentPrompt {
	message: string
	contextBounds: BoxModel
	promptBounds: BoxModel
	meta: TLAgentPromptMeta

	canvasContent: TLAgentContent
	image: string | undefined
}

export interface TLAgentContent {
	shapes: TLShape[]
	bindings: TLBinding[]
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

export function useTldrawAgent({ editor }: { editor: Editor }): TldrawAgent {
	const prompt = useCallback(
		(options: Partial<TLAgentPromptOptions>) => {
			return promptAgent({
				editor: options.editor ?? editor,
				transforms: options.transforms ?? [RoundedCoordinates, SimpleText, UniqueIds],
				message: options.message ?? '',
				contextBounds: options.contextBounds ?? editor.getViewportPageBounds(),
				promptBounds: options.promptBounds ?? editor.getViewportPageBounds(),
				meta: options.meta ?? {
					modelName: DEFAULT_MODEL_NAME,
					historyItems: [],
					contextItems: [],
					currentPageShapes: editor.getCurrentPageShapesSorted(),
					currentUserViewportBounds: editor.getViewportPageBounds(),
					userSelectedShapes: editor.getSelectedShapes(),
					type: 'user',
				},
			})
		},
		[editor]
	)

	return { prompt }
}

/**
 * Prompt the agent with a request. The agent's response will be streamed back to the chat panel and editor.
 *
 * @returns A promise that resolves when the prompt is complete.
 */
function promptAgent(promptOptions: TLAgentPromptOptions) {
	const { editor } = promptOptions
	let cancelled = false
	const controller = new AbortController()
	const signal = controller.signal
	const markId = 'generating_' + uniqueId()

	const promise = new Promise<void>((resolve, reject) => {
		preparePrompt(promptOptions)
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
								const transformedChange = transformChange(change)
								applyAgentChange({ editor, change: transformedChange })
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
}

/**
 * Stream a response from the model.
 * Act on the model's events as they come in.
 *
 * @returns An async generator that yields the changes as they come in.
 */
async function* stream({ prompt, signal }: { prompt: TLAgentPrompt; signal: AbortSignal }) {
	const res = await fetch('/stream', {
		method: 'POST',
		body: JSON.stringify(prompt),
		headers: {
			'Content-Type': 'application/json',
		},
		signal,
	})

	if (!res.body) {
		throw Error('No body in response')
	}

	const reader = res.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''

	try {
		while (true) {
			const { value, done } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })
			const events = buffer.split('\n\n')
			buffer = events.pop() || ''

			for (const event of events) {
				const match = event.match(/^data: (.+)$/m)
				if (match) {
					try {
						const data = JSON.parse(match[1])

						// If the response contains an error, throw it
						if ('error' in data) {
							throw new Error(data.error)
						}

						const agentChange: Streaming<TLAgentChange> = data
						yield agentChange
					} catch (err: any) {
						throw new Error(err.message)
					}
				}
			}
		}
	} finally {
		reader.releaseLock()
	}
}

/**
 * Get a full prompt based on the provided prompt options, transformed by
 * the specified transforms.
 *
 * @returns The fully transformed prompt, and a function to transform back
 * the changes that come back from the agent.
 */
async function preparePrompt(promptOptions: TLAgentPromptOptions) {
	const { editor, transforms: transformConstructors } = promptOptions
	const transforms = transformConstructors.map((v) => new v(editor))

	const canvasContent = getCanvasContent({ editor, bounds: promptOptions.contextBounds })
	const image = await getScreenshot({
		editor,
		shapes: canvasContent.shapes,
		bounds: promptOptions.contextBounds,
	})

	let prompt: TLAgentPrompt = {
		message: promptOptions.message,
		contextBounds: promptOptions.contextBounds,
		promptBounds: promptOptions.promptBounds,
		meta: promptOptions.meta,
		canvasContent,
		image,
	}

	for (const transform of transforms) {
		if (transform.transformPrompt) {
			prompt = transform.transformPrompt(prompt)
		}
	}

	transforms.reverse()

	const transformChange = (change: Streaming<TLAgentChange>) => {
		for (const transform of transforms) {
			if (transform.transformChange) {
				change = transform.transformChange(change)
			}
		}
		return change
	}

	return {
		prompt,
		transformChange,
	}
}

/**
 * Get all the shapes and bindings from a given area in the current page.
 *
 * @returns An object containing the shapes and bindings.
 */
function getCanvasContent({
	editor,
	bounds,
}: {
	editor: Editor
	bounds: BoxModel
}): TLAgentContent {
	const contentFromCurrentPage = editor.getContentFromCurrentPage(
		editor
			.getCurrentPageShapesSorted()
			.filter((s) => Box.From(bounds).includes(editor.getShapeMaskedPageBounds(s)!))
	)

	if (contentFromCurrentPage) {
		return {
			shapes: structuredClone(contentFromCurrentPage.shapes),
			bindings: structuredClone(contentFromCurrentPage.bindings ?? []),
		}
	}

	return {
		shapes: [],
		bindings: [],
	}
}

/**
 * Get an image of the canvas content.
 * *
 * @returns The image data URL.
 */
async function getScreenshot({
	editor,
	shapes,
	bounds,
}: {
	editor: Editor
	shapes: TLShape[]
	bounds: BoxModel
}) {
	if (shapes.length === 0) return undefined
	const result = await editor.toImage(shapes, {
		format: 'jpeg',
		background: true,
		bounds: Box.From(bounds),
		padding: 0,
	})

	return await FileHelpers.blobToDataUrl(result.blob)
}
