import { IAgentReviewEvent } from '../../worker/prompt/AgentEvent'
import { $requestsSchedule } from '../atoms/requestsSchedule'
import { AgentHistoryItemStatus } from '../components/chat-history/AgentHistoryItem'
import { AreaContextItem } from '../types/ContextItem'
import { ScheduledRequest } from '../types/ScheduledRequest'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class ReviewEventUtil extends AgentEventUtil<IAgentReviewEvent> {
	static override type = 'review' as const

	override getIcon() {
		return 'search' as const
	}

	override getDescription(event: Streaming<IAgentReviewEvent>) {
		return event.intent ?? ''
	}

	override getLabel(_event: Streaming<IAgentReviewEvent>, status: AgentHistoryItemStatus) {
		switch (status) {
			case 'progress':
			case 'done':
				return 'Review'
			case 'cancelled':
				return 'Review cancelled'
		}
	}

	override applyEvent(event: Streaming<IAgentReviewEvent>) {
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
}
