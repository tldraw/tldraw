import { IAgentScheduleSetMyViewEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'
import { scheduleSetMyView } from './scheduleSetMyView'

export class SetMyViewEventHandler extends AgentEventHandler<IAgentScheduleSetMyViewEvent> {
	static override type = 'setMyView' as const

	override applyEvent(event: Streaming<IAgentScheduleSetMyViewEvent>) {
		scheduleSetMyView(event)
	}
}
