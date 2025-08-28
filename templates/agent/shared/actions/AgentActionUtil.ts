import z from 'zod'
import { AgentIconType } from '../../client/components/icons/AgentIcon'
import { AgentTransform } from '../AgentTransform'
import { AgentRequest } from '../types/AgentRequest'
import { Streaming } from '../types/Streaming'

export interface BaseAgentAction {
	_type: string
}

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

export abstract class AgentActionUtil<T extends BaseAgentAction = BaseAgentAction> {
	static type: string

	constructor() {}

	/**
	 * Get a schema to use for the model's response.
	 * @returns The schema, or null to not use a schema
	 */
	getSchema(): z.ZodType<T> | null {
		return null
	}

	/**
	 * Get information about the action to display within the chat history UI.
	 * Return null to not show anything.
	 * Defaults to the stringified action if not set.
	 */
	getInfo(_action: Streaming<T>): Partial<ChatHistoryInfo> | null {
		return {}
	}

	/**
	 * Transform the action before saving it to chat history.
	 * Useful for sanitizing or correcting actions.
	 * @returns The transformed action, or null to reject the action
	 */
	transformAction(action: Streaming<T>, _transform: AgentTransform): Streaming<T> | null {
		return action
	}

	/**
	 * Apply the action to the editor.
	 * Any changes that happen during this function will be displayed as a diff.
	 */
	applyAction(_action: Streaming<T>, _transform: AgentTransform, _request: AgentRequest): void {
		// Do nothing by default
	}

	/**
	 * Whether the action gets saved to history.
	 */
	savesToHistory(): boolean {
		return true
	}
}

export interface AgentActionUtilConstructor<T extends BaseAgentAction = BaseAgentAction> {
	new (): AgentActionUtil<T>
	type: T['_type']
}
