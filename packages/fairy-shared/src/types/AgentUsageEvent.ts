/**
 * Event sent by the worker to the client containing token usage information
 * for a completed request to the LLM provider.
 */
export interface AgentUsageEvent {
	_type: 'usage'
	/** Total tokens used (prompt + completion) */
	totalTokens: number
	/** Tokens used in the prompt */
	promptTokens: number
	/** Tokens used in the completion */
	completionTokens: number
}
