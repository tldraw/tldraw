import { AgentRequest, OtherFairiesPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyAgentsAtom } from '../fairy-agent/agent/fairyAgentsAtom'
import { PromptPartUtil } from './PromptPartUtil'

export class OtherFairiesPartUtil extends PromptPartUtil<OtherFairiesPart> {
	static override type = 'otherFairies' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): OtherFairiesPart {
		const otherFairies = $fairyAgentsAtom
			.get(this.editor)
			.filter((agent) => agent.id !== this.agent.id)

		const otherFairiesData = otherFairies.map((agent) => ({
			name: agent.$fairyConfig.get().name,
			position: helpers.applyOffsetToVec(agent.$fairyEntity.get().position),
		}))

		const thisFairyData = {
			name: this.agent.$fairyConfig.get().name,
			position: helpers.applyOffsetToVec(this.agent.$fairyEntity.get().position),
		}

		return {
			type: 'otherFairies',
			otherFairies: otherFairiesData,
			thisFairy: thisFairyData,
		}
	}
}
