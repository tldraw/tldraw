import { defaultApplyChange } from '@tldraw/ai'
import { IAgentCreateEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'
import { getTldrawAiChangesFromCreateEvent } from './getTldrawAiChangesFromCreateEvent'

export class CreateEventHandler extends AgentEventHandler<IAgentCreateEvent> {
	static override type = 'create' as const

	override transformEvent(event: Streaming<IAgentCreateEvent>) {
		if (!event.complete) return event

		event.shape = this.transform.sanitizeShape(event.shape)

		return event
	}

	override applyEvent(event: Streaming<IAgentCreateEvent>) {
		if (!event.complete) return
		const { editor } = this

		const aiChanges = getTldrawAiChangesFromCreateEvent({ editor, event: event })
		for (const aiChange of aiChanges) {
			defaultApplyChange({ change: aiChange, editor })
		}
	}
}
