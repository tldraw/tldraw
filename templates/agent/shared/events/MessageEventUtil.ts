import z from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentMessageEvent = z
	.object({
		_type: z.literal('message'),
		text: z.string(),
	})
	.meta({ title: 'Message', description: 'The AI sends a message to the user.' })

type IAgentMessageEvent = z.infer<typeof AgentMessageEvent>

export class MessageEventUtil extends AgentEventUtil<IAgentMessageEvent> {
	static override type = 'message' as const

	override getSchema() {
		return AgentMessageEvent
	}

	override getDescription(event: Streaming<IAgentMessageEvent>) {
		return event.text ?? ''
	}
}
