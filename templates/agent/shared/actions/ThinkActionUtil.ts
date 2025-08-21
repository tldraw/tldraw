import z from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const AgentThinkEvent = z
	.object({
		_type: z.literal('think'),
		text: z.string(),
	})
	.meta({ title: 'Think', description: 'The AI describes its intent or reasoning.' })

type IAgentThinkEvent = z.infer<typeof AgentThinkEvent>

export class ThinkActionUtil extends AgentActionUtil<IAgentThinkEvent> {
	static override type = 'think' as const

	override getSchema() {
		return AgentThinkEvent
	}

	override getIcon() {
		return 'brain' as const
	}

	override getSummary() {
		return 'Thought for a while'
	}

	override getDescription(event: Streaming<IAgentThinkEvent>) {
		return event.text ?? (event.complete ? 'Thinking...' : null)
	}
}
