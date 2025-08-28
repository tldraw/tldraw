import z from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const ThinkAction = z
	.object({
		_type: z.literal('think'),
		text: z.string(),
	})
	.meta({ title: 'Think', description: 'The AI describes its intent or reasoning.' })

type IThinkAction = z.infer<typeof ThinkAction>

export class ThinkActionUtil extends AgentActionUtil<IThinkAction> {
	static override type = 'think' as const

	override getSchema() {
		return ThinkAction
	}

	override getInfo(action: Streaming<IThinkAction>) {
		return {
			icon: 'brain' as const,
			description: action.text ?? (action.complete ? 'Thinking...' : null),
			summary: 'Thought for a while',
		}
	}
}
