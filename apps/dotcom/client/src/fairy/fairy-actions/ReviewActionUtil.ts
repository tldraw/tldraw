import { ReviewAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class ReviewActionUtil extends AgentActionUtil<ReviewAction> {
	static override type = 'review' as const

	override getInfo(action: Streaming<ReviewAction>) {
		const label = action.complete ? 'Review' : 'Reviewing'
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		const description = `**${label}:** ${text ?? ''}`
		// const description = `${text ?? ''}`

		return createAgentActionInfo({
			icon: 'search',
			description,
			pose: 'reviewing',
		})
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

		this.agent.schedule({
			bounds: reviewBounds,
			agentMessages: [getReviewMessage(action.intent)],
		})

		const fairy = this.agent.getEntity()
		if (!fairy) return
		if (!action.complete) {
			this.agent.updateEntity((f) => (f ? { ...f, pose: 'reviewing' } : f))
		} else {
			this.agent.updateEntity((f) => (f ? { ...f, pose: 'idle' } : f))
		}
	}
}

function getReviewMessage(intent: string) {
	return `Examine the actions that you (the agent) took since the most recent user message, with the intent: "${intent}". What's next?

- Is there still more work to do? If so, continue it.
- Is the task supposed to be complete? If so, it's time to review the results of that. Did you do what the user asked for? Did the plan work? Think through your findings and pay close attention to the image, because that's what you can see right now. If you make any corrections, let the user know what you did and why. If no corrections are needed, there's no need to say anything.
- Make sure to reference your previous actions (denoted by [ACTION]) in order to see what you were intending to do.`
}
