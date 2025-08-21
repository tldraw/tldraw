import z from 'zod'
import { $scheduledRequests } from '../../client/atoms/scheduledRequests'
import { IAreaContextItem } from '../types/ContextItem'
import { ScheduledRequest } from '../types/ScheduledRequest'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

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

export class ReviewActionUtil extends AgentActionUtil<IAgentReviewEvent> {
	static override type = 'review' as const

	override getSchema() {
		return AgentReviewEvent
	}

	override getIcon() {
		return 'search' as const
	}

	override getDescription(event: Streaming<IAgentReviewEvent>) {
		const label = event.complete ? 'Review' : 'Reviewing'
		const text = event.intent?.startsWith('#') ? `\n\n${event.intent}` : event.intent
		return `**${label}**: ${text ?? ''}`
	}

	override applyEvent(event: Streaming<IAgentReviewEvent>) {
		$scheduledRequests.update((prev) => {
			if (!event.complete) return prev
			const contextArea: IAreaContextItem = {
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
