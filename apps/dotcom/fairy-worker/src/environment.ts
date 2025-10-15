export interface Environment {
	AGENT_DURABLE_OBJECT: DurableObjectNamespace
	OPENAI_API_KEY: string
	ANTHROPIC_API_KEY: string
	GOOGLE_API_KEY: string
	SENTRY_DSN: string | undefined
	IS_LOCAL: string | undefined
	CLERK_SECRET_KEY: string
	CLERK_PUBLISHABLE_KEY: string
}
