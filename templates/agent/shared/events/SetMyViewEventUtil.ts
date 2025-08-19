import z from 'zod'
import { $scheduledRequests } from '../../client/atoms/scheduledRequests'
import { AgentHistoryItemStatus } from '../types/AgentHistoryItem'
import { ScheduledRequest } from '../types/ScheduledRequest'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentSetMyViewEvent = z
	.object({
		_type: z.literal('setMyView'),
		h: z.number(),
		intent: z.string(),
		w: z.number(),
		x: z.number(),
		y: z.number(),
	})
	.meta({
		title: 'Set My View',
		description:
			'The AI changes the bounds of its own viewport to navigate to other areas of the canvas if needed.',
	})

type IAgentSetMyViewEvent = z.infer<typeof AgentSetMyViewEvent>

export class SetMyViewEventUtil extends AgentEventUtil<IAgentSetMyViewEvent> {
	static override type = 'setMyView' as const

	override getSchema() {
		return AgentSetMyViewEvent
	}

	override getIcon() {
		return 'eye' as const
	}

	override getDescription(event: Streaming<IAgentSetMyViewEvent>) {
		return event.intent ?? ''
	}

	override getLabel(_event: Streaming<IAgentSetMyViewEvent>, status: AgentHistoryItemStatus) {
		switch (status) {
			case 'progress':
			case 'done':
				return 'Move camera'
			case 'cancelled':
				return 'Camera move cancelled'
		}
	}

	override applyEvent(event: Streaming<IAgentSetMyViewEvent>) {
		$scheduledRequests.update((prev) => {
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
