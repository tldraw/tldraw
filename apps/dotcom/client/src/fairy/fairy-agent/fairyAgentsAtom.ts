import { Editor } from 'tldraw'
import { FairyAgent } from './FairyAgent'

/**
 * @deprecated Use FairyApp.agentsManager.getAgents() instead
 * An atom containing all the agents attached to an editor.
 *
 * More than one agent can be attached to a single editor.
 * This starter doesn't take advantage of that, but you could.
 */
export function getFairyAgents(editor: Editor): FairyAgent[] {
	// This function is deprecated. Use FairyApp.agentsManager.getAgents() instead.
	// For now, return empty array as this should not be used.
	console.warn('getFairyAgents is deprecated. Use FairyApp.agentsManager.getAgents() instead.')
	return []
}

/**
 * @deprecated Use FairyApp.agentsManager.getAgentById() instead
 */
export function getFairyAgentById(id: string, editor: Editor): FairyAgent | undefined {
	// This function is deprecated. Use FairyApp.agentsManager.getAgentById() instead.
	console.warn(
		'getFairyAgentById is deprecated. Use FairyApp.agentsManager.getAgentById() instead.'
	)
	return undefined
}

/**
 * @deprecated Use FairyApp.agentsManager.getAgentById()?.$fairyConfig.get().name instead
 */
export function getFairyNameById(id: string, editor: Editor): string | undefined {
	// This function is deprecated. Use FairyApp.agentsManager.getAgentById()?.$fairyConfig.get().name instead.
	console.warn(
		'getFairyNameById is deprecated. Use FairyApp.agentsManager.getAgentById()?.$fairyConfig.get().name instead.'
	)
	return undefined
}
