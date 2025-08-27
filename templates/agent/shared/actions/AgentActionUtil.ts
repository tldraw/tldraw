import z from 'zod'
import { AgentIconType } from '../../client/components/icons/AgentIcon'
import { AgentTransform } from '../AgentTransform'
import { AgentRequest } from '../types/AgentRequest'
import { Streaming } from '../types/Streaming'

export interface BaseAgentAction {
	_type: string
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
	 * Get an icon type to display within chat history.
	 * @returns The icon, or null to not show an icon
	 */
	getIcon(_action: Streaming<T>): AgentIconType | null {
		return null
	}

	/**
	 * Get a description of the action to display within chat history.
	 * @returns The description, or null to not show a description
	 */
	getDescription(_action: Streaming<T>): string | null {
		return JSON.stringify(_action, null, 2)
	}

	/**
	 * Get a short summary that can be shown when the action is collapsed. Return null to disable collapsing.
	 * @returns The string shown when collapsed, or null to not collapse.
	 */
	getSummary(_action: Streaming<T>): string | null {
		return null
	}

	/**
	 * Whether the action can be grouped together with another action.
	 */
	canGroup(_action: Streaming<T>, _other: Streaming<BaseAgentAction>): boolean {
		return true
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
	 * Whether the action should be saved to chat history.
	 */
	savesToHistory(): boolean {
		return true
	}
}

export interface AgentActionUtilConstructor<T extends BaseAgentAction = BaseAgentAction> {
	new (): AgentActionUtil<T>
	type: T['_type']
}
