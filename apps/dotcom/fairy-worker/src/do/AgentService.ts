import { AnthropicProvider, AnthropicProviderOptions, createAnthropic } from '@ai-sdk/anthropic'
import {
	createGoogleGenerativeAI,
	GoogleGenerativeAIProvider,
	GoogleGenerativeAIProviderOptions,
} from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider, OpenAIResponsesProviderOptions } from '@ai-sdk/openai'
import {
	AgentAction,
	AgentModelName,
	AgentPrompt,
	DebugPart,
	Streaming,
} from '@tldraw/fairy-shared'
import { LanguageModel, ModelMessage, streamText } from 'ai'
import { INTERNAL_BASE_URL } from '../constants'
import { Environment } from '../environment'
import { buildMessages } from '../prompt/buildMessages'
import { buildSystemPrompt } from '../prompt/buildSystemPrompt'
import { getModelName } from '../prompt/getModelName'
import { closeAndParseJson } from './closeAndParseJson'
import {
	getAgentModelDefinition,
	getGenerationCostFromUsageAndMetaData,
	isAgentModelName,
} from './models'

export class AgentService {
	private readonly env: Environment
	openai: OpenAIProvider
	anthropic: AnthropicProvider
	google: GoogleGenerativeAIProvider

	constructor(env: Environment) {
		this.env = env
		this.openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
		this.anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
		this.google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
	}

	getModel(modelName: AgentModelName): LanguageModel {
		const modelDefinition = getAgentModelDefinition(modelName)
		const provider = modelDefinition.provider
		return this[provider](modelDefinition.id)
	}

	private async handleFinish(
		modelId: AgentModelName,
		usage: any,
		providerMetadata: any,
		userStub: ReturnType<Environment['TL_USER']['get']>,
		userId: string
	): Promise<void> {
		if (!providerMetadata) {
			console.warn('No provider metadata found (this should probably not be happening).')
			return
		}

		const cost = getGenerationCostFromUsageAndMetaData(modelId, usage, providerMetadata)
		console.warn(`Cost for request to ${modelId}: $${cost.toFixed(3)}`)

		if (cost <= 0) return

		try {
			const recordRes = await userStub.fetch(
				`${INTERNAL_BASE_URL}/app/${userId}/fairy/record-usage`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ actualCost: cost }),
				}
			)

			if (!recordRes.ok) {
				try {
					const errorData = (await recordRes.json()) as { error: string }
					console.error('Failed to record usage:', errorData.error)
				} catch {
					console.error('Failed to parse usage recording error response')
				}
			}
		} catch (recordError) {
			console.error('Exception recording usage:', recordError)
		}
	}

	async *streamActions(
		prompt: AgentPrompt,
		signal: AbortSignal | undefined,
		userId: string,
		userStub: ReturnType<Environment['TL_USER']['get']>
	): AsyncGenerator<Streaming<AgentAction>> {
		try {
			const modelName = getModelName(prompt, this.env)
			const model = this.getModel(modelName)

			if (typeof model === 'string') {
				throw new Error('Model is a string, not a LanguageModel')
			}

			const { modelId, provider } = model
			if (!isAgentModelName(modelId)) {
				throw new Error(`Model ${modelId} is not in AGENT_MODEL_DEFINITIONS`)
			}

			if (provider === 'openai.responses') {
				console.warn(
					'Using openai will severely undercount token usage because it only gets usage for the last prompt in a loop. Not sure why this happens.'
				)
			}

			// Build the messages that we'll send to the model
			const messages: ModelMessage[] = []

			// Build the system prompt
			const systemPrompt = buildSystemPrompt(prompt, { withSchema: true })

			if (provider === 'anthropic.messages') {
				// at time of recording, anthropic does not offer implicit caching like deepmind and openai do.
				// to cache, we set breakpoints in messages we send to the model. breakpoints cache all input up to and including that message. the cached hash of each block affected by the content of all previous blocks. the model checks back 20 blocks from the breakpoint looking for a match. because the hash depends on previous content, it will not find a match until it finds a block where all previous blocks are unchanged. if it goes more than 20 blocks with no match, it jumps backwards to the next earlier breakpoint.
				// we put one breakpoint at the end of the system prompt. we concatenate all system prompt parts instead of splitting them into individual messages to make sure they hit the minimum cache length (1024 tokens for sonnet 4.5). we can also do this because parts of the system prompt generally all change together in predictable ways.
				// if we put the chat history back at the beginning of the prompt parts, we could set a breakpoint at the end of chat history
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

			// Additional prompt messages (from parts)
			const promptMessages = buildMessages(prompt)
			messages.push(...promptMessages)

			// Check for debug flags
			const debugPart = prompt.debug as DebugPart | undefined
			if (debugPart) {
				if (debugPart.logSystemPrompt) {
					const promptWithoutSchema = buildSystemPrompt(prompt, { withSchema: false })
					console.warn('[DEBUG] System Prompt (without schema):\n', promptWithoutSchema)
				}
				if (debugPart.logMessages) {
					const sanitizedMessages = sanitizeMessagesForLogging(promptMessages)
					console.warn('[DEBUG] Messages:\n', JSON.stringify(sanitizedMessages, null, 2))
				}
			}

			// Add the assistant message to indicate the start of the actions

			messages.push({
				role: 'assistant',
				content: '{"actions": [{"_type":',
			})

			// -1 means dynamic budget
			// 128 is minimum for 2.5 pro - we're not sure if this is too low
			const geminiThinkingBudget = modelId === 'gemini-3-pro-preview' ? 256 : 0

			const gptThinkingBudget = modelId === 'gpt-5.1' ? 'none' : 'minimal'

			const result = streamText({
				model,
				messages,
				maxOutputTokens: 8192,
				temperature: 0,
				abortSignal: signal,
				providerOptions: {
					anthropic: {
						thinking: { type: 'disabled' },
					} satisfies AnthropicProviderOptions,
					google: {
						thinkingConfig: { thinkingBudget: geminiThinkingBudget },
					} satisfies GoogleGenerativeAIProviderOptions,
					openai: {
						reasoningEffort: gptThinkingBudget,
					} satisfies OpenAIResponsesProviderOptions,
				},
				onAbort() {
					console.warn('Stream actions aborted')
				},
				onError: (e) => {
					console.error('Stream text error:', e)
					throw e
				},
				onFinish: async (e) => {
					await this.handleFinish(modelId, e.usage, e.providerMetadata, userStub, userId)
				},
			})

			const canForceResponseStart =
				provider === 'anthropic.messages' || provider === 'google.generative-ai'
			let buffer = canForceResponseStart ? '{"actions": [{"_type":' : ''
			let cursor = 0
			let maybeIncompleteAction: AgentAction | null = null

			let startTime = Date.now()
			for await (const text of result.textStream) {
				if (signal?.aborted) break
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

			// Await usage to ensure onFinish callback completes
			await result.usage
		} catch (error: any) {
			// Check if it was aborted
			if (signal?.aborted || error?.name === 'AbortError') {
				return
			}
			console.error('Stream error:', error)
			throw error
		}
	}
}

/**
 * Sanitize messages for logging by replacing image content with "<image data removed>"
 */
function sanitizeMessagesForLogging(messages: any[]): any[] {
	return messages.map((message) => {
		if (!message.content || !Array.isArray(message.content)) {
			return message
		}

		const sanitizedContent = message.content.map((item: any) => {
			if (item.type === 'image') {
				return {
					...item,
					image: '<image data removed>',
				}
			}
			return item
		})

		return {
			...message,
			content: sanitizedContent,
		}
	})
}
