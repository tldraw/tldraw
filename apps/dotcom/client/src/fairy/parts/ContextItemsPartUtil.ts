import { AgentRequest, ContextItemsPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class ContextItemsPartUtil extends PromptPartUtil<ContextItemsPart> {
	static override type = 'contextItems' as const

	override getPart(request: AgentRequest, helpers: AgentHelpers): ContextItemsPart {
		const items = request.contextItems.map((contextItem) => {
			const offsetContextItem = helpers.applyOffsetToContextItem(contextItem)
			return helpers.roundContextItem(offsetContextItem)
		})

		return {
			type: 'contextItems',
			items,
			requestType: request.type,
		}
	}
}
