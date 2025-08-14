import { AnthropicProvider, AnthropicProviderOptions, createAnthropic } from '@ai-sdk/anthropic'
import {
	createGoogleGenerativeAI,
	GoogleGenerativeAIProvider,
	GoogleGenerativeAIProviderOptions,
} from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { LanguageModel, streamObject, streamText } from 'ai'
import { AgentEvent } from '../../../shared/types/AgentEvent'
import { AgentPrompt } from '../../../shared/types/AgentPrompt'
import { Streaming } from '../../../shared/types/Streaming'
import { AgentModelName, getTLAgentModelDefinition } from '../../models'
import { buildMessages } from '../../prompt/buildMessages'
import { AgentResponseZodSchema } from '../../prompt/schema'
import { AGENT_SYSTEM_PROMPT, AGENT_SYSTEM_PROMPT_WITH_SCHEMA } from '../../prompt/system-prompt'
import { Environment } from '../../types'
import { TldrawAgentService } from './TldrawAgentService'

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

	getModel(modelName: AgentModelName): LanguageModel {
		const modelDefinition = getTLAgentModelDefinition(modelName)
		const provider = modelDefinition.provider
		return this[provider](modelDefinition.id)
	}

	async *stream(prompt: AgentPrompt): AsyncGenerator<Streaming<AgentEvent>> {
		try {
			const model = this.getModel(prompt.modelName)
			for await (const event of streamEventsVercel(model, prompt)) {
				yield event
			}
		} catch (error: any) {
			console.error('Stream error:', error)
			throw error
		}
	}
}

async function* streamEventsVercel(
	model: LanguageModel,
	prompt: AgentPrompt
): AsyncGenerator<Streaming<AgentEvent>> {
	if (typeof model === 'string') {
		throw new Error('Model is a string, not a LanguageModel')
	}

	const geminiThinkingBudget = model.modelId === 'gemini-2.5-pro' ? 128 : 0

	try {
		if (model.provider === 'anthropic.messages') {
			const messages = buildMessages(prompt)
			messages.push({
				role: 'assistant',
				content: '{"events": [{"_type":',
			})
			const { textStream } = streamText({
				model,
				system: AGENT_SYSTEM_PROMPT_WITH_SCHEMA,
				messages,
				maxOutputTokens: 8192,
				temperature: 0,
				providerOptions: {
					anthropic: {
						thinking: { type: 'disabled' },
					} satisfies AnthropicProviderOptions,
				},
				onError: (e) => {
					console.error('Stream text error:', e)
					throw e
				},
			})

			yield {
				_type: 'debug',
				complete: true,
				label: 'MESSAGES',
				data: messages,
			}

			let buffer = '{"events": [{"_type":'

			let cursor = 0
			let maybeIncompleteEvent: AgentEvent | null = null

			for await (const text of textStream) {
				buffer += text

				const partialObject = closeAndParseJson(buffer)
				if (!partialObject) continue

				const events = partialObject.events
				if (!Array.isArray(events)) continue
				if (events.length === 0) continue

				// If the events list is ahead of the cursor, we know we've completed the current event
				// We can complete the event and move the cursor forward
				if (events.length > cursor) {
					const event = events[cursor - 1] as AgentEvent
					if (event) {
						yield { ...event, complete: true }
						maybeIncompleteEvent = null
					}
					cursor++
				}

				// Now let's check the (potentially new) current event
				// And let's yield it in its (potentially incomplete) state
				const event = events[cursor - 1] as AgentEvent
				if (event) {
					yield { ...event, complete: false }
					maybeIncompleteEvent = event
				}
			}

			// If we've finished receiving events, but there's still an incomplete event, we need to complete it
			if (maybeIncompleteEvent) {
				yield { ...maybeIncompleteEvent, complete: true }
			}
		} else {
			const messages = buildMessages(prompt)
			const { partialObjectStream } = streamObject<typeof AgentResponseZodSchema>({
				model,
				system: AGENT_SYSTEM_PROMPT,
				messages,
				maxOutputTokens: 8192,
				temperature: 0,
				schema: AgentResponseZodSchema,
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

			yield {
				_type: 'debug',
				complete: true,
				label: 'MESSAGES',
				data: messages,
			}

			let cursor = 0
			let maybeIncompleteEvent: AgentEvent | null = null

			for await (const partialObject of partialObjectStream) {
				const events = partialObject.events
				if (!Array.isArray(events)) continue
				if (events.length === 0) continue

				// If the events list is ahead of the cursor, we know we've completed the current event
				// We can complete the event and move the cursor forward
				if (events.length > cursor) {
					const event = events[cursor - 1] as AgentEvent
					if (event) {
						yield { ...event, complete: true }
						maybeIncompleteEvent = null
					}
					cursor++
				}

				// Now let's check the (potentially new) current event
				// And let's yield it in its (potentially incomplete) state
				const event = events[cursor - 1] as AgentEvent
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
	} catch (error: any) {
		console.error('streamEventsVercel error:', error)
		throw error
	}
}

/**
 * JSON helper. Given a potentially incomplete JSON string, return the parsed object.
 * The string might be missing closing braces, brackets, or other characters like quotation marks.
 * @param string - The string to parse.
 * @returns The parsed object.
 */
function closeAndParseJson(string: string) {
	const stackOfOpenings = []
	for (const char of string) {
		const lastOpening = stackOfOpenings.at(-1)
		if (char === '"') {
			if (lastOpening === '"') {
				stackOfOpenings.pop()
			} else {
				stackOfOpenings.push('"')
			}
		}

		if (lastOpening === '"') {
			continue
		}

		if (char === '{' || char === '[') {
			stackOfOpenings.push(char)
		}

		if (char === '}' && lastOpening === '{') {
			stackOfOpenings.pop()
		}

		if (char === ']' && lastOpening === '[') {
			stackOfOpenings.pop()
		}
	}

	// Now close all unclosed openings
	for (let i = stackOfOpenings.length - 1; i >= 0; i--) {
		const opening = stackOfOpenings[i]
		if (opening === '{') {
			string += '}'
		}

		if (opening === '[') {
			string += ']'
		}

		if (opening === '"') {
			string += '"'
		}
	}

	try {
		return JSON.parse(string)
	} catch (_e) {
		return null
	}
}
