export interface Environment {
	GOOGLE_API_KEY: string
	// Optional. When set, requests go through OpenRouter and GOOGLE_API_KEY is not used.
	OPENROUTER_API_KEY?: string
	LOG_LEVEL: 'debug' | 'none'
}
