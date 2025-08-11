import { defaultApplyChange } from '@tldraw/ai'
import { IAgentUpdateEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'
import { getTldrawAiChangesFromUpdateEvent } from './getTldrawAiChangesFromUpdateEvent'

export class UpdateEventHandler extends AgentEventHandler<IAgentUpdateEvent> {
	static override type = 'update' as const

	override transformEvent(event: Streaming<IAgentUpdateEvent>) {
		if (!event.complete) return event

		event.update = this.transform.sanitizeShape(event.update)

		return event
	}

	override applyEvent(event: Streaming<IAgentUpdateEvent>) {
		if (!event.complete) return
		const { editor } = this

		const aiChanges = getTldrawAiChangesFromUpdateEvent({ editor, event: event })
		for (const aiChange of aiChanges) {
			defaultApplyChange({ change: aiChange, editor })
		}
	}
}
