import z from 'zod'
import { AgentIconType } from '../../client/components/icons/AgentIcon'
import { AgentTransform } from '../AgentTransform'
import { AgentPrompt } from '../types/AgentPrompt'
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
	getIcon(_event: Streaming<T>): AgentIconType | null {
		return null
	}

	/**
	 * Get a description of the eventto display within chat history.
	 * @returns The description, or null to not show a description
	 */
	getDescription(_event: Streaming<T>): string | null {
		return JSON.stringify(_event, null, 2)
	}

	/**
	 * Transform the event before saving it to chat history.
	 * Useful for sanitizing or correcting events.
	 * @returns The transformed event, or null to reject the event
	 */
	transformEvent(event: Streaming<T>, _transform: AgentTransform): Streaming<T> | null {
		return event
	}

	/**
	 * Apply the event to the editor.
	 * Any changes that happen during this function will be displayed as a diff.
	 */
	applyEvent(_event: Streaming<T>, _transform: AgentTransform, _prompt: AgentPrompt): void {
		// Do nothing by default
	}

	/**
	 * Whether the event should be saved to chat history.
	 */
	savesToHistory(): boolean {
		return true
	}

	/**
	 * Get a short summary that can be shown when the event is collapsed. Return null to disable collapsing.
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
}

export interface AgentActionUtilConstructor<T extends BaseAgentAction = BaseAgentAction> {
	new (): AgentActionUtil<T>
	type: T['_type']
}
