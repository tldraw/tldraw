export interface AgentMessage {
	role: 'user' | 'assistant'
	content: AgentMessageContent[]
	priority: number // higher priority (lower numbers) appear later in the prompt
}

export interface AgentMessageContent {
	type: 'text' | 'image'
	text?: string
	image?: string
}
