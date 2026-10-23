import { AnthropicProvider, AnthropicProviderOptions, createAnthropic } from '@ai-sdk/anthropic'
import {
	createGoogleGenerativeAI,
	GoogleGenerativeAIProvider,
	GoogleGenerativeAIProviderOptions,
} from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider, OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import { LanguageModel, ModelMessage, stepCountIs, streamText, tool, ToolSet } from 'ai'
import z from 'zod'
import {
	AgentModelDefinition,
	AgentModelName,
	getAgentModelDefinition,
	isValidModelName,
} from '../../shared/models'
import { DebugPart } from '../../shared/schema/PromptPartDefinitions'
import { ActionMeta, AgentAction, getActionSchemaForMode } from '../../shared/types/AgentAction'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { Streaming } from '../../shared/types/Streaming'
import { Environment } from '../environment'
import { buildMessages } from '../prompt/buildMessages'
import { buildSystemPrompt } from '../prompt/buildSystemPrompt'
import { getModelName } from '../prompt/getModelName'
import { closeAndParseJson } from './closeAndParseJson'

export class AgentService {
	openai: OpenAIProvider
	anthropic: AnthropicProvider
	google: GoogleGenerativeAIProvider

	constructor(env: Environment) {
		this.openai = createOpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL })
		this.anthropic = createAnthropic({
			apiKey: env.ANTHROPIC_API_KEY,
			baseURL: env.ANTHROPIC_BASE_URL,
		})
		this.google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
	}

	getModel(modelName: AgentModelName): LanguageModel {
		const modelDefinition = getAgentModelDefinition(modelName)
		const provider = modelDefinition.provider
		return this[provider](modelDefinition.id)
	}

	async *stream(prompt: AgentPrompt): AsyncGenerator<Streaming<AgentAction>> {
		try {
			for await (const event of this.streamActions(prompt)) {
				yield event
			}
		} catch (error: any) {
			console.error('Stream error:', error)
			throw error
		}
	}

	private async *streamActions(prompt: AgentPrompt): AsyncGenerator<Streaming<AgentAction>> {
		const modelName = getModelName(prompt)
		const model = this.getModel(modelName)

		if (typeof model === 'string') {
			throw new Error('Model is a string, not a LanguageModel')
		}

		const { modelId, provider } = model
		if (!isValidModelName(modelId)) {
			throw new Error(`Model ${modelId} is not in AGENT_MODEL_DEFINITIONS`)
		}

		const modelDefinition = getAgentModelDefinition(modelId)
		const systemPrompt = buildSystemPrompt(prompt)

		// Build messages with provider-specific options
		const messages: ModelMessage[] = []

		// Add system prompt with Anthropic caching if applicable
		if (provider === 'anthropic.messages') {
			// Anthropic requires explicit cache breakpoints. We set one at the end of the
			// system prompt to cache all system content (which generally changes together).
			messages.push({
				role: 'system',
				content: systemPrompt,
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' } },
				},
			})
		} else {
			messages.push({
				role: 'system',
				content: systemPrompt,
			})
		}

		// Add prompt messages
		const promptMessages = buildMessages(prompt)
		messages.push(...promptMessages)

		// Check for debug flags and log if enabled
		const debugPart = prompt.debug as DebugPart | undefined
		if (debugPart) {
			if (debugPart.logSystemPrompt) {
				console.log('[DEBUG] System Prompt:\n', systemPrompt)
			}
			if (debugPart.logMessages) {
				console.log('[DEBUG] Messages:\n', JSON.stringify(promptMessages, null, 2))
			}
		}

		const result = streamText({
			model,
			messages,
			tools: buildActionTools(prompt),
			toolChoice: 'auto',
			// Tools return at once, so a model that waits for tool results can continue.
			stopWhen: stepCountIs(MAX_STEPS),
			maxOutputTokens: 8192,
			// Opus 4.7+ removed `temperature` (and top_p/top_k); sending it returns a 400.
			...(modelDefinition.supportsTemperature ? { temperature: 0 } : {}),
			providerOptions: getProviderOptions(modelDefinition),
			onAbort() {
				console.warn('Stream actions aborted')
			},
		})

		// Text becomes a message action, the model's own reasoning a think action, and each tool call
		// the action it names. One action is open at a time: it streams as partial, then closes when
		// the next one starts.
		let open: {
			action: AgentAction
			startTime: number
			input?: string
			reasoning?: boolean
		} | null = null
		let actionCount = 0
		// Each action is timed from the end of the one before it, and the first from the request, so
		// the times add up to the whole turn, including waits for the provider.
		let lastActionEnd = Date.now()
		const closeOpen = (): Streaming<AgentAction> | null => {
			if (!open) return null
			const { action, startTime, reasoning } = open
			open = null
			// Whitespace between tool calls is not a message, and reasoning with no text is not worth
			// showing.
			if (
				(action._type === 'message' || reasoning) &&
				!(action as { text?: string }).text?.trim()
			) {
				return null
			}
			actionCount++
			lastActionEnd = Date.now()
			return { ...action, complete: true, time: lastActionEnd - startTime }
		}

		// Read fullStream, not textStream: textStream drops error parts, so a failure partway through
		// a response would end the stream silently.
		for await (const part of result.fullStream) {
			if (part.type === 'error') throw part.error

			switch (part.type) {
				case 'text-delta': {
					if (open?.action._type !== 'message') {
						const closed = closeOpen()
						if (closed) yield closed
						open = {
							action: { _type: 'message', text: '' } as AgentAction,
							startTime: lastActionEnd,
						}
					}
					const action = open.action as AgentAction & { text: string }
					action.text += part.text
					if (action.text.trim()) {
						yield { ...action, complete: false, time: Date.now() - open.startTime }
					}
					break
				}
				case 'reasoning-start': {
					// The think action reaches the client with its first text.
					const closed = closeOpen()
					if (closed) yield closed
					open = {
						action: { _type: 'think', text: '' } as AgentAction,
						startTime: lastActionEnd,
						reasoning: true,
					}
					break
				}
				case 'reasoning-delta': {
					if (!open?.reasoning) break
					const action = open.action as AgentAction & { text: string }
					action.text += part.text
					if (action.text.trim()) {
						yield { ...action, complete: false, time: Date.now() - open.startTime }
					}
					break
				}
				case 'reasoning-end': {
					if (!open?.reasoning) break
					const closed = closeOpen()
					if (closed) yield closed
					break
				}
				case 'tool-input-start': {
					const closed = closeOpen()
					if (closed) yield closed
					open = {
						action: { _type: part.toolName } as AgentAction,
						startTime: lastActionEnd,
						input: '',
					}
					yield { ...open.action, complete: false, time: Date.now() - open.startTime }
					break
				}
				case 'tool-input-delta': {
					if (open?.input === undefined) break
					open.input += part.delta
					const partialInput = closeAndParseJson(open.input)
					if (!partialInput) break
					open.action = { ...partialInput, _type: open.action._type } as AgentAction
					yield { ...open.action, complete: false, time: Date.now() - open.startTime }
					break
				}
				case 'tool-call': {
					if (part.invalid) {
						// The SDK returns the error to the model, which usually calls the tool again.
						// Drop this call; the client reverts its partial changes when the next action
						// arrives or the stream ends.
						console.warn(`Invalid ${part.toolName} call from ${modelId}: ${String(part.error)}`)
						if (open?.input !== undefined) {
							open = null
						} else {
							const closed = closeOpen()
							if (closed) yield closed
						}
						break
					}
					// Some providers send a tool call without streaming its input first.
					let startTime: number
					if (open?.input !== undefined) {
						startTime = open.startTime
					} else {
						const closed = closeOpen()
						if (closed) yield closed
						startTime = lastActionEnd
					}
					open = {
						action: { ...(part.input as object), _type: part.toolName } as AgentAction,
						startTime,
					}
					const closed = closeOpen()
					if (closed) yield closed
					break
				}
			}
		}

		const closed = closeOpen()
		if (closed) yield closed

		// A reply with no action would otherwise end the stream with nothing to show.
		if (actionCount === 0) {
			const finishReason = await result.finishReason
			throw new Error(
				finishReason === 'content-filter'
					? "The model's safety filter declined this request."
					: 'The model replied without any actions.'
			)
		}
	}
}

