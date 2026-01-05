import { MessageAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

export class MessageActionUtil extends AgentActionUtil<MessageAction> {
	static override type = 'message' as const

	override getInfo(action: Streaming<MessageAction>) {
		return {
			description: action.text ?? '',
			canGroup: () => false,
		}
	}
}
