import type { Api, AssistantMessage, Model, Tool, ToolCall } from '@earendil-works/pi-ai'
import { createModels } from '@earendil-works/pi-ai/models'
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic'
import { googleProvider } from '@earendil-works/pi-ai/providers/google'
import { openaiProvider } from '@earendil-works/pi-ai/providers/openai'
import { openrouterProvider } from '@earendil-works/pi-ai/providers/openrouter'
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

const models = createModels()
models.setProvider(anthropicProvider())
models.setProvider(googleProvider())
models.setProvider(openaiProvider())
models.setProvider(openrouterProvider())

export class AgentService {
	constructor(private env: Environment) {}

	/**
	 * The model and API key for a definition. With an OpenRouter key, every model goes through
	 * OpenRouter and the provider keys are not used.
	 */
	getModel(definition: AgentModelDefinition): { model: Model<Api>; apiKey: string } {
		const route = this.env.OPENROUTER_API_KEY
			? { provider: 'openrouter', id: definition.openRouterId, apiKey: this.env.OPENROUTER_API_KEY }
			: {
					provider: definition.provider,
					id: definition.id,
					apiKey: {
						anthropic: this.env.ANTHROPIC_API_KEY,
						google: this.env.GOOGLE_API_KEY,
						openai: this.env.OPENAI_API_KEY,
					}[definition.provider],
				}
		const model = models.getModel(route.provider, route.id)
		if (!model) throw new Error(`Model ${route.id} not found for ${route.provider}`)
		return { model, apiKey: route.apiKey }
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
		const { model, apiKey } = this.getModel(modelDefinition)
		const systemPrompt = buildSystemPrompt(prompt)
		const messages = buildMessages(prompt, model)
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

		const result = models.streamSimple(
			model,
			// The client carries out each tool call and sends the results in its next request.
			{ systemPrompt, messages, tools },
			{
				apiKey,
				maxTokens: 8192,
				reasoning: modelDefinition.reasoning,
				...(modelDefinition.thinkingBudget
					? {
							thinkingBudgets: {
								[modelDefinition.reasoning ?? 'low']: modelDefinition.thinkingBudget,
							},
						}
					: {}),
				// Opus 4.7+ removed `temperature` (and top_p/top_k), and Anthropic takes none while a model
				// thinks; sending it returns a 400.
				...(modelDefinition.supportsTemperature ? { temperature: 0 } : {}),
			}
		)

		// Text becomes a message action, the model's own reasoning a think action, and each tool call
		// the action it names. One block is open at a time: it streams as partial, then closes when it
		// ends or when the model starts another block. pi-ai can start a block before it ends the one
		// before it, so a closed block's later events are ignored.
		// `closeOpen` sets `open` to null, so TypeScript must not narrow it from this initializer.
		let open = null as {
			index: number
			action: AgentAction
			startTime: number
			call?: ToolCall
		} | null
		const closedBlocks = new Set<number>()
		let actionCount = 0
		// Each action is timed from the end of the one before it, and the first from the request, so
		// the times add up to the whole turn, including waits for the provider.
		let lastActionEnd = Date.now()
		const closeOpen = (): Extract<Streaming<AgentAction>, { complete: true }> | null => {
			if (!open) return null
			const { index, action, startTime, call } = open
			open = null
			closedBlocks.add(index)
			if (call) {
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
			// Whitespace between tool calls is not a message, and reasoning with no text is not worth
			// showing.
			if (!(action as { text?: string }).text?.trim()) return null
			actionCount++
			lastActionEnd = Date.now()
			return { ...action, complete: true, time: lastActionEnd - startTime }
		}

		let final: AssistantMessage | null = null
		for await (const event of result) {
			if (event.type === 'error') throw new Error(event.error.errorMessage ?? 'The model failed.')
			if (event.type === 'done') {
				final = event.message
				break
			}
			if (event.type === 'start' || closedBlocks.has(event.contentIndex)) continue

			if (open?.index !== event.contentIndex) {
				const closed = closeOpen()
				if (closed) yield closed
				open = { index: event.contentIndex, action: {} as AgentAction, startTime: lastActionEnd }
			}
			// The partial message holds each block's content so far, with tool input parsed.
			const block =
				event.type === 'toolcall_end' ? event.toolCall : event.partial.content[event.contentIndex]
			if (block.type === 'toolCall') {
				open.call = block
				open.action = { ...block.arguments, _type: block.name } as AgentAction
			} else {
				open.action = {
					_type: block.type === 'text' ? 'message' : 'think',
					text: block.type === 'text' ? block.text : block.thinking,
				} as AgentAction
			}

			if (event.type.endsWith('_end')) {
				const closed = closeOpen()
				if (closed) yield closed
				continue
			}
			const streams =
				block.type === 'toolCall'
					? !!schemas[block.name]
					: !!(open.action as { text?: string }).text?.trim()
			if (streams) yield { ...open.action, complete: false, time: Date.now() - open.startTime }
		}

		const closed = closeOpen()
		if (closed) yield closed

		// A user's prompt must get an answer. On a follow-up step, an empty reply means the work is done.
		if (actionCount === 0 && prompt.messages?.requestSource !== 'self') {
			throw new Error(
				final?.rawStopReason?.match(/content.?filter|refusal|safety/i)
					? "The model's safety filter declined this request."
					: 'The model replied without any actions.'
			)
		}
	}
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
			// pi-ai takes the parameters as JSON Schema.
			parameters: z.toJSONSchema(inputSchema) as Tool['parameters'],
		})
	}
	return { tools, schemas }
}
