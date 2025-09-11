import { Box } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { AreaContextItem } from '../types/ContextItem'
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

type ReviewAction = z.infer<typeof ReviewAction>

export class ReviewActionUtil extends AgentActionUtil<ReviewAction> {
	static override type = 'review' as const

	override getSchema() {
		return ReviewAction
	}

	override getInfo(action: Streaming<ReviewAction>) {
		const label = action.complete ? 'Review' : 'Reviewing'
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		const description = `**${label}:** ${text ?? ''}`

		return {
			icon: 'search' as const,
			description,
		}
	}

	override applyAction(action: Streaming<ReviewAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const reviewBounds = helpers.removeOffsetFromBox({
			x: action.x,
			y: action.y,
			w: action.w,
			h: action.h,
		})

		const contextArea: AreaContextItem = {
			type: 'area',
			bounds: reviewBounds,
			source: 'agent',
		}

		// If the review area is outside the already-scheduled bounds, expand the bounds to include it
		const scheduledRequest = this.agent.$scheduledRequest.get()
		const bounds = scheduledRequest
			? Box.From(scheduledRequest.bounds).union(reviewBounds)
			: reviewBounds

		// Schedule the review
		this.agent.schedule({
			bounds,
			message: getReviewMessage(action.intent),
			contextItems: [contextArea],
		})
	}
}

function getReviewMessage(intent: string) {
	return `Examine the actions that you (the agent) took since the most recent user message, with the intent: "${intent}". What's next?

- Are you awaiting a response from the user? If so, there's no need to do or say anything.
- Is there still more work to do? If so, continue it.
- Is the task supposed to be complete? If so, it's time to review the results of that. Did you do what the user asked for? Did the plan work? Think through your findings and pay close attention to the image, because that's what you can see right now. If you make any corrections, let the user know what you did and why. If no corrections are needed, there's no need to say anything.
- Make sure to reference your last actions (denoted by [ACTION]) in order to see if you completed the task. Assume each action you see in the chat history completed successfully.`
}
