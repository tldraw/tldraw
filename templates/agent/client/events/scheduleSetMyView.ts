import { IAgentScheduleSetMyViewEvent } from '../../worker/prompt/AgentEvent'
import { $requestsSchedule } from '../atoms/requestsSchedule'
import { ScheduledRequest } from '../types/ScheduledRequest'
import { Streaming } from '../types/Streaming'

export function scheduleSetMyView(event: Streaming<IAgentScheduleSetMyViewEvent>) {
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
