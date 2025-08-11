import { IAgentReviewEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventHandler } from './AgentEventHandler'
import { scheduleReview } from './scheduleReview'

export class ReviewEventHandler extends AgentEventHandler<IAgentReviewEvent> {
	static override type = 'review' as const

	override applyEvent(event: Streaming<IAgentReviewEvent>) {
		scheduleReview(event)
	}
}
