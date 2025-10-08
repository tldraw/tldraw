import { AnthropicProvider, AnthropicProviderOptions, createAnthropic } from '@ai-sdk/anthropic'
import {
	createGoogleGenerativeAI,
	GoogleGenerativeAIProvider,
	GoogleGenerativeAIProviderOptions,
} from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { LanguageModel, streamText } from 'ai'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { Streaming } from '../../shared/types/Streaming'
import { Environment } from '../environment'
import { AgentModelName, getAgentModelDefinition } from '../models'
import { buildMessages } from '../prompt/buildMessages'
import { buildSystemPrompt } from '../prompt/buildSystemPrompt'
import { getModelName } from '../prompt/getModelName'
import { closeAndParseJson } from './closeAndParseJson'

export class AgentService {
	openai: OpenAIProvider
	anthropic: AnthropicProvider
	google: GoogleGenerativeAIProvider

	constructor(env: Environment) {
		this.openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
		this.anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
		this.google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
	}

	getModel(modelName: AgentModelName): LanguageModel {
		const modelDefinition = getAgentModelDefinition(modelName)
		const provider = modelDefinition.provider
		return this[provider](modelDefinition.id)
	}

	async *stream(prompt: AgentPrompt): AsyncGenerator<Streaming<AgentAction>> {
		try {
			const modelName = getModelName(prompt)
			const model = this.getModel(modelName)
			for await (const event of streamActions(model, prompt)) {
				yield event
			}
		} catch (error: any) {
			console.error('Stream error:', error)
			throw error
		}
	}
}

async function* streamActions(
	model: LanguageModel,
	prompt: AgentPrompt
): AsyncGenerator<Streaming<AgentAction>> {
	if (typeof model === 'string') {
		throw new Error('Model is a string, not a LanguageModel')
	}

	const geminiThinkingBudget = model.modelId === 'gemini-2.5-pro' ? 128 : 0

	const messages = buildMessages(prompt)
	const systemPrompt = buildSystemPrompt(prompt)

	try {
		messages.push({
			role: 'assistant',
			content: '{"actions": [{"_type":',
		})
		const { textStream } = streamText({
			model,
			system: systemPrompt,
			messages,
			maxOutputTokens: 8192,
			temperature: 0,
			providerOptions: {
				anthropic: {
					thinking: { type: 'disabled' },
				} satisfies AnthropicProviderOptions,
				google: {
					thinkingConfig: { thinkingBudget: geminiThinkingBudget },
				} satisfies GoogleGenerativeAIProviderOptions,
			},
			onError: (e) => {
				console.error('Stream text error:', e)
				throw e
			},
		})

		const canForceResponseStart =
			model.provider === 'anthropic.messages' || model.provider === 'google.generative-ai'
		let buffer = canForceResponseStart ? '{"actions": [{"_type":' : ''
		let cursor = 0
		let maybeIncompleteAction: AgentAction | null = null

		let startTime = Date.now()
		for await (const text of textStream) {
			buffer += text

			const partialObject = closeAndParseJson(buffer)
			if (!partialObject) continue

			const actions = partialObject.actions
			if (!Array.isArray(actions)) continue
			if (actions.length === 0) continue

			// If the events list is ahead of the cursor, we know we've completed the current event
			// We can complete the event and move the cursor forward
			if (actions.length > cursor) {
				const action = actions[cursor - 1] as AgentAction
				if (action) {
					yield {
						...action,
						complete: true,
						time: Date.now() - startTime,
					}
					maybeIncompleteAction = null
				}
				cursor++
			}

			// Now let's check the (potentially new) current event
			// And let's yield it in its (potentially incomplete) state
			const action = actions[cursor - 1] as AgentAction
			if (action) {
				// If we don't have an incomplete event yet, this is the start of a new one
				if (!maybeIncompleteAction) {
					startTime = Date.now()
				}

				maybeIncompleteAction = action

				// Yield the potentially incomplete event
				yield {
					...action,
					complete: false,
					time: Date.now() - startTime,
				}
			}
		}

		// If we've finished receiving events, but there's still an incomplete event, we need to complete it
		if (maybeIncompleteAction) {
			yield {
				...maybeIncompleteAction,
				complete: true,
				time: Date.now() - startTime,
			}
		}
	} catch (error: any) {
		console.error('streamEventsVercel error:', error)
		throw error
	}
}
