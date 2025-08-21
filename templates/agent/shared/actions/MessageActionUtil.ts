import z from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const MessageAction = z
	.object({
		_type: z.literal('message'),
		text: z.string(),
	})
	.meta({ title: 'Message', description: 'The AI sends a message to the user.' })

type IMessageAction = z.infer<typeof MessageAction>

export class MessageActionUtil extends AgentActionUtil<IMessageAction> {
	static override type = 'message' as const

	override getSchema() {
		return MessageAction
	}

	override canGroup() {
		return false
	}

	override getDescription(event: Streaming<IMessageAction>) {
		return event.text ?? ''
	}
}
