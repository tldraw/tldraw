import { atom } from 'tldraw'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../../worker/models'

// Initialize from localStorage if available
let initialModelName: AgentModelName = DEFAULT_MODEL_NAME
try {
	const stored = localStorage.getItem('model-name')
	if (stored) {
		initialModelName = JSON.parse(stored) as AgentModelName
	}
} catch {
	// Use default if parsing fails
}

export const $modelName = atom<AgentModelName>('modelName', initialModelName)
