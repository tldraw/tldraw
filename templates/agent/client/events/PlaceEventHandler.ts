import { IAgentPlaceEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'
import { placeShape } from './placeShape'

export class PlaceEventHandler extends AgentEventHandler<IAgentPlaceEvent> {
	static override type = 'place' as const

	override transformEvent(event: Streaming<IAgentPlaceEvent>) {
		// No transformation needed for place events
		return event
	}

	override applyEvent(event: Streaming<IAgentPlaceEvent>) {
		if (!event.complete) return
		const { editor } = this

		placeShape(editor, event)
	}
}
