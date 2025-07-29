import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI, GoogleGenerativeAIProvider } from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { TLAiSerializedPrompt } from '@tldraw/ai'
import { generateObject, LanguageModel, streamObject } from 'ai'
import { TLAgentChange, TLAgentStreamingChange } from '../../../client/applyAgentChange'
import { getTLAgentModelDefinition, TLAgentModelName } from '../../models'
import { getTldrawAgentChangesFromSimpleEvents } from '../../simple/getTldrawAgentChangesFromSimpleEvents'
import { IModelResponse, ISimpleEvent, ModelResponse } from '../../simple/schema'
import { SIMPLE_SYSTEM_PROMPT } from '../../simple/system-prompt'
import { TldrawAiBaseService } from '../../TldrawAiBaseService'
import { Environment } from '../../types'
import { buildMessages } from './prompt'

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

	async generate(prompt: TLAiSerializedPrompt): Promise<TLAgentChange[]> {
		const model = this.getModel(prompt.meta.modelName)
		const events = await generateEventsVercel(model, prompt)
		const changes = events
			.map((event) => getTldrawAgentChangesFromSimpleEvents(prompt, event))
			.flat()
			.filter((change) => change.complete)
		return changes
	}

	async *stream(prompt: TLAiSerializedPrompt): AsyncGenerator<TLAgentStreamingChange> {
		const model = this.getModel(prompt.meta.modelName)
		for await (const event of streamEventsVercel(model, prompt)) {
			for (const change of getTldrawAgentChangesFromSimpleEvents(prompt, event)) {
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
