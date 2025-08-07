import { IAgentReviewEvent } from '../../worker/prompt/AgentEvent'
import { $requestsSchedule } from '../atoms/requestsSchedule'
import { AreaContextItem } from '../types/ContextItem'
import { ScheduledRequest } from '../types/ScheduledRequest'
import { Streaming } from '../types/Streaming'

export function scheduleReview(event: Streaming<IAgentReviewEvent>) {
	$requestsSchedule.update((prev) => {
		if (!event.complete) return prev
		const contextArea: AreaContextItem = {
			type: 'area',
			bounds: {
				x: event.x,
				y: event.y,
				w: event.w,
				h: event.h,
			},
			source: 'agent',
		}

		// Use the previous request's view bounds if it exists
		// Otherwise use the scheduled review's bounds
		const prevRequest = prev[prev.length - 1] ?? {
			bounds: {
				x: event.x,
				y: event.y,
				w: event.w,
				h: event.h,
			},
		}

		const schedule: ScheduledRequest[] = [
			...prev,
			{
				type: 'review',
				message: event.intent ?? '',
				contextItems: [contextArea],
				bounds: prevRequest.bounds,
			},
		]
		return schedule
	})
}
