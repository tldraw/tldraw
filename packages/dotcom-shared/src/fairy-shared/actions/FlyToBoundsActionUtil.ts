import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { DEFAULT_FAIRY_VISION } from '../constants'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil, AgentActionUtilConstructor } from './AgentActionUtil'

const FlyToBoundsAction = z
	.object({
		_type: z.literal('flyToBounds'),
		intent: z.string(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
	})
	.meta({
		title: 'Fly To Bounds',
		description:
			'The fairy flies to the specified bounds of the canvas to navigate to other areas of the canvas if needed.',
	})

type FlyToBoundsAction = z.infer<typeof FlyToBoundsAction>

export class FlyToBoundsActionUtil extends AgentActionUtil<FlyToBoundsAction> {
	static override type = 'flyToBounds' as const

	override getSchema(actions: AgentActionUtilConstructor['type'][]) {
		if (!actions.includes('flyToBounds')) {
			return null
		}
		return FlyToBoundsAction
	}

	override getInfo(action: Streaming<FlyToBoundsAction>) {
		const label = action.complete ? 'Fly To Bounds' : 'Flying to bounds'
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		return {
			icon: null, //'eye' as const,
			description: `**${label}**: ${text ?? ''}`,
		}
	}

	override applyAction(action: Streaming<FlyToBoundsAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const bounds = helpers.removeOffsetFromBox({
			x: action.x,
			y: action.y,
			w: Math.min(action.w, DEFAULT_FAIRY_VISION.x),
			h: Math.min(action.h, DEFAULT_FAIRY_VISION.y),
		})

		this.agent.moveToBounds(bounds)

		this.agent.schedule({
			bounds,
			messages: [`Just flew to new area with the intent: ${action.intent}`],
		})
	}
}
