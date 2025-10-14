import z from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil, AgentActionUtilConstructor } from './AgentActionUtil'

const MessageAction = z
	.object({
		_type: z.literal('message'),
		text: z.string(),
	})
	.meta({ title: 'Message', description: 'The fairy sends a message to the user.' })

type MessageAction = z.infer<typeof MessageAction>

export class MessageActionUtil extends AgentActionUtil<MessageAction> {
	static override type = 'message' as const

	override getSchema(actions: AgentActionUtilConstructor['type'][]) {
		if (!actions.includes('message')) {
			return null
		}
		return MessageAction
	}

	override getInfo(action: Streaming<MessageAction>) {
		return {
			description: action.text ?? '',
			canGroup: () => false,
			pose: 'thinking' as const,
		}
	}
}
