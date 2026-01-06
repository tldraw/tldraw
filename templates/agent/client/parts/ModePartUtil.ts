import { ModePart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const ModePartUtil = registerPromptPartUtil(
	class ModePartUtil extends PromptPartUtil<ModePart> {
		static override type = 'mode' as const

		override getPart(_request: AgentRequest): ModePart {
			if (!this.agent) {
				throw new Error('ModePartUtil requires an agent')
			}

			const modeDefinition = this.agent.getModeDefinition()

			return {
				type: 'mode',
				modeType: modeDefinition.type,
				partTypes: modeDefinition.parts,
				actionTypes: modeDefinition.actions,
			}
		}
	}
)
