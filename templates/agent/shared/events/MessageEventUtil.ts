import z from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentMessageEvent = z.object({
	_type: z.literal('message'),
	text: z.string(),
})

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
