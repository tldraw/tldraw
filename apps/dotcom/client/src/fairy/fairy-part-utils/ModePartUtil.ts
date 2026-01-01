import { AgentRequest, getFairyModeDefinition, ModePart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class ModePartUtil extends PromptPartUtil<ModePart> {
	static override type = 'mode' as const

	override getPart(_request: AgentRequest, _helpers: AgentHelpers): ModePart {
		const modeDefinition = getFairyModeDefinition(this.agent.mode.getMode())
		if (!modeDefinition.active) throw new Error('Fairy is not in an active mode so cannot act.')
		return {
			type: 'mode',
			mode: modeDefinition.type,
			work: this.agent.getWork(),
		}
	}
}
