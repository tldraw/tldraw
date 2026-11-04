import type { Api, Model, Tool, ToolCall } from '@earendil-works/pi-ai'
import { createModels, type MutableModels } from '@earendil-works/pi-ai/models'
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic'
import { googleProvider } from '@earendil-works/pi-ai/providers/google'
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai'
import { openrouterProvider } from '@earendil-works/pi-ai/providers/openrouter'
import z from 'zod'
import { AgentModelName } from '../../shared/models'
import { DebugPart } from '../../shared/schema/PromptPartDefinitions'
import { ActionMeta, AgentAction, getActionSchemaForMode } from '../../shared/types/AgentAction'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { Streaming } from '../../shared/types/Streaming'
import { Environment } from '../environment'
import { buildMessages } from '../prompt/buildMessages'
import { buildSystemPrompt } from '../prompt/buildSystemPrompt'
import { getModelName } from '../prompt/getModelName'

// OpenRouter ids that differ from the direct provider's `provider/id`.
const OPENROUTER_IDS: Partial<Record<AgentModelName, string>> = {
	'anthropic/claude-haiku-4-5': 'anthropic/claude-haiku-4.5',
}

export class AgentService {
	private models: MutableModels

	constructor(env: Environment) {
		// pi-ai reads each provider's key from its usual env var, such as `ANTHROPIC_API_KEY`.
		this.models = createModels({
			authContext: {
				env: async (name) =>
					(env as unknown as Record<string, string | undefined>)[name] || undefined,
				fileExists: async () => false,
			},
		})
		this.models.setProvider(anthropicProvider())
		this.models.setProvider(googleProvider())
		this.models.setProvider(openaiProvider())
		this.models.setProvider(openrouterProvider())
	}

	/** The model from its own provider when that provider has a key, or else from OpenRouter. */
	async getModel(name: AgentModelName): Promise<Model<Api>> {
		const [provider, id] = name.split('/') as [string, string]
		const model = (await this.models.getAuth(provider))
			? this.models.getModel(provider, id)
			: this.models.getModel('openrouter', OPENROUTER_IDS[name] ?? name)
		if (!model) throw new Error(`Model ${name} not found`)
		return model
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
		const model = await this.getModel(modelName)
		const systemPrompt = buildSystemPrompt(prompt)
		const { messages, afterHistory } = buildMessages(prompt, model)
		const { tools, schemas } = buildActionTools(prompt)

		// Check for debug flags and log if enabled
		const debugPart = prompt.debug as DebugPart | undefined
		if (debugPart) {
			if (debugPart.logSystemPrompt) {
				console.log('[DEBUG] System Prompt:\n', systemPrompt)
			}
			if (debugPart.logMessages) {
				console.log('[DEBUG] Messages:\n', JSON.stringify(messages, null, 2))
			}
		}

		const result = this.models.streamSimple(
			model,
			// The client carries out each tool call and sends the results in its next request.
			{ systemPrompt, messages, tools },
			{
				reasoning: 'medium',
				onPayload: (payload, payloadModel) =>
					payloadModel.api === 'anthropic-messages' && afterHistory
						? markHistoryForCache(payload as AnthropicPayload, afterHistory)
						: undefined,
			}
		)

		// Text becomes a message action, the model's own reasoning a think action, and each tool call
		// the action it names. The client applies one action at a time, so one block streams as partial
		// until it ends or until another block has new content. pi-ai can add text to a block after a
		// later block starts, so text that arrives after its block was closed becomes a new action.
		// `closeOpen` sets `open` to null, so TypeScript must not narrow it from this initializer.
		let open = null as {
			index: number
			action: AgentAction
			startTime: number
			/** Where this action's text starts in its block. */
			from?: number
			call?: ToolCall
		} | null
		// How much of each text and thinking block earlier actions sent.
		const sentText = new Map<number, number>()
		const closedCalls = new Set<number>()
		let actionCount = 0
		// Each action is timed from the end of the one before it, and the first from the request, so
		// the times add up to the whole turn, including waits for the provider.
		let lastActionEnd = Date.now()
		const closeOpen = (): Extract<Streaming<AgentAction>, { complete: true }> | null => {
			if (!open) return null
			const { index, action, startTime, from, call } = open
			open = null
			if (call) {
				closedCalls.add(index)
				finish.toolCalls++
				const schema = schemas[call.name]
				if (!schema) {
					// The mode has no such action, so the client could not act on it. Drop the call.
					console.warn(`Invalid ${call.name} call from ${modelName}: no such tool`)
					return null
				}
				const invalid = call.argumentsError
					? 'Invalid input, so nothing was done: the input is not valid JSON.'
					: describeInvalidInput(schema.safeParse(call.arguments))
				actionCount++
				lastActionEnd = Date.now()
				const closed = { ...action, complete: true, time: lastActionEnd - startTime } as const
				if (!invalid) return closed
				console.warn(`Invalid ${call.name} call from ${modelName}: ${invalid}`)
				// The client records the error as the call's result, without acting on it, and the model
				// reads it in the next step.
				return { ...closed, invalid }
			}
			const text = (action as { text: string }).text
			sentText.set(index, (from ?? 0) + text.length)
			// Whitespace between tool calls is not a message.
			if (!text.trim()) return null
			actionCount++
			lastActionEnd = Date.now()
			return { ...action, complete: true, time: lastActionEnd - startTime }
		}

		for await (const event of result) {
			if (event.type === 'error') {
				const { rawStopReason, errorMessage } = event.error
				throw new Error(
					rawStopReason?.match(/content.?filter|refusal|safety|prohibited/i)
						? "The model's safety filter declined this request."
						: (errorMessage ?? 'The model failed.'),
					{ cause: event.error }
				)
			}
			if (event.type === 'start' || event.type === 'done') continue

			// The partial message holds each block's content so far, with tool input parsed.
			const index = event.contentIndex
			const block = event.type === 'toolcall_end' ? event.toolCall : event.partial.content[index]
			if (block.type === 'toolCall' && closedCalls.has(index)) continue
			if (open?.index !== index) {
				const from = block.type === 'toolCall' ? undefined : (sentText.get(index) ?? 0)
				const fullText =
					block.type === 'text' ? block.text : block.type === 'thinking' ? block.thinking : ''
				// A text or thinking block takes over only once it has something new to show.
				if (from !== undefined && !fullText.slice(from).trim()) continue
				// Providers finish a tool call's input before they start another block, so a call that
				// another block interrupts is complete.
				const closed = closeOpen()
				if (closed) yield closed
				open = { index, action: {} as AgentAction, startTime: lastActionEnd, from }
			}
			if (block.type === 'toolCall') {
				open.call = block
				open.action = { ...block.arguments, _type: block.name } as AgentAction
			} else {
				open.action = {
					_type: block.type === 'text' ? 'message' : 'think',
					text: (block.type === 'text' ? block.text : block.thinking).slice(open.from),
				} as AgentAction
			}

			if (event.type.endsWith('_end')) {
				const closed = closeOpen()
				if (closed) yield closed
				continue
			}
			if (block.type !== 'toolCall' || schemas[block.name]) {
				yield { ...open.action, complete: false, time: Date.now() - open.startTime }
			}
		}

		const closed = closeOpen()
		if (closed) yield closed

		// A user's prompt must get an answer. On a follow-up step, an empty reply means the work is done.
		if (actionCount === 0 && prompt.messages?.requestSource !== 'self') {
			throw new Error('The model replied without any actions.')
		}
	}
}

