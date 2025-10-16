import z from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil, AgentActionUtilConstructor } from './AgentActionUtil'

const ThinkAction = z
	.object({
		_type: z.literal('think'),
		text: z.string(),
	})
	.meta({ title: 'Think', description: 'The fairy describes its intent or reasoning.' })

type ThinkAction = z.infer<typeof ThinkAction>

export class ThinkActionUtil extends AgentActionUtil<ThinkAction> {
	static override type = 'think' as const

	override getSchema(actions: AgentActionUtilConstructor['type'][]) {
		if (!actions.includes('think')) {
			return null
		}
		return ThinkAction
	}

	override getInfo(action: Streaming<ThinkAction>) {
		const time = Math.floor(action.time / 1000)
		let summary = `Thought for ${time} seconds`
		if (time === 0) summary = 'Thought for less than a second'
		if (time === 1) summary = 'Thought for 1 second'

		return {
			icon: 'brain' as const,
			description: action.text ?? (action.complete ? 'Thinking...' : null),
			summary,
			pose: 'thinking' as const,
		}
	}
}
