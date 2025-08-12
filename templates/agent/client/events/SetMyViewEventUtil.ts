import { IAgentScheduleSetMyViewEvent } from '../../worker/prompt/AgentEvent'
import { $requestsSchedule } from '../atoms/requestsSchedule'
import { AgentHistoryItemStatus } from '../components/chat-history/AgentHistoryItem'
import { ScheduledRequest } from '../types/ScheduledRequest'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class SetMyViewEventUtil extends AgentEventUtil<IAgentScheduleSetMyViewEvent> {
	static override type = 'setMyView' as const

	override getIcon() {
		return 'eye' as const
	}

	override getDescription(event: Streaming<IAgentScheduleSetMyViewEvent>) {
		return event.intent ?? ''
	}

	override getLabel(
		_event: Streaming<IAgentScheduleSetMyViewEvent>,
		status: AgentHistoryItemStatus
	) {
		switch (status) {
			case 'progress':
			case 'done':
				return 'Move camera'
			case 'cancelled':
				return 'Camera move cancelled'
		}
	}

	override applyEvent(event: Streaming<IAgentScheduleSetMyViewEvent>) {
		$requestsSchedule.update((prev) => {
			if (!event.complete) return prev

			const schedule: ScheduledRequest[] = [
				...prev,
				{
					type: 'setMyView',
					message: event.intent ?? '',
					contextItems: [],
					bounds: {
						x: event.x,
						y: event.y,
						w: event.w,
						h: event.h,
					},
				},
			]
			return schedule
		})
	}
}
