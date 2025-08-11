import { Editor } from 'tldraw'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { AgentTransform } from '../transforms/AgentTransform'
import { Streaming } from '../types/Streaming'

export abstract class AgentEventHandler<T extends IAgentEvent = IAgentEvent> {
	static type: string

	constructor(
		public editor: Editor,
		public transform: AgentTransform
	) {}

	/**
	 * Transform the event before saving it to chat history.
	 * Useful for sanitizing or correcting events.
	 * @returns The transformed event, or null to reject the event
	 */
	transformEvent(event: Streaming<T>): Streaming<T> | null {
		return event
	}

	/**
	 * Apply the event to the editor.
	 * Any changes that happen during this function will be displayed as a diff.
	 */
	applyEvent(_event: Streaming<T>): void {
		// Do nothing by default
	}
}

export interface AgentEventHandlerConstructor {
	new (editor: Editor, transform: AgentTransform): AgentEventHandler
	type: string
}
