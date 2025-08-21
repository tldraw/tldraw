import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

export interface DebugEvent {
	_type: 'debug'
	complete: boolean
	label: string
	data: any
}

export class DebugActionUtil extends AgentActionUtil<DebugEvent> {
	static override type = 'debug' as const

	override applyEvent(event: Streaming<DebugEvent>) {
		console.log(event.label + ':', event.data)
	}

	override savesToHistory() {
		return false
	}
}
