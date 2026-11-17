export interface Environment {
	AGENT_DURABLE_OBJECT: DurableObjectNamespace
	OPENAI_API_KEY: string
	ANTHROPIC_API_KEY: string
	GOOGLE_API_KEY: string
	// Optional. When set, every model goes through OpenRouter and the provider keys are not used.
	OPENROUTER_API_KEY?: string
}
