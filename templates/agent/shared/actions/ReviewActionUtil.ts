import { Box } from 'tldraw'
import z from 'zod'
import { $scheduledRequest } from '../../client/atoms/scheduledRequest'
import { AgentTransform } from '../AgentTransform'
import { AgentRequest } from '../types/AgentRequest'
import { IAreaContextItem } from '../types/ContextItem'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const ReviewAction = z
	.object({
		_type: z.literal('review'),
		intent: z.string(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
	})
	.meta({
		title: 'Review',
		description:
			'The AI schedules further work or a review so that it can look at the results of its work so far and take further action, such as reviewing what it has done or taking further steps that would benefit from seeing the results of its work so far.',
	})

type IReviewAction = z.infer<typeof ReviewAction>

export class ReviewActionUtil extends AgentActionUtil<IReviewAction> {
	static override type = 'review' as const

	override getSchema() {
		return ReviewAction
	}

	override getInfo(action: Streaming<IReviewAction>) {
		const label = action.complete ? 'Review' : 'Reviewing'
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		const description = `**${label}:** ${text ?? ''}`

		return {
			icon: 'search' as const,
			description,
		}
	}

	override applyAction(
		action: Streaming<IReviewAction>,
		transform: AgentTransform,
		originalRequest: AgentRequest
	) {
		if (!action.complete) return

		const reviewBounds = {
			x: action.x ?? originalRequest.bounds.x,
			y: action.y ?? originalRequest.bounds.y,
			w: action.w ?? originalRequest.bounds.w,
			h: action.h ?? originalRequest.bounds.h,
		}

		const contextArea: IAreaContextItem = {
			type: 'area',
			bounds: reviewBounds,
			source: 'agent',
		}

		$scheduledRequest.update((prev) => {
			const request = prev ?? {
				message: '',
				contextItems: [],
				bounds: originalRequest.bounds,
				modelName: originalRequest.modelName,
				type: 'review',
			}

			// If the review bounds go outside the request bounds, grow the request bounds to include the review bounds
			const reviewBoundsBox = Box.From(reviewBounds)
			const requestBoundsBox = Box.From(request.bounds)
			const boundsContainReviewBounds = requestBoundsBox.contains(reviewBoundsBox)
			if (!boundsContainReviewBounds) {
				request.bounds = requestBoundsBox.union(reviewBoundsBox).toJson()
			}

			return {
				...request,
				message: request.message ? `${request.message}\n\n${action.intent}` : action.intent,
				contextItems: [...(request.contextItems ?? []), contextArea],
			}
		})
	}
}
