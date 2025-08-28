import { BaseAgentAction, ChatHistoryInfo } from '../../../shared/actions/AgentActionUtil'
import { Streaming } from '../../../shared/types/Streaming'
import { TLAgent } from '../../ai/useTldrawAgent'

/**
 * Get the full info for an action to display in chat history UI.
 * This function adds default values for any unset properties.
 * If the action's util returns null, the action will not be shown in chat history.
 */
export function getActionInfo(action: Streaming<BaseAgentAction>, agent: TLAgent): ChatHistoryInfo {
	const util = agent.getAgentActionUtil(action._type)
	const info = util.getInfo(action) ?? { description: null }
	const {
		icon = null,
		description = JSON.stringify(action, null, 2),
		summary = null,
		canGroup = () => true,
	} = info

	return {
		icon,
		description,
		summary,
		canGroup,
	}
}
