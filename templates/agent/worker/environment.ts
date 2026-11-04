export interface Environment {
	AGENT_DURABLE_OBJECT: DurableObjectNamespace
	// Set the key for each provider you use. A model whose provider has no key goes through
	// OpenRouter.
	ANTHROPIC_API_KEY?: string
	GEMINI_API_KEY?: string
	OPENAI_API_KEY?: string
	OPENROUTER_API_KEY?: string
}
