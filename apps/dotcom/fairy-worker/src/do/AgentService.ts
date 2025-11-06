import { AnthropicProvider, AnthropicProviderOptions, createAnthropic } from '@ai-sdk/anthropic'
import {
	createGoogleGenerativeAI,
	GoogleGenerativeAIProvider,
	GoogleGenerativeAIProviderOptions,
} from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { AgentAction, AgentPrompt, DebugPart, Streaming } from '@tldraw/fairy-shared'
import { LanguageModel, streamText } from 'ai'
import { Environment } from '../environment'
import { buildMessages } from '../prompt/buildMessages'
import { buildSystemPrompt, buildSystemPromptWithoutSchema } from '../prompt/buildSystemPrompt'
import { closeAndParseJson } from './closeAndParseJson'
import { createNotionMCPClient } from './mcp'
import { AgentModelName, FAIRY_MODEL_NAME, getAgentModelDefinition } from './models'

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

	async testNotionMCP() {
		await createNotionMCPClient()
	}

	async *streamActions(
		prompt: AgentPrompt,
		isAdmin = false
	): AsyncGenerator<Streaming<AgentAction>> {
		try {
			const model = this.getModel(FAIRY_MODEL_NAME)
			for await (const action of _streamActions(model, prompt, isAdmin)) {
				yield action
			}
		} catch (error: any) {
			console.error('Stream error:', error)
			throw error
		}
	}

	async *streamText(prompt: AgentPrompt): AsyncGenerator<string> {
		try {
			const model = this.getModel(FAIRY_MODEL_NAME)
			for await (const text of _streamText(model, prompt)) {
				yield text
			}
		} catch (error: any) {
			console.error('Stream text error:', error)
			throw error
		}
	}
}

async function* _streamText(model: LanguageModel, prompt: AgentPrompt): AsyncGenerator<string> {
	if (typeof model === 'string') {
		throw new Error('Model is a string, not a LanguageModel')
	}

	const geminiThinkingBudget = model.modelId === 'gemini-2.5-pro' ? 128 : 0

	const messages = buildMessages(prompt)
	const systemPrompt = buildSystemPrompt(prompt) || 'You are a helpful assistant.'

	// Debug logging
	const debugPart = prompt.debug
	if (debugPart) {
		if (debugPart.logSystemPrompt) {
			const promptWithoutSchema = buildSystemPromptWithoutSchema(prompt)
			console.warn('[DEBUG] System Prompt (without schema):\n', promptWithoutSchema)
		}
		if (debugPart.logMessages) {
			const sanitizedMessages = sanitizeMessagesForLogging(messages)
			console.warn('[DEBUG] Messages:\n', JSON.stringify(sanitizedMessages, null, 2))
		}
	}

	try {
		const result = streamText({
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

		for await (const text of result.textStream) {
			yield text
		}

		// After streaming is complete, get usage information
		await result.usage
		// Note: Usage is tracked but not currently logged for text streams
	} catch (error: any) {
		console.error('streamEventsVercel error:', error)
		throw error
	}
}

async function* _streamActions(
	model: LanguageModel,
	prompt: AgentPrompt,
	isAdmin: boolean
): AsyncGenerator<Streaming<AgentAction>> {
	if (typeof model === 'string') {
		throw new Error('Model is a string, not a LanguageModel')
	}

	const geminiThinkingBudget = model.modelId === 'gemini-2.5-pro' ? 128 : 0

	const messages = buildMessages(prompt)
	const systemPrompt = buildSystemPrompt(prompt)

	// Check for debug flags
	const debugPart = prompt.debug as DebugPart | undefined
	if (debugPart) {
		if (debugPart.logSystemPrompt) {
			const promptWithoutSchema = buildSystemPromptWithoutSchema(prompt)
			console.warn('[DEBUG] System Prompt (without schema):\n', promptWithoutSchema)
		}
		if (debugPart.logMessages) {
			const sanitizedMessages = sanitizeMessagesForLogging(messages)
			console.warn('[DEBUG] Messages:\n', JSON.stringify(sanitizedMessages, null, 2))
		}
	}

	try {
		messages.push({
			role: 'assistant',
			content: '{"actions": [{"_type":',
		})
		const result = streamText({
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
		for await (const text of result.textStream) {
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

		// After streaming is complete, get usage information and yield it (only for admins)
		if (isAdmin) {
			const usage = await result.usage

			// Yield usage information as a special metadata action (only for @tldraw.com admins)
			yield {
				_type: '__usage__',
				complete: true,
				time: 0,
				usage,
			} as any
		}
	} catch (error: any) {
		console.error('streamEventsVercel error:', error)
		throw error
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
