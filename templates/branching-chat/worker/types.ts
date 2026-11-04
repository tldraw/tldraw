export interface Environment {
	// Set one of these. Without GEMINI_API_KEY, requests go through OpenRouter.
	GEMINI_API_KEY?: string
	OPENROUTER_API_KEY?: string
	LOG_LEVEL: 'debug' | 'none'
}

export interface ChatMessage {
	role: 'user' | 'assistant'
	content: string
}
