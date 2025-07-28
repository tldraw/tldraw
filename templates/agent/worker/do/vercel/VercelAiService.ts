import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI, GoogleGenerativeAIProvider } from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { asMessage, TLAiChange, TLAiResult, TLAiSerializedPrompt } from '@tldraw/ai'
import { CoreMessage, generateObject, LanguageModel, streamObject, UserContent } from 'ai'
import { ACTION_HISTORY_ITEM_DEFINITIONS, ChatHistoryItem } from '../../../client/ChatHistoryItem'
import { getTLAgentModelDefinition, TLAgentModelName } from '../../models'
import {
	getSimpleContentFromCanvasContent,
	getSimplePeripheralContentFromCanvasContent,
} from '../../simple/getSimpleContentFromCanvasContent'
import { getTldrawAiChangesFromSimpleEvents } from '../../simple/getTldrawAiChangesFromSimpleEvents'
import { getReviewPrompt } from '../../simple/review-prompt'
import { IModelResponse, ISimpleEvent, ModelResponse } from '../../simple/schema'
import { getSetMyViewPrompt } from '../../simple/set-my-view-prompt'
import { SIMPLE_SYSTEM_PROMPT } from '../../simple/system-prompt'
import { TldrawAiBaseService } from '../../TldrawAiBaseService'
import { Environment } from '../../types'

export class VercelAiService extends TldrawAiBaseService {
	openai: OpenAIProvider
	anthropic: AnthropicProvider
	google: GoogleGenerativeAIProvider

	constructor(env: Environment) {
		super(env)
		this.openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
		this.anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
		this.google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
	}

	getModel(modelName: TLAgentModelName): LanguageModel {
		const modelDefinition = getTLAgentModelDefinition(modelName)
		const provider = modelDefinition.provider
		return this[provider](modelDefinition.id)
	}

	async generate(prompt: TLAiSerializedPrompt): Promise<TLAiResult> {
		const model = this.getModel(prompt.meta.modelName)
		const events = await generateEventsVercel(model, prompt)
		const changes = events.map((event) => getTldrawAiChangesFromSimpleEvents(prompt, event)).flat()
		return { changes }
	}

	async *stream(prompt: TLAiSerializedPrompt): AsyncGenerator<TLAiChange> {
		const model = this.getModel(prompt.meta.modelName)
		for await (const event of streamEventsVercel(model, prompt)) {
			for (const change of getTldrawAiChangesFromSimpleEvents(prompt, event)) {
				yield change
			}
		}
	}
}

async function* streamEventsVercel(
	model: LanguageModel,
	prompt: TLAiSerializedPrompt
): AsyncGenerator<ISimpleEvent & { complete: boolean }> {
	const { partialObjectStream } = streamObject<IModelResponse>({
		model,
		system: SIMPLE_SYSTEM_PROMPT,
		messages: buildMessages(prompt),
		schema: ModelResponse,
		onError: (e) => {
			console.error(e)
			throw e
		},
	})

	let cursor = 0
	let maybeIncompleteEvent: ISimpleEvent | null = null

	for await (const partialObject of partialObjectStream) {
		const events = partialObject.events
		if (!Array.isArray(events)) continue
		if (events.length === 0) continue

		// If the events list is ahead of the cursor, we know we've completed the current event
		// We can complete the event and move the cursor forward
		if (events.length > cursor) {
			const event = events[cursor - 1] as ISimpleEvent
			if (event) {
				yield { ...event, complete: true }
				maybeIncompleteEvent = null
			}
			cursor++
		}

		// Now let's check the (potentially new) current event
		// And let's yield it in its (potentially incomplete) state
		const event = events[cursor - 1] as ISimpleEvent
		if (event) {
			yield { ...event, complete: false }
			maybeIncompleteEvent = event
		}
	}

	// If we've finished receiving events, but there's still an incomplete event, we need to complete it
	if (maybeIncompleteEvent) {
		yield { ...maybeIncompleteEvent, complete: true }
	}
}

async function generateEventsVercel(
	model: LanguageModel,
	prompt: TLAiSerializedPrompt
): Promise<(ISimpleEvent & { complete: boolean })[]> {
	const response = await generateObject({
		model,
		system: SIMPLE_SYSTEM_PROMPT,
		messages: buildMessages(prompt),
		schema: ModelResponse,
	})

	return response.object.events.map((event) => ({ ...event, complete: true }))
}

