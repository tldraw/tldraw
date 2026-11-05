import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle, GoogleLanguageModelOptions, GoogleProvider } from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider, OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import {
	createOpenRouter,
	OpenRouterProvider,
	OpenRouterProviderOptions,
} from '@openrouter/ai-sdk-provider'
import {
	JSONParseError,
	LanguageModel,
	NoSuchToolError,
	parsePartialJson,
	streamText,
	tool,
	ToolSet,
	TypeValidationError,
} from 'ai'
import z from 'zod'
import { AgentModelDefinition, getAgentModelDefinition } from '../../shared/models'
import { DebugPart } from '../../shared/schema/PromptPartDefinitions'
import { ActionMeta, AgentAction, getActionSchemaForMode } from '../../shared/types/AgentAction'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { Streaming } from '../../shared/types/Streaming'
import { Environment } from '../environment'
import { buildMessages } from '../prompt/buildMessages'
import { buildSystemPrompt } from '../prompt/buildSystemPrompt'
import { getModelName } from '../prompt/getModelName'

export class AgentService {
	openai: OpenAIProvider
	anthropic: AnthropicProvider
	google: GoogleProvider
	// With an OpenRouter key, every model goes through OpenRouter and the provider keys are not used.
	openrouter: OpenRouterProvider | null

	constructor(env: Environment) {
		this.openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
		this.anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
		this.google = createGoogle({ apiKey: env.GOOGLE_API_KEY })
		this.openrouter = env.OPENROUTER_API_KEY
			? createOpenRouter({ apiKey: env.OPENROUTER_API_KEY })
			: null
	}

	getModel(definition: AgentModelDefinition): LanguageModel {
		if (this.openrouter) return this.openrouter(definition.openRouterId)
		return this[definition.provider](definition.id)
	}

	/**
	 * Stream the model's actions. `finish.toolCalls` receives the number of tool calls the model
	 * made, whose results the client sends back in its next request.
	 */
	async *stream(
		prompt: AgentPrompt,
		finish: { toolCalls: number }
	): AsyncGenerator<Streaming<AgentAction>> {
		try {
			for await (const event of this.streamActions(prompt, finish)) {
				yield event
			}
		} catch (error: any) {
			console.error('Stream error:', error)
			throw error
		}
	}

	private async *streamActions(
		prompt: AgentPrompt,
		finish: { toolCalls: number }
	): AsyncGenerator<Streaming<AgentAction>> {
		const modelName = getModelName(prompt)
		const modelDefinition = getAgentModelDefinition(modelName)
		const model = this.getModel(modelDefinition)
		const systemPrompt = buildSystemPrompt(prompt)
		const promptMessages = buildMessages(prompt)

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
			instructions: {
				role: 'system',
				content: systemPrompt,
				// Anthropic caches only up to an explicit breakpoint. One at the end of the system prompt
				// caches all of it. Only Claude gets it: OpenRouter sends the mark to any model.
				providerOptions:
					modelDefinition.provider === 'anthropic'
						? { anthropic: { cacheControl: { type: 'ephemeral' } } }
						: undefined,
			},
			messages: promptMessages,
			// The client carries out each tool call and sends the results in its next request.
			tools: buildActionTools(prompt),
			toolChoice: 'auto',
			maxOutputTokens: 8192,
			reasoning: modelDefinition.reasoning,
			providerOptions: this.openrouter
				? getOpenRouterProviderOptions(modelDefinition)
				: PROVIDER_OPTIONS,
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
		const closeOpen = (): Extract<Streaming<AgentAction>, { complete: true }> | null => {
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
		for await (const part of result.stream) {
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
					const { value } = await parsePartialJson(open.input)
					if (typeof value !== 'object' || value === null || Array.isArray(value)) break
					open.action = { ...value, _type: open.action._type } as AgentAction
					yield { ...open.action, complete: false, time: Date.now() - open.startTime }
					break
				}
				case 'tool-call': {
					finish.toolCalls++
					if (part.invalid) {
						console.warn(`Invalid ${part.toolName} call from ${modelName}: ${String(part.error)}`)
					}
					if (part.invalid && NoSuchToolError.isInstance(part.error)) {
						// The mode has no such action, so the client could not act on it. Drop the call; the
						// client reverts its partial changes when the next action arrives or the stream ends.
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
					// The input of an invalid call is the raw text when it is not JSON.
					const input = typeof part.input === 'object' && part.input !== null ? part.input : {}
					open = {
						action: { ...input, _type: part.toolName } as AgentAction,
						startTime,
					}
					const closed = closeOpen()
					if (!closed) break
					// The tools have no `execute`, so the SDK does not tell the model about an invalid call.
					// The client records the error as the call's result, without acting on it, and the
					// model reads it in the next step.
					yield part.invalid ? { ...closed, invalid: describeInvalidInput(part.error) } : closed
					break
				}
			}
		}

		const closed = closeOpen()
		if (closed) yield closed

		// A user's prompt must get an answer. On a follow-up step, an empty reply means the work is done.
		if (actionCount === 0 && prompt.messages?.requestSource !== 'self') {
			const finishReason = await result.finishReason
			throw new Error(
				finishReason === 'content-filter'
					? "The model's safety filter declined this request."
					: 'The model replied without any actions.'
			)
		}
	}
}

