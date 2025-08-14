import { Streaming } from '../types/Streaming'
import { AgentEventUtil } from './AgentEventUtil'

export interface DebugEvent {
	_type: 'debug'
	complete: boolean
	label: string
	data: any
}

export class DebugEventUtil extends AgentEventUtil<DebugEvent> {
	static override type = 'debug' as const

	override applyEvent(event: Streaming<DebugEvent>) {
		console.log(event.label + ':', event.data)
	}

	override savesToHistory() {
		return false
	}
}
