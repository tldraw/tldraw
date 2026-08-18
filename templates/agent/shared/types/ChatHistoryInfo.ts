import { AgentIconType } from '../icons/AgentIcon'
import { BaseAgentAction } from './BaseAgentAction'
import { Streaming } from './Streaming'

/** How an action is displayed in chat history. */
export interface ChatHistoryInfo {
	/** Null to show no icon. */
	icon: AgentIconType | null

	/** Null to show no description. Defaults to the stringified action if not set. */
	description: string | null

	/** Shown when the action is collapsed. Null disables collapsing for this action. */
	summary: string | null

	/** Whether this action can be grouped with `other`. By default actions group with everything. */
	canGroup(other: Streaming<BaseAgentAction>): boolean
}
