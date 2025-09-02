import z from 'zod'
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const SetMyViewAction = z
	.object({
		_type: z.literal('setMyView'),
		h: z.number(),
		intent: z.string(),
		w: z.number(),
		x: z.number(),
		y: z.number(),
	})
	.meta({
		title: 'Set My View',
		description:
			'The AI changes the bounds of its own viewport to navigate to other areas of the canvas if needed.',
	})

type ISetMyViewAction = z.infer<typeof SetMyViewAction>

export class SetMyViewActionUtil extends AgentActionUtil<ISetMyViewAction> {
	static override type = 'setMyView' as const

	override getSchema() {
		return SetMyViewAction
	}

	override getInfo(action: Streaming<ISetMyViewAction>) {
		const label = action.complete ? 'Move camera' : 'Moving camera'
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		return {
			icon: 'eye' as const,
			description: `**${label}**: ${text ?? ''}`,
		}
	}

	override applyAction(action: Streaming<ISetMyViewAction>, agent: TldrawAgent) {
		if (!action.complete) return

		agent.schedule((prev) => ({
			...prev,
			bounds: {
				x: action.x,
				y: action.y,
				w: action.w,
				h: action.h,
			},
		}))
	}
}
