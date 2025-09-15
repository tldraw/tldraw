import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const SetMyViewAction = z
	.object({
		_type: z.literal('setMyView'),
		intent: z.string(),
		x: z.number(),
		y: z.number(),
		w: z.number(),
		h: z.number(),
	})
	.meta({
		title: 'Set My View',
		description:
			'The AI changes the bounds of its own viewport to navigate to other areas of the canvas if needed.',
	})

type SetMyViewAction = z.infer<typeof SetMyViewAction>

export class SetMyViewActionUtil extends AgentActionUtil<SetMyViewAction> {
	static override type = 'setMyView' as const

	override getSchema() {
		return SetMyViewAction
	}

	override getInfo(action: Streaming<SetMyViewAction>) {
		const label = action.complete ? 'Move camera' : 'Moving camera'
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		return {
			icon: 'eye' as const,
			description: `**${label}**: ${text ?? ''}`,
		}
	}

	override applyAction(action: Streaming<SetMyViewAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const bounds = helpers.removeOffsetFromBox({
			x: action.x,
			y: action.y,
			w: action.w,
			h: action.h,
		})

		this.agent.schedule({ bounds })
	}
}
