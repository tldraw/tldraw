import { MessageAction, Streaming } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class MessageActionUtil extends AgentActionUtil<MessageAction> {
	static override type = 'message' as const

	override getInfo(action: Streaming<MessageAction>) {
		return {
			description: action.text ?? '',
			canGroup: () => false,
			pose: 'waiting' as const, // todo: talking
		}
	}
}
