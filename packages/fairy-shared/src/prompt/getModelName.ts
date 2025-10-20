import { AgentModelName, DEFAULT_MODEL_NAME } from '../models'
import { AgentPrompt } from '../types/AgentPrompt'

/**
 * Get the selected model name from a prompt.
 */
export function getModelName(_prompt: AgentPrompt): AgentModelName {
	return DEFAULT_MODEL_NAME
}
