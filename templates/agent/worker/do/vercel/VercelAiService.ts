import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import {
	createGoogleGenerativeAI,
	GoogleGenerativeAIProvider,
	GoogleGenerativeAIProviderOptions,
} from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { LanguageModel, streamObject } from 'ai'
import { Streaming, TLAgentChange } from '../../../client/types/TLAgentChange'
import { TLAgentPrompt } from '../../../client/types/TLAgentPrompt'
import { getTLAgentModelDefinition, TLAgentModelName } from '../../models'
import { buildMessages } from '../../prompt/prompt'
import { SIMPLE_SYSTEM_PROMPT } from '../../prompt/system-prompt'
import { getTldrawAgentChangesFromSimpleEvents } from '../../simple/getTldrawAgentChangesFromSimpleEvents'
import { IModelResponse, ISimpleEvent, ModelResponse } from '../../simple/schema'
import { Environment } from '../../types'
import { TldrawAgentService } from './TldrawAgentBaseService'

export class VercelAiService extends TldrawAgentService {
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

	async *stream(prompt: TLAgentPrompt): AsyncGenerator<Streaming<TLAgentChange>> {
		try {
			const model = this.getModel(prompt.meta.modelName)
			for await (const event of streamEventsVercel(model, prompt)) {
				for (const change of getTldrawAgentChangesFromSimpleEvents(prompt, event)) {
					yield change
				}
			}
		} catch (error: any) {
			console.error('Stream error:', error)
			throw error
		}
	}
}

async function* streamEventsVercel(
	model: LanguageModel,
	prompt: TLAgentPrompt
): AsyncGenerator<ISimpleEvent & { complete: boolean }> {
	const geminiThinkingBudget = model.modelId === 'gemini-2.5-pro' ? 128 : 0

	try {
		const { partialObjectStream } = streamObject<IModelResponse>({
			model,
			system: SIMPLE_SYSTEM_PROMPT,
			messages: buildMessages(prompt),
			schema: ModelResponse,
			onError: (e) => {
				console.error('Stream object error:', e)
				throw e
			},
			providerOptions: {
				google: {
					thinkingConfig: { thinkingBudget: geminiThinkingBudget },
				} satisfies GoogleGenerativeAIProviderOptions,
				//anthropic doesnt allow thinking for tool use, which structured outputs forces to be enabled
				//the openai models we use dont support thinking anyway
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
	} catch (error: any) {
		console.error('streamEventsVercel error:', error)
		throw error
	}
}
