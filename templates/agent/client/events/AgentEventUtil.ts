import { Editor } from 'tldraw'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { AgentHistoryItemStatus } from '../components/chat-history/AgentHistoryItem'
import { AgentIconType } from '../components/chat-history/AgentIcon'
import { AgentTransform } from '../transforms/AgentTransform'
import { Streaming } from '../types/Streaming'

export abstract class AgentEventUtil<T extends IAgentEvent = IAgentEvent> {
	static type: IAgentEvent['_type'] | 'unknown'

	constructor(public editor: Editor) {}

	/**
	 * Get an icon type to display within chat history.
	 * @returns The icon, or null to not show an icon
	 */
	getIcon(_event: Streaming<IAgentEvent>): AgentIconType | null {
		return null
	}

	/**
	 * Get a label to display within chat history.
	 * @returns The label, or null to not show a label
	 */
	getLabel(_event: Streaming<IAgentEvent>, _status: AgentHistoryItemStatus): string | null {
		return null
	}

	/**
	 * Get a description of the eventto display within chat history.
	 * @returns The description, or null to not show a description
	 */
	getDescription(_event: Streaming<IAgentEvent>, _status: AgentHistoryItemStatus): string | null {
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
}

export interface AgentEventUtilConstructor {
	new (editor: Editor): AgentEventUtil
	type: IAgentEvent['_type']
}
