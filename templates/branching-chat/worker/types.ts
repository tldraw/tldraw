export interface Environment {
	MY_DURABLE_OBJECT: DurableObjectNamespace
	OPENAI_API_KEY: string
	AI_GATEWAY_API_KEY: string
	LOG_LEVEL: 'debug' | 'none'
}
