import { IDebugEvent } from '../../worker/prompt/AgentEvent'
import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export class DebugEventUtil extends AgentEventUtil<IDebugEvent> {
	static override type = 'debug' as const

	override applyEvent(event: Streaming<IDebugEvent>) {
		console.log(event.label + ':', event.data)
	}

	override getDescription() {
		return null
	}
}
