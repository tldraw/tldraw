export interface Environment {
	AGENT_DURABLE_OBJECT: DurableObjectNamespace
	OPENAI_API_KEY: string
	ANTHROPIC_API_KEY: string
	GOOGLE_API_KEY: string
	// Optional. Point the OpenAI or Anthropic provider at a compatible gateway, such as OpenRouter.
	OPENAI_BASE_URL?: string
	ANTHROPIC_BASE_URL?: string
}