/** Model requests per turn. Each step after the first sends the whole prompt again. */
const MAX_STEPS = 4

/**
 * One tool per action the mode allows, named by the action's `_type`. Messages are plain text, so
 * they have no tool. Every tool returns at once.
 */
function buildActionTools(prompt: AgentPrompt): ToolSet {
	const modePart = prompt.mode
	if (!modePart) throw new Error('A mode part is always required.')
	const tools: ToolSet = {}
	for (const type of modePart.actionTypes) {
		if (type === 'message') continue
		const schema = getActionSchemaForMode(type, modePart.modeType) as
			| z.ZodObject<{ _type: z.ZodLiteral<string> }>
			| undefined
		if (!schema) continue
		tools[type] = tool({
			description: (schema.meta() as ActionMeta | undefined)?.description,
			inputSchema: schema.omit({ _type: true }),
			// The client carries out the action. Data it gathers comes in a later request.
			execute: async () => 'Done. Any data this action gathers comes in your next request.',
		})
	}
	return tools
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
					// Stream thought summaries, which reach the client as think actions.
					thinkingConfig: { thinkingLevel: definition.thinkingLevel, includeThoughts: true },
				} satisfies GoogleGenerativeAIProviderOptions,
			}
		case 'openai':
			return {
				openai: {
					reasoningEffort: definition.reasoningEffort,
					// Stream reasoning summaries, which reach the client as think actions.
					reasoningSummary: 'auto',
					// Resend earlier response items in full instead of by id, so later steps of a turn also
					// work through gateways that keep no responses, such as OpenRouter.
					store: false,
				} satisfies OpenAIResponsesProviderOptions,
			}
	}
}
