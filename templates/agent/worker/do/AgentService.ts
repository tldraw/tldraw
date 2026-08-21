import { AnthropicProvider, AnthropicProviderOptions, createAnthropic } from '@ai-sdk/anthropic'
import {
	createGoogleGenerativeAI,
	GoogleGenerativeAIProvider,
	GoogleGenerativeAIProviderOptions,
} from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider, OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import { ModelMessage, streamText } from 'ai'
import { AgentModelDefinition, getAgentModelDefinition } from '../../shared/models'
import { DebugPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { Streaming } from '../../shared/types/Streaming'
import { Environment } from '../environment'
import { buildMessages } from '../prompt/buildMessages'
import { buildSystemPrompt } from '../prompt/buildSystemPrompt'
import { getModelName } from '../prompt/getModelName'
import { closeAndParseJson } from './closeAndParseJson'

const RESPONSE_PREFILL = '{"actions": [{"_type":'

export class AgentService {
	openai: OpenAIProvider
	anthropic: AnthropicProvider
	google: GoogleGenerativeAIProvider

	constructor(env: Environment) {
		this.openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
		this.anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
		this.google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
	}

	async *stream(prompt: AgentPrompt): AsyncGenerator<Streaming<AgentAction>> {
		const modelDefinition = getAgentModelDefinition(getModelName(prompt))
		const { provider } = modelDefinition
		const model = this[provider](modelDefinition.id)

		// Build messages with provider-specific options
		// Add system prompt with Anthropic caching if applicable
		const messages: ModelMessage[] = [
			{
				role: 'system',
				content: buildSystemPrompt(prompt),
				// Anthropic requires explicit cache breakpoints. We set one at the end of the
				// system prompt to cache all system content (which generally changes together).
				...(provider === 'anthropic' && {
					providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
				}),
			},
		]

		// Add prompt messages
		const promptMessages = buildMessages(prompt)
		messages.push(...promptMessages)

		// Check for debug flags and log if enabled
		const debugPart = prompt.debug as DebugPart | undefined
		if (debugPart?.logSystemPrompt) {
			const promptWithoutSchema = buildSystemPrompt(prompt, { withSchema: false })
			console.log('[DEBUG] System Prompt (without schema):\n', promptWithoutSchema)
		}
		if (debugPart?.logMessages) {
			console.log('[DEBUG] Messages:\n', JSON.stringify(promptMessages, null, 2))
		}

		// Prefill the assistant turn to force the JSON start, where the model allows it.
		// Opus 4.7+ and Sonnet 4.6 reject last-assistant-turn prefills (400), so skip it there.
		if (modelDefinition.supportsPrefill) {
			messages.push({ role: 'assistant', content: RESPONSE_PREFILL })
		}

		const { textStream } = streamText({
			model,
			messages,
			maxOutputTokens: 8192,
			// Opus 4.7+ removed `temperature` (and top_p/top_k); sending it returns a 400.
			...(modelDefinition.supportsTemperature ? { temperature: 0 } : {}),
			providerOptions: getProviderOptions(modelDefinition),
			onAbort() {
				console.warn('Stream actions aborted')
			},
			onError: (e) => {
				console.error('Stream text error:', e)
				throw e
			},
		})

		const canForceResponseStart =
			(provider === 'anthropic' || provider === 'google') && modelDefinition.supportsPrefill
		let buffer = canForceResponseStart ? RESPONSE_PREFILL : ''
		let cursor = 0
		let maybeIncompleteAction: AgentAction | null = null

		let startTime = Date.now()
		for await (const text of textStream) {
			buffer += text
			const actions = closeAndParseJson(buffer)?.actions
			if (!Array.isArray(actions) || actions.length === 0) continue

			// If the events list is ahead of the cursor, we know we've completed the current event
			// We can complete the event and move the cursor forward
			if (actions.length > cursor) {
				const action = actions[cursor - 1] as AgentAction
				if (action) {
					yield { ...action, complete: true, time: Date.now() - startTime }
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
				yield { ...action, complete: false, time: Date.now() - startTime }
			}
		}

		// If we've finished receiving events, but there's still an incomplete event, we need to complete it
		if (maybeIncompleteAction) {
			yield { ...maybeIncompleteAction, complete: true, time: Date.now() - startTime }
		}
	}
}

type StreamTextProviderOptions = NonNullable<Parameters<typeof streamText>[0]['providerOptions']>

/**
 * Map a model definition's reasoning preferences to AI SDK provider options.
 * Only the matching provider's options are set; the SDK ignores the rest.
 */
function getProviderOptions(definition: AgentModelDefinition): StreamTextProviderOptions {
	switch (definition.provider) {
		case 'anthropic':
			return {
				anthropic: {
					thinking:
						definition.thinking === 'adaptive' ? { type: 'adaptive' } : { type: 'disabled' },
					...(definition.effort ? { effort: definition.effort } : {}),
				} satisfies AnthropicProviderOptions,
			}
		case 'google':
			return {
				google: {
					thinkingConfig: { thinkingLevel: definition.thinkingLevel },
				} satisfies GoogleGenerativeAIProviderOptions,
			}
		case 'openai':
			return {
				openai: {
					reasoningEffort: definition.reasoningEffort,
				} satisfies OpenAIResponsesProviderOptions,
			}
	}
}
