import { ContextItemsPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { AgentHelpers } from '../AgentHelpers'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const ContextItemsPartUtil = registerPromptPartUtil(
	class ContextItemsPartUtil extends PromptPartUtil<ContextItemsPart> {
		static override type = 'contextItems' as const

		override getPart(request: AgentRequest, helpers: AgentHelpers): ContextItemsPart {
			const items = request.contextItems.map((contextItem) => {
				const offsetContextItem = helpers.applyOffsetToContextItem(contextItem)
				return helpers.roundContextItem(offsetContextItem)
			})

			return {
				type: 'contextItems',
				items,
				requestSource: request.source,
			}
		}
	}
)
