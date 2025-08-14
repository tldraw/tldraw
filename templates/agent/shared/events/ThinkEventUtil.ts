import z from 'zod'
import { AgentHistoryItemStatus } from '../../client/components/chat-history/AgentHistoryItem'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

const AgentThinkEvent = z.object({
	_type: z.literal('think'),
	text: z.string(),
})

type IAgentThinkEvent = z.infer<typeof AgentThinkEvent>

export class ThinkEventUtil extends AgentEventUtil<IAgentThinkEvent> {
	static override type = 'think' as const

	override getSchema() {
		return AgentThinkEvent
	}

	override getIcon() {
		return 'brain' as const
	}

	override getDescription(event: Streaming<IAgentThinkEvent>) {
		return event.text ?? ''
	}

	override getLabel(_event: Streaming<IAgentThinkEvent>, status: AgentHistoryItemStatus) {
		switch (status) {
			case 'progress':
				return 'Thinking'
			case 'done':
				return 'Thought'
			case 'cancelled':
				return 'Thought cancelled'
		}
	}
}
