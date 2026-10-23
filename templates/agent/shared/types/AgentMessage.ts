import type { AgentAction } from './AgentAction'

export interface AgentMessage {
	role: 'user' | 'assistant'
	content: AgentMessageContent[]
	priority: number // higher priority (lower numbers) appear later in the prompt
}

export interface AgentMessageContent {
	type: 'text' | 'image' | 'action'
	text?: string
	image?: string
	/** A past action, sent to the model as a call to that action's tool. */
	action?: AgentAction
}
