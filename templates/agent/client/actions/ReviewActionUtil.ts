import { Box } from 'tldraw'
import { ReviewAction } from '../../shared/schema/AgentActionSchemas'
import { AreaContextItem } from '../../shared/types/ContextItem'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const ReviewActionUtil = registerActionUtil(
	class ReviewActionUtil extends AgentActionUtil<ReviewAction> {
		static override type = 'review' as const

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
			const scheduledRequest = this.agent.requests.getScheduledRequest()
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
)

function getReviewMessage(intent: string) {
	return `Examine the actions that you (the agent) took since the most recent user message, with the intent: "${intent}". What's next?

- Is there still more work to do? If so, continue it.
- Is the task supposed to be complete? If so, it's time to review the results of that. Did you do what the user asked for? Did the plan work? Think through your findings and pay close attention to the image, because that's what you can see right now. If you make any corrections, let the user know what you did and why. If no corrections are needed, there's no need to say anything.
- Make sure to reference your last actions (denoted by [ACTION]) in order to see if you completed the task. Assume each action you see in the chat history completed successfully.`
}
