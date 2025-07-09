import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { asMessage, TLAiChange, TLAiResult, TLAiSerializedPrompt } from '@tldraw/ai'
import { CoreMessage, generateObject, LanguageModel, streamObject, UserContent } from 'ai'
import { getSimpleContentFromCanvasContent } from '../../simple/getSimpleContentFromCanvasContent'
import { getTldrawAiChangesFromSimpleEvents } from '../../simple/getTldrawAiChangesFromSimpleEvents'
import { IModelResponse, ISimpleEvent, ModelResponse, SimpleEvent } from '../../simple/schema'
import { SIMPLE_SYSTEM_PROMPT } from '../../simple/system-prompt'
import { TldrawAiBaseService } from '../../TldrawAiBaseService'
import { Environment } from '../../types'

export class VercelAiService extends TldrawAiBaseService {
	openai: OpenAIProvider

	constructor(env: Environment) {
		super(env)
		this.openai = createOpenAI({
			apiKey: env.OPENAI_API_KEY,
		})
	}

	async generate(prompt: TLAiSerializedPrompt): Promise<TLAiResult> {
		const events = await generateEventsVercel(this.openai('gpt-4o'), prompt)
		const changes = events.map((event) => getTldrawAiChangesFromSimpleEvents(prompt, event)).flat()
		return { changes }
	}

	async *stream(prompt: TLAiSerializedPrompt): AsyncGenerator<TLAiChange> {
		for await (const event of streamEventsVercel(this.openai('gpt-4o'), prompt)) {
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
		messages: [buildUserMessage(prompt)],
		schema: ModelResponse,
	})

	let cursor = 0
	const events: ISimpleEvent[] = []
	let maybeUnfinishedEvent: ISimpleEvent | null = null

	for await (const partialObject of partialObjectStream) {
		if (Array.isArray(partialObject.events)) {
			for (let i = cursor, len = partialObject.events.length; i < len; i++) {
				const part = partialObject.events[i]
				if (i === cursor) {
					try {
						SimpleEvent.parse(part)

						const event = part as ISimpleEvent

						if (i < len) {
							events.push(event)
							yield event
							maybeUnfinishedEvent = null
							cursor++
						} else {
							maybeUnfinishedEvent = event
						}
					} catch {
						// noop but okay, it's just not done enough to be a valid event
					}
				}
			}
		}
	}

	if (maybeUnfinishedEvent) {
		events.push(maybeUnfinishedEvent)
		yield maybeUnfinishedEvent
	}

	return events
}

async function generateEventsVercel(
	model: LanguageModel,
	prompt: TLAiSerializedPrompt
): Promise<ISimpleEvent[]> {
	const response = await generateObject({
		model,
		system: SIMPLE_SYSTEM_PROMPT,
		messages: [buildUserMessage(prompt)],
		schema: ModelResponse,
	})

	return response.object.events
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
