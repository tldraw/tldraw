import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { asMessage, TLAiChange, TLAiResult, TLAiSerializedPrompt } from '@tldraw/ai'
import { CoreMessage, generateObject, LanguageModel, streamObject, UserContent } from 'ai'
import { ACTION_HISTORY_ITEM_DEFINITIONS, ChatHistoryItem } from '../../../client/ChatHistoryItem'
import { getTLAgentModelDefinition } from '../../models'
import { getSimpleContentFromCanvasContent } from '../../simple/getSimpleContentFromCanvasContent'
import { getTldrawAiChangesFromSimpleEvents } from '../../simple/getTldrawAiChangesFromSimpleEvents'
import { IModelResponse, ISimpleEvent, ModelResponse } from '../../simple/schema'
import { SIMPLE_SYSTEM_PROMPT } from '../../simple/system-prompt'
import { TldrawAiBaseService } from '../../TldrawAiBaseService'
import { Environment } from '../../types'

export class VercelAiService extends TldrawAiBaseService {
	openai: OpenAIProvider
	anthropic: AnthropicProvider

	constructor(env: Environment) {
		super(env)
		this.openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
		this.anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
	}

	async generate(prompt: TLAiSerializedPrompt): Promise<TLAiResult> {
		const modelDefinition = getTLAgentModelDefinition(prompt.meta.modelName)
		const provider = modelDefinition.provider
		const events = await generateEventsVercel(this[provider](modelDefinition.id), prompt)
		const changes = events.map((event) => getTldrawAiChangesFromSimpleEvents(prompt, event)).flat()
		return { changes }
	}

	async *stream(prompt: TLAiSerializedPrompt): AsyncGenerator<TLAiChange> {
		const modelDefinition = getTLAgentModelDefinition(prompt.meta.modelName)
		const provider = modelDefinition.provider
		for await (const event of streamEventsVercel(this[provider](modelDefinition.id), prompt)) {
			for (const change of getTldrawAiChangesFromSimpleEvents(prompt, event)) {
				yield change
			}
		}
	}
}

async function* streamEventsVercel(
	model: LanguageModel,
	prompt: TLAiSerializedPrompt
): AsyncGenerator<ISimpleEvent> {
	const { partialObjectStream } = streamObject<IModelResponse>({
		model,
		system: SIMPLE_SYSTEM_PROMPT,
		messages: buildMessages(prompt),
		schema: ModelResponse,
	})

	let cursor = 0
	let maybeUnfinishedEvent: ISimpleEvent | null = null

	for await (const partialObject of partialObjectStream) {
		if (!Array.isArray(partialObject.events)) continue
		if (partialObject.events.length === 0) {
			console.log(partialObject)
			continue
		}

		if (cursor === 0) {
			// Hacky way to see the plan in the meantime
			// Will be removed once we have a dedicated plan step or event
			// @ts-expect-error
			yield { type: 'plan', text: partialObject.long_description_of_strategy } as ISimpleEvent
		}

		const event = partialObject.events[cursor - 1] as ISimpleEvent
		if (partialObject.events.length > cursor) {
			if (event) {
				yield event
				maybeUnfinishedEvent = null
			}
			cursor++
		}
		if (event) {
			maybeUnfinishedEvent = event
		}
	}

	if (maybeUnfinishedEvent) {
		yield maybeUnfinishedEvent
	}
}

async function generateEventsVercel(
	model: LanguageModel,
	prompt: TLAiSerializedPrompt
): Promise<ISimpleEvent[]> {
	const response = await generateObject({
		model,
		system: SIMPLE_SYSTEM_PROMPT,
		messages: buildMessages(prompt),
		schema: ModelResponse,
	})

	return response.object.events
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
		messages.push(buildHistoryItemMessage(item))
	}

	return messages
}

function buildHistoryItemMessage(item: ChatHistoryItem): CoreMessage {
	switch (item.type) {
		case 'user-message': {
			return {
				role: 'user',
				content: [
					{ type: 'text', text: 'Previous message (already responded to): ' + item.message },
				],
			}
		}
		case 'agent-action': {
			const text = `Previous action (already done): ${ACTION_HISTORY_ITEM_DEFINITIONS[item.action].message.done}${item.info}`
			return {
				role: 'assistant',
				content: [{ type: 'text', text }],
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
				type: 'image',
				image: prompt.image,
			},
			{
				type: 'text',
				text: 'Here is a screenshot of the current viewport.',
			}
		)
	}

	// If it's an array, push each message as a separate message
	content.push({
		type: 'text',
		text: `Using the events provided in the response schema, here's what I want you to do:`,
	})

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

	return {
		role: 'user',
		content,
	}
}
