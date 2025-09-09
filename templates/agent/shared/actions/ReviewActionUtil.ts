import { Box } from 'tldraw'
import z from 'zod'
import { AgentTransform } from '../AgentTransform'
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

	override applyAction(action: Streaming<IReviewAction>, transform: AgentTransform) {
		if (!action.complete) return
		const { agent } = transform

		const reviewBounds = transform.removeOffsetFromBox({
			x: action.x,
			y: action.y,
			w: action.w,
			h: action.h,
		})

		const contextArea: IAreaContextItem = {
			type: 'area',
			bounds: reviewBounds,
			source: 'agent',
		}

		agent.schedule((prev) => ({
			...prev,
			type: 'review',

			// Make sure the bounds includes the review bounds
			bounds: Box.From(prev.bounds).union(reviewBounds),

			// Append the review intent to the current message, if there is one.
			message: prev.message ? `${prev.message}\n\n${action.intent}` : action.intent,

			// Add the review bounds as a context area
			contextItems: [...prev.contextItems, contextArea],
		}))
	}
}
