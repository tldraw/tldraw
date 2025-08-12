import { IAgentThinkEvent } from '../../worker/prompt/AgentEvent'
import { AgentHistoryItemStatus } from '../components/chat-history/AgentHistoryItem'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class ThinkEventUtil extends AgentEventUtil<IAgentThinkEvent> {
	static override type = 'think' as const

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
