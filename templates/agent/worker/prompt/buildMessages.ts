import { ImagePart, ModelMessage, TextPart, ToolCallPart, ToolResultPart } from 'ai'
import { CHAT_HISTORY_PRIORITY } from '../../shared/schema/PromptPartDefinitions'
import { AgentMessage, AgentMessageContent } from '../../shared/types/AgentMessage'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { getPromptPartDefinition, PromptPart } from '../../shared/types/PromptPart'

export function buildMessages(prompt: AgentPrompt): ModelMessage[] {
	const allMessages: AgentMessage[] = []

	// Build messages from each prompt part using shared definitions
	for (const part of Object.values(prompt)) {
		const messages = buildMessagesFromPart(part)
		allMessages.push(...messages)
	}

	// Sort by priority (higher priority = later in prompt)
	allMessages.sort((a, b) => a.priority - b.priority)

	const history = toModelMessages(allMessages.filter((m) => m.priority === CHAT_HISTORY_PRIORITY))
	const rest = toModelMessages(allMessages.filter((m) => m.priority !== CHAT_HISTORY_PRIORITY))

	// Claude caches only up to a marked message. The next request repeats the history and adds to it.
	const lastHistoryMessage = history.at(-1)
	if (lastHistoryMessage) {
		lastHistoryMessage.providerOptions = { anthropic: { cacheControl: { type: 'ephemeral' } } }
	}

	return [...history, ...rest]
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
 * Convert AgentMessage[] to ModelMessage[] for the AI SDK. Past actions become calls to their tools.
 * Consecutive actions share one assistant turn, followed by one message with every result: a long
 * history of one call per turn teaches some models (Gemini) to make one call per response. Any other
 * message ends the turn, including an empty one, such as the prompt of a request that only sends
 * results back. So each response keeps its own turn, and later requests repeat it unchanged.
 */
function toModelMessages(agentMessages: AgentMessage[]): ModelMessage[] {
	const messages: ModelMessage[] = []
	let toolCallCount = 0
	// The tool-call turn that the next actions join, until another message comes between.
	let toolTurn: { calls: ToolCallPart[]; results: ToolResultPart[] } | null = null

	for (const tlMessage of agentMessages) {
		const content: (TextPart | ImagePart)[] = []
		const toolCalls: { call: ToolCallPart; result: string }[] = []

		for (const contentItem of tlMessage.content) {
			if (contentItem.type === 'image') {
				content.push({ type: 'image', image: contentItem.image! })
			} else if (contentItem.type === 'action') {
				const { _type, ...input } = contentItem.action!
				toolCalls.push({
					call: {
						type: 'tool-call',
						toolCallId: `history-${toolCallCount++}`,
						toolName: _type,
						input,
					},
					result: contentItem.result ?? 'Done.',
				})
			} else {
				content.push({ type: 'text', text: contentItem.text! })
			}
		}

		if (toolCalls.length === 0) toolTurn = null
		if (content.length > 0) {
			messages.push({ role: tlMessage.role, content } as ModelMessage)
		}
		if (toolCalls.length > 0) {
			if (!toolTurn) {
				toolTurn = { calls: [], results: [] }
				messages.push({ role: 'assistant', content: toolTurn.calls })
				messages.push({ role: 'tool', content: toolTurn.results })
			}
			for (const { call, result } of toolCalls) {
				toolTurn.calls.push(call)
				toolTurn.results.push({
					type: 'tool-result',
					toolCallId: call.toolCallId,
					toolName: call.toolName,
					output: { type: 'text', value: result },
				})
			}
		}
	}

	return messages
}
