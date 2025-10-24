import { AgentAction, AgentActionInfo, Streaming } from '@tldraw/fairy-shared'
import { FairyAgent } from '../agent/FairyAgent'

/**
 * Get the full info for an action to display in chat history UI.
 * This function adds default values for any unset properties.
 * If the action's util returns null, the action will not be shown in chat history.
 */
export function getActionInfo(action: Streaming<AgentAction>, agent: FairyAgent): AgentActionInfo {
	const util = agent.getAgentActionUtil(action._type)
	const info = util.getInfo(action) ?? { description: null }
	const {
		icon = null,
		description = JSON.stringify(action, null, 2),
		summary = null,
		canGroup = () => true,
		pose = 'idle',
	} = info

	return {
		icon,
		description,
		summary,
		canGroup,
		pose,
	}
}
