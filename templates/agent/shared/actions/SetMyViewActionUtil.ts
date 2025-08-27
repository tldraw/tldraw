import z from 'zod'
import { $scheduledRequest } from '../../client/atoms/scheduledRequest'
import { AgentTransform } from '../AgentTransform'
import { AgentRequest } from '../types/AgentRequest'
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

	override getIcon() {
		return 'eye' as const
	}

	override getDescription(action: Streaming<ISetMyViewAction>) {
		const label = action.complete ? 'Move camera' : 'Moving camera'
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		return `**${label}**: ${text ?? ''}`
	}

	override applyAction(
		action: Streaming<ISetMyViewAction>,
		transform: AgentTransform,
		originalRequest: AgentRequest
	) {
		if (!action.complete) return

		$scheduledRequest.update((prev) => {
			const request = prev ?? {
				message: '',
				contextItems: [],
				bounds: originalRequest.bounds,
				modelName: originalRequest.modelName,
			}

			return {
				...request,
				bounds: {
					x: action.x,
					y: action.y,
					w: action.w,
					h: action.h,
				},
			}
		})
	}
}
