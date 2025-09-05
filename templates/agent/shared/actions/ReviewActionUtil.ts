import z from 'zod'
import { AgentRequestTransform } from '../AgentRequestTransform'
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

	override applyAction(action: Streaming<IReviewAction>, transform: AgentRequestTransform) {
		if (!action.complete) return
		const { agent } = transform

		const bounds = transform.removeOffsetFromBox({
			x: action.x,
			y: action.y,
			w: action.w,
			h: action.h,
		})

		const contextArea: IAreaContextItem = {
			type: 'area',
			bounds,
			source: 'agent',
		}

		agent.schedule((prev) => ({
			...prev,
			message: action.intent,
			bounds,
			contextItems: [...prev.contextItems, contextArea],
			type: 'review',
		}))
	}
}
