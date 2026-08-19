import { AgentIconType } from '../icons/AgentIcon'
import { BaseAgentAction } from './BaseAgentAction'
import { Streaming } from './Streaming'

/**
 * Information on how the action should be displayed in chat history.
 */
export interface ChatHistoryInfo {
	/**
	 * The icon to display in chat history.
	 * Null to not show an icon.
	 */
	icon: AgentIconType | null

	/**
	 * The description to display in chat history.
	 * Null to not show a description.
	 * Defaults to the stringified action if not set.
	 */
	description: string | null

	/**
	 * A short summary that can be shown when the action is collapsed.
	 * Null to disable collapsing for this action.
	 */
	summary: string | null

	/**
	 * A function that determines whether the action can be grouped with another action.
	 * By default, the action will automatically group with everything.
	 * @param other - The other action
	 * @returns Whether the action can be grouped with the other action
	 */
	canGroup(other: Streaming<BaseAgentAction>): boolean
}