interface AnthropicBlock {
	type: string
	text?: string
	cache_control?: unknown
}
interface AnthropicPayload {
	messages: { content: string | AnthropicBlock[] }[]
}

/**
 * Claude caches the request up to a marked block. pi-ai marks the last message, but that is the
 * canvas context, which changes on every request, so the next request never reads that cache.
 * Move the mark to the end of the chat history, which the next request repeats.
 */
function markHistoryForCache(payload: AnthropicPayload, afterHistory: string): AnthropicPayload {
	const { messages } = payload
	const last = messages.at(-1)?.content
	const mark = Array.isArray(last) ? last.at(-1)?.cache_control : undefined
	if (!mark || !Array.isArray(last)) return payload
	for (let i = messages.length - 1; i >= 0; i--) {
		const content = messages[i].content
		if (!Array.isArray(content)) continue
		const j = content.findIndex((b) => b.type === 'text' && b.text === afterHistory)
		if (j === -1) continue
		let lastOfHistory: AnthropicBlock | undefined = content[j - 1]
		if (!lastOfHistory && i > 0) {
			const previous = messages[i - 1]
			if (typeof previous.content === 'string') {
				previous.content = [{ type: 'text', text: previous.content }]
			}
			lastOfHistory = previous.content.at(-1)
		}
		if (!lastOfHistory) return payload
		delete last.at(-1)!.cache_control
		lastOfHistory.cache_control = mark
		return payload
	}
	return payload
}

/** What is wrong with an invalid tool call's input, for the model to read and correct. */
function describeInvalidInput(parsed: z.ZodSafeParseResult<unknown>): string | undefined {
	if (parsed.success) return undefined
	return `Invalid input, so nothing was done:\n${z.prettifyError(parsed.error)}`
}

/**
 * One tool per action the mode allows, named by the action's `_type`, and the schema that checks
 * each tool's input. Messages are plain text and think actions are the model's own reasoning, so
 * they have no tool. The client carries out each call.
 */
function buildActionTools(prompt: AgentPrompt): {
	tools: Tool[]
	schemas: Record<string, z.ZodType>
} {
	const modePart = prompt.mode
	if (!modePart) throw new Error('A mode part is always required.')
	const tools: Tool[] = []
	const schemas: Record<string, z.ZodType> = {}
	for (const type of modePart.actionTypes) {
		if (type === 'message' || type === 'think') continue
		const schema = getActionSchemaForMode(type, modePart.modeType) as
			| z.ZodObject<{ _type: z.ZodLiteral<string> }>
			| undefined
		if (!schema) continue
		const inputSchema = schema.omit({ _type: true })
		schemas[type] = inputSchema
		tools.push({
			name: type,
			description: (schema.meta() as ActionMeta | undefined)?.description ?? '',
			parameters: z.toJSONSchema(inputSchema),
		})
	}
	return { tools, schemas }
}
