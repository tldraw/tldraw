import { BaseAgentAction } from '../types/BaseAgentAction'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

export interface DebugAction extends BaseAgentAction<'debug'> {
	label: string
	data: any
}

export class DebugActionUtil extends AgentActionUtil<DebugAction> {
	static override type = 'debug' as const

	override applyAction(action: Streaming<DebugAction>) {
		console.log(action.label + ':', action.data)
	}

	override savesToHistory() {
		return false
	}
}