/** What is wrong with an invalid tool call's input, for the model to read and correct. */
function describeInvalidInput(error: unknown): string {
	const cause = (error as { cause?: unknown }).cause
	if (TypeValidationError.isInstance(cause) && cause.cause instanceof z.ZodError) {
		return `Invalid input, so nothing was done:\n${z.prettifyError(cause.cause)}`
	}
	if (JSONParseError.isInstance(cause)) {
		return 'Invalid input, so nothing was done: the input is not valid JSON.'
	}
	return `Invalid input, so nothing was done: ${error instanceof Error ? error.message : String(error)}`
}

/**
 * One tool per action the mode allows, named by the action's `_type`. Messages are plain text and
 * think actions are the model's own reasoning, so they have no tool. The tools have no `execute`:
 * the client carries them out.
 */
function buildActionTools(prompt: AgentPrompt): ToolSet {
	const modePart = prompt.mode
	if (!modePart) throw new Error('A mode part is always required.')
	const tools: ToolSet = {}
	for (const type of modePart.actionTypes) {
		if (type === 'message' || type === 'think') continue
		const schema = getActionSchemaForMode(type, modePart.modeType) as
			| z.ZodObject<{ _type: z.ZodLiteral<string> }>
			| undefined
		if (!schema) continue
		tools[type] = tool({
			description: (schema.meta() as ActionMeta | undefined)?.description,
			inputSchema: schema.omit({ _type: true }),
		})
	}
	return tools
}

type StreamTextProviderOptions = NonNullable<Parameters<typeof streamText>[0]['providerOptions']>

/**
 * Stream reasoning summaries, which reach the client as think actions. Each provider reads only its
 * own options.
 */
const PROVIDER_OPTIONS: StreamTextProviderOptions = {
	google: { thinkingConfig: { includeThoughts: true } } satisfies GoogleLanguageModelOptions,
	openai: { reasoningSummary: 'auto' } satisfies OpenAIResponsesProviderOptions,
}

/**
 * The OpenRouter provider does not read the AI SDK's `reasoning` option, so the effort goes in its
 * own options. OpenRouter has no `max` level, so `max` sends `xhigh`.
 */
function getOpenRouterProviderOptions(definition: AgentModelDefinition): StreamTextProviderOptions {
	const { reasoning } = definition
	if (!reasoning) return {}
	const effort = reasoning === 'max' ? 'xhigh' : reasoning
	return {
		openrouter: { reasoning: { effort } } satisfies OpenRouterProviderOptions,
	}
}
