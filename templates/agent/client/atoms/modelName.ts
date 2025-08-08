import { atom } from 'tldraw'
import { DEFAULT_MODEL_NAME, TLAgentModelName } from '../../worker/models'

// Initialize from localStorage if available
let initialModelName: TLAgentModelName = DEFAULT_MODEL_NAME
try {
	const stored = localStorage.getItem('model-name')
	if (stored) {
		initialModelName = JSON.parse(stored) as TLAgentModelName
	}
} catch {
	// Use default if parsing fails
}

export const $modelName = atom<TLAgentModelName>('modelName', initialModelName)