function buildMessages(prompt: TLAiSerializedPrompt): CoreMessage[] {
	const messages: CoreMessage[] = []

	const historyMessages = buildHistoryMessages(prompt)
	const contextShapesMessages = buildContextShapesMessages(prompt)
	const contextAreasMessages = buildContextAreasMessages(prompt)
	const contextPointsMessages = buildContextPointsMessages(prompt)
	const userMessage = buildUserMessage(prompt)

	messages.push(...historyMessages)
	messages.push(...contextShapesMessages)
	messages.push(...contextAreasMessages)
	messages.push(...contextPointsMessages)
	messages.push(userMessage)

	return messages
}

function buildContextAreasMessages(prompt: TLAiSerializedPrompt): CoreMessage[] {
	const review = prompt.meta.type === 'review'

	const areas = prompt.meta.contextItems.areas
	if (areas.length === 0) {
		return []
	}

	const noReviewPrompt =
		'The user has specifically brought your attention to the following areas in this request. The user might refer to them as the "area(s)" or perhaps "here" or "there", but either way, it\'s implied that you should focus on these areas in both your reasoning and actions. Make sure to focus your task on these areas:'
	const reviewPrompt =
		'You have been instructed to review your work. Here are the areas you should review:'

	const contextAreasText = review ? reviewPrompt : noReviewPrompt

	const content: UserContent = []
	content.push({
		type: 'text',
		text: contextAreasText,
	})

	for (const area of areas) {
		content.push({
			type: 'text',
			text: JSON.stringify(area, null, 2),
		})
	}

	return [{ role: 'user', content }]
}

function buildContextPointsMessages(prompt: TLAiSerializedPrompt): CoreMessage[] {
	const points = prompt.meta.contextItems.points
	if (points.length === 0) {
		return []
	}

	const content: UserContent = []
	content.push({
		type: 'text',
		text: 'The user has specifically brought your attention to the following points in this request. The user might refer to them as the "point(s)" or perhaps "here" or "there", but either way, it\'s implied that you should focus on these points in both your reasoning and actions. Make sure to focus your task on these points:',
	})

	for (const point of points) {
		content.push({
			type: 'text',
			text: JSON.stringify(point, null, 2),
		})
	}

	return [{ role: 'user', content }]
}

function buildContextShapesMessages(prompt: TLAiSerializedPrompt): CoreMessage[] {
	const shapes = prompt.meta.contextItems.shapes
	if (shapes.length === 0) {
		return []
	}

	const content: UserContent = []
	content.push({
		type: 'text',
		text: 'The user has specifically brought your attention to the following shapes in this request. Make sure to focus your task on these shapes:',
	})

	for (const shape of shapes) {
		content.push({
			type: 'text',
			text: JSON.stringify(shape, null, 2),
		})
	}

	return [{ role: 'user', content }]
}

function buildHistoryMessages(prompt: TLAiSerializedPrompt): CoreMessage[] {
	const messages: CoreMessage[] = []

	for (const item of prompt.meta.historyItems) {
		const message = buildHistoryItemMessage(item)
		if (message) {
			messages.push(message)
		}
	}

	return messages
}

function buildHistoryItemMessage(item: ChatHistoryItem): CoreMessage | null {
	switch (item.type) {
		case 'user-message': {
			const content: UserContent = [
				{ type: 'text', text: 'Previous message from user: ' + item.message },
			]
			if (item.contextItems.length > 0) {
				for (const contextItem of item.contextItems) {
					content.push({
						type: 'text',
						text: `Previous context item to focus on from the user: ${JSON.stringify(contextItem, null, 2)}`,
					})
				}
			}
			return {
				role: 'user',
				content,
			}
		}
		// We're filtering out status-thinking from the history items before sending to the models, so they should never see this
		case 'status-thinking': {
			return null
		}
		case 'agent-action': {
			const text = `Previous action from agent: ${ACTION_HISTORY_ITEM_DEFINITIONS[item.action].message.done}${item.info}`
			return {
				role: 'assistant',
				content: [{ type: 'text', text }],
			}
		}
		case 'agent-message': {
			return {
				role: 'assistant',
				content: [{ type: 'text', text: 'Previous message from agent: ' + item.message }],
			}
		}
		case 'agent-change': {
			return {
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: 'Previous change from agent: ' + JSON.stringify(item.change, null, 2),
						// text: 'A previous change from agent.',
					},
				],
			}
		}
		case 'agent-change-group': {
			const changes = item.items.map((item) => item.change)
			return {
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: 'Previous changes from agent: ' + JSON.stringify(changes, null, 2),
						// text: 'Previous changes from agent.',
					},
				],
			}
		}
		case 'agent-raw': {
			return {
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: 'Previous output from agent: ' + JSON.stringify(item.change, null, 2),
					},
				],
			}
		}
	}
}

