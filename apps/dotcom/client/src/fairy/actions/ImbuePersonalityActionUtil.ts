import { ImbuePersonalityAction, Streaming } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class ImbuePersonalityActionUtil extends AgentActionUtil<ImbuePersonalityAction> {
	static override type = 'imbue-personality' as const

	override getInfo(action: Streaming<ImbuePersonalityAction>) {
		return {
			title: action.complete ? 'Translated to fairy language' : 'Translating to fairy language',
			description: action.imbuedMessage ?? '',
			canGroup: () => false,
			pose: 'thinking' as const,
		}
	}
}
