import z from 'zod'
import { AgentIconType } from '../../client/components/icons/AgentIcon'
import { AgentTransform } from '../AgentTransform'
import { AgentHistoryItemStatus } from '../types/AgentHistoryItem'
import { Streaming } from '../types/Streaming'

export interface BaseAgentEvent {
	_type: string
}

export abstract class AgentEventUtil<T extends BaseAgentEvent = BaseAgentEvent> {
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
	 * Get a label to display within chat history.
	 * @returns The label, or null to not show a label
	 */
	getLabel(_event: Streaming<T>, _status: AgentHistoryItemStatus): string | null {
		return null
	}

	/**
	 * Get a description of the eventto display within chat history.
	 * @returns The description, or null to not show a description
	 */
	getDescription(_event: Streaming<T>, _status: AgentHistoryItemStatus): string | null {
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
	applyEvent(_event: Streaming<T>, _transform: AgentTransform): void {
		// Do nothing by default
	}

	/**
	 * Whether the event should be saved to chat history.
	 */
	savesToHistory(): boolean {
		return true
	}

	/**
	 * Whether the event should be automatically collapsed with another action.
	 */
	isCollapsible(_action: Streaming<T>, _other: Streaming<BaseAgentEvent>): boolean {
		return true
	}
}

export interface AgentEventUtilConstructor<T extends BaseAgentEvent = BaseAgentEvent> {
	new (): AgentEventUtil<T>
	type: T['_type']
}
