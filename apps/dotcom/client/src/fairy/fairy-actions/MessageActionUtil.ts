import { MessageAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class MessageActionUtil extends AgentActionUtil<MessageAction> {
	static override type = 'message' as const

	override getInfo(action: Streaming<MessageAction>) {
		return createAgentActionInfo({
			description: action.text ?? '',
			canGroup: () => false,
			pose: 'waiting', // todo: talking
		})
	}
}