/**
 * Build the user messages.
 */
function buildUserMessage(prompt: TLAiSerializedPrompt): CoreMessage {
	const content: UserContent = []

	// Add agent's current viewport
	content.push({
		type: 'text',
		text: `Your current viewport is: { x: ${prompt.contextBounds.x}, y: ${prompt.contextBounds.y}, width: ${prompt.contextBounds.w}, height: ${prompt.contextBounds.h} }`,
	})

	const currentPageContent = prompt.meta.currentPageContent

	// Add the content from the agent's current viewport
	const simplifiedAgentViewportContent = getSimpleContentFromCanvasContent(prompt.canvasContent)
	const peripheralContent = getSimplePeripheralContentFromCanvasContent(
		currentPageContent,
		prompt.canvasContent
	)

	content.push({
		type: 'text',
		text:
			simplifiedAgentViewportContent.shapes.length > 0
				? `Here are the shapes in your current viewport:\n${JSON.stringify(simplifiedAgentViewportContent.shapes).replaceAll('\n', ' ')}`
				: 'Your current viewport is empty.',
	})

	// Add the screenshot of the agent's current viewport
	if (prompt.image) {
		content.push(
			{
				type: 'text',
				text: "Here is a screenshot of your current viewport on the canvas. It's what you will be editing or adding to.", // It's what the user can see.",
			},
			{
				type: 'image',
				image: prompt.image,
			}
		)
	}

	// Add the content from the agent's peripheral vision
	if (peripheralContent.shapes.length > 0) {
		content.push({
			type: 'text',
			text: `Here are the shapes in your peripheral vision, outside the viewport. You can only see their position and size, not their content. If you want to see their content, you need to get closer.\n\n${JSON.stringify(peripheralContent.shapes).replaceAll('\n', ' ')}`,
		})
	}

	// Add the user's viewport bounds if they're more than 5% different from the agent's viewport bounds (maybe a bad heuristic, not sure)
	const currentUserViewportBounds = prompt.meta.currentUserViewportBounds
	const withinPercent = (a: number, b: number, percent: number) => {
		const max = Math.max(Math.abs(a), Math.abs(b), 1)
		return Math.abs(a - b) <= (percent / 100) * max
	}
	const doUserAndAgentShareViewport =
		withinPercent(prompt.contextBounds.x, currentUserViewportBounds.x, 5) &&
		withinPercent(prompt.contextBounds.y, currentUserViewportBounds.y, 5) &&
		withinPercent(prompt.contextBounds.w, currentUserViewportBounds.w, 5) &&
		withinPercent(prompt.contextBounds.h, currentUserViewportBounds.h, 5)

	if (!doUserAndAgentShareViewport) {
		content.push({
			type: 'text',
			text: `The user's viewport is different from the agent's viewport. The user's viewport is: { x: ${Math.round(currentUserViewportBounds.x)}, y: ${Math.round(currentUserViewportBounds.y)}, width: ${Math.round(currentUserViewportBounds.w)}, height: ${Math.round(currentUserViewportBounds.h)} }`,
		})
	}

	// Add followup messages
	if (prompt.meta.type === 'review') {
		// Review mode
		const messages = asMessage(prompt.message)
		const intent = messages[0]
		if (messages.length !== 1 || intent.type !== 'text') {
			throw new Error('Review message must be a single text message')
		}
		content.push({
			type: 'text',
			text: getReviewPrompt(intent.text),
		})
	} else if (prompt.meta.type === 'setMyView') {
		// Set my view mode
		const messages = asMessage(prompt.message)
		const intent = messages[0]
		if (messages.length !== 1 || intent.type !== 'text') {
			throw new Error('Review message must be a single text message')
		}
		content.push({
			type: 'text',
			text: getSetMyViewPrompt(intent.text),
		})
	} else {
		// Normal mode
		content.push({
			type: 'text',
			text: `Using the events provided in the response schema, here's what I want you to do:`,
		})

		// If it's an array, push each message as a separate message
		for (const message of asMessage(prompt.message)) {
			if (message.type === 'image') {
				content.push({
					type: 'image',
					image: message.src!,
				})
			} else {
				content.push({
					type: 'text',
					text: message.text,
				})
			}
		}
	}

	return {
		role: 'user',
		content,
	}
}
