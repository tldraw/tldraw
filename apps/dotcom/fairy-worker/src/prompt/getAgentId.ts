import { AgentIdPart, AgentPrompt } from '@tldraw/fairy-shared'

/**
 * Get the agent ID from a prompt.
 */
export function getAgentId(prompt: AgentPrompt): string | undefined {
	for (const part of Object.values(prompt)) {
		if (part.type === 'agentId') {
			return (part as AgentIdPart).id
		}
	}

	return undefined
}
