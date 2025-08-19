import z from 'zod'
import { $requestsSchedule } from '../../client/atoms/requestsSchedule'
import { AgentHistoryItemStatus } from '../types/AgentHistoryItem'
import { AreaContextItem } from '../types/ContextItem'
import { ScheduledRequest } from '../types/ScheduledRequest'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentReviewEvent = z
	.object({
		_type: z.literal('review'),
		h: z.number(),
		intent: z.string(),
		w: z.number(),
		x: z.number(),
		y: z.number(),
	})
	.meta({
		title: 'Review',
		description:
			'The AI schedules further work or a review so that it can look at the results of its work so far and take further action, such as reviewing what it has done or taking further steps that would benefit from seeing the results of its work so far.',
	})

type IAgentReviewEvent = z.infer<typeof AgentReviewEvent>

export class ReviewEventUtil extends AgentEventUtil<IAgentReviewEvent> {
	static override type = 'review' as const

	override getSchema() {
		return AgentReviewEvent
	}

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
