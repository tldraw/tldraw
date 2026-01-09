import { ModePart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const ModePartUtil = registerPromptPartUtil(
	class ModePartUtil extends PromptPartUtil<ModePart> {
		static override type = 'mode' as const

		override getPart(_request: AgentRequest): ModePart {
			const modeDefinition = this.agent.mode.getCurrentModeDefinition()

			if (!modeDefinition.active) {
				throw new Error(`Cannot get mode part for inactive mode: ${modeDefinition.type}`)
			}

			return {
				type: 'mode',
				modeType: modeDefinition.type,
				partTypes: modeDefinition.parts,
				actionTypes: modeDefinition.actions,
			}
		}
	}
)
