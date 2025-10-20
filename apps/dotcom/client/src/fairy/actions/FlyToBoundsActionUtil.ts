import {
	AgentHelpers,
	FAIRY_VISION_DIMENSIONS,
	FlyToBoundsAction,
	Streaming,
} from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class FlyToBoundsActionUtil extends AgentActionUtil<FlyToBoundsAction> {
	static override type = 'flyToBounds' as const

	override getInfo(action: Streaming<FlyToBoundsAction>) {
		// const label = action.complete ? 'Fly To Bounds' : 'Flying to bounds'
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		return {
			icon: 'eye' as const,
			description: `${text ?? ''}`,
		}
	}

	override applyAction(action: Streaming<FlyToBoundsAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const bounds = helpers.removeOffsetFromBox({
			x: action.x,
			y: action.y,
			w: Math.min(action.w, FAIRY_VISION_DIMENSIONS.x),
			h: Math.min(action.h, FAIRY_VISION_DIMENSIONS.y),
		})

		this.agent.moveToBounds(bounds)

		this.agent.schedule({
			bounds,
			messages: [`Just flew to new area with the intent: ${action.intent}`],
		})
	}
}
