import type {
	Api,
	AssistantMessage,
	ImageContent,
	Message,
	Model,
	TextContent,
	ToolCall,
} from '@earendil-works/pi-ai'
import { AgentMessage, AgentMessageContent } from '../../shared/types/AgentMessage'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { getPromptPartDefinition, PromptPart } from '../../shared/types/PromptPart'

/** Build the model's messages from the prompt. `model` is the model the messages are sent to. */
export function buildMessages(prompt: AgentPrompt, model: Model<Api>): Message[] {
	const allMessages: AgentMessage[] = []

	// Build messages from each prompt part using shared definitions
	for (const part of Object.values(prompt)) {
		const messages = buildMessagesFromPart(part)
		allMessages.push(...messages)
	}

	// Sort by priority (higher priority = later in prompt)
	allMessages.sort((a, b) => a.priority - b.priority)

	return toModelMessages(allMessages, model)
}

/**
 * Build messages from a prompt part using its definition.
 * This is used by the worker to convert prompt parts into messages for the model.
 */
function buildMessagesFromPart(part: PromptPart): AgentMessage[] {
	const definition = getPromptPartDefinition(part.type)

	// If the definition has a custom buildMessages function, use it
	if (definition.buildMessages) {
		return definition.buildMessages(part)
	}

	// Otherwise, use the default logic with buildContent
	return defaultBuildMessagesFromPart(part)
}

/**
 * Default message building logic that uses buildContent.
 */
function defaultBuildMessagesFromPart(part: PromptPart): AgentMessage[] {
	const definition = getPromptPartDefinition(part.type)

	// Get content strings from the definition
	const content = definition.buildContent ? definition.buildContent(part) : []

	if (!content || content.length === 0) {
		return []
	}

	// Convert content strings to message content (handling images)
	const messageContent: AgentMessageContent[] = []
	for (const item of content) {
		if (typeof item === 'string' && item.startsWith('data:image/')) {
			messageContent.push({
				type: 'image',
				image: item,
			})
		} else {
			messageContent.push({
				type: 'text',
				text: item,
			})
		}
	}

	// Get priority from definition (default to 0)
	const priority = definition.priority ?? 0

	return [{ role: 'user', content: messageContent, priority }]
}

/**
 * Convert AgentMessage[] to the model's messages. Past actions become calls to their tools.
 * Consecutive actions share one assistant turn, followed by one result message per call: a long
 * history of one call per turn teaches some models (Gemini) to make one call per response. Any other
 * message ends the turn, including an empty one, such as the prompt of a request that only sends
 * results back. So each response keeps its own turn, and later requests repeat it unchanged.
 */
function toModelMessages(agentMessages: AgentMessage[], model: Model<Api>): Message[] {
	const messages: Message[] = []
	let toolCallCount = 0
	// The tool-call turn that the next actions join, until another message comes between.
	let toolTurn: AssistantMessage | null = null
	const timestamp = Date.now()

	for (const tlMessage of agentMessages) {
		const content: (TextContent | ImageContent)[] = []
		const toolCalls: { call: ToolCall; result: string }[] = []

		for (const contentItem of tlMessage.content) {
			if (contentItem.type === 'image') {
				content.push(toImageContent(contentItem.image!))
			} else if (contentItem.type === 'action') {
				const { _type, ...input } = contentItem.action!
				toolCalls.push({
					call: {
						type: 'toolCall',
						id: `history-${toolCallCount++}`,
						name: _type,
						arguments: input as ToolCall['arguments'],
					},
					result: contentItem.result ?? 'Done.',
				})
			} else {
				content.push({ type: 'text', text: contentItem.text! })
			}
		}

		if (toolCalls.length === 0 || content.length > 0) toolTurn = null
		if (content.length > 0) {
			messages.push(
				tlMessage.role === 'user'
					? { role: 'user', content, timestamp }
					: assistantMessage(
							model,
							content.filter((c) => c.type === 'text'),
							timestamp
						)
			)
		}
		if (toolCalls.length > 0) {
			if (!toolTurn) {
				toolTurn = assistantMessage(model, [], timestamp)
				messages.push(toolTurn)
			}
			for (const { call, result } of toolCalls) {
				toolTurn.content.push(call)
				// The turn is the last message, so its results stay after all of its calls.
				messages.push({
					role: 'toolResult',
					toolCallId: call.id,
					toolName: call.name,
					content: [{ type: 'text', text: result }],
					isError: false,
					timestamp,
				})
			}
		}
	}

	return messages
}

/** A past assistant turn, marked as the model's own so its tool calls are sent unchanged. */
function assistantMessage(
	model: Model<Api>,
	content: AssistantMessage['content'],
	timestamp: number
): AssistantMessage {
	return {
		role: 'assistant',
		content,
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: 'toolUse',
		timestamp,
	}
}

/** Split a data URL, such as `data:image/png;base64,iVBOR…`, into its type and base64 data. */
function toImageContent(dataUrl: string): ImageContent {
	const match = dataUrl.match(/^data:([^;,]+);base64,(.*)$/s)
	if (!match) throw new Error('Images must be base64 data URLs.')
	return { type: 'image', mimeType: match[1], data: match[2] }
}
