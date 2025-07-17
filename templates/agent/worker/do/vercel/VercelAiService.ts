import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI, GoogleGenerativeAIProvider } from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { asMessage, TLAiChange, TLAiResult, TLAiSerializedPrompt } from '@tldraw/ai'
import { CoreMessage, generateObject, LanguageModel, streamObject, UserContent } from 'ai'
import { ACTION_HISTORY_ITEM_DEFINITIONS, ChatHistoryItem } from '../../../client/ChatHistoryItem'
import { getTLAgentModelDefinition, TLAgentModelName } from '../../models'
import { getSimpleContentFromCanvasContent } from '../../simple/getSimpleContentFromCanvasContent'
import { getTldrawAiChangesFromSimpleEvents } from '../../simple/getTldrawAiChangesFromSimpleEvents'
import { getReviewPrompt } from '../../simple/review-prompt'
import { IModelResponse, ISimpleEvent, ModelResponse } from '../../simple/schema'
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

	messages.push(...buildHistoryMessages(prompt))
	messages.push(buildUserMessage(prompt))

	return messages
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
			return {
				role: 'user',
				content: [{ type: 'text', text: 'Previous message from user: ' + item.message }],
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

	// Add the current viewport
	content.push({
		type: 'text',
		text: `The current viewport is: { x: ${prompt.promptBounds.x}, y: ${prompt.promptBounds.y}, width: ${prompt.promptBounds.w}, height: ${prompt.promptBounds.h} }`,
	})

	// Add the canvas content
	if (prompt.canvasContent) {
		const simplifiedCanvasContent = getSimpleContentFromCanvasContent(prompt.canvasContent)
		content.push({
			type: 'text',
			text: `Here are all of the shapes that are in the current viewport:\n\n${JSON.stringify(simplifiedCanvasContent.shapes).replaceAll('\n', ' ')}`,
		})
	}

	if (prompt.image) {
		content.push(
			{
				type: 'text',
				text: "This is a screenshot of the current viewport on the canvas. It's what you will be editing or adding to. It's what the user can see.",
			},
			{
				type: 'image',
				image: prompt.image,
			}
		)
	}

	if (prompt.meta.review) {
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
