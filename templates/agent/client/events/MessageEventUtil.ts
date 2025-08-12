import { IAgentMessageEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class MessageEventUtil extends AgentEventUtil<IAgentMessageEvent> {
	static override type = 'message' as const

	override getDescription(event: Streaming<IAgentMessageEvent>) {
		return event.text ?? ''
	}
}
