import { AgentRequest, OtherFairiesPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { FairyAgent } from '../fairy-agent/agent/FairyAgent'
import { $fairyAgentsAtom } from '../fairy-agent/agent/fairyAgentsAtom'
import { PromptPartUtil } from './PromptPartUtil'

export class OtherFairiesPartUtil extends PromptPartUtil<OtherFairiesPart> {
	static override type = 'otherFairies' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): OtherFairiesPart {
		// NOTE when/if we bring back proximity chat, we should split up this part into nearby and distant fairies so it knows who is in range

		const mapFairyToData = (agent: FairyAgent) => {
			const activeRequest = agent.$activeRequest.get()
			return {
				id: agent.id,
				name: agent.$fairyConfig.get().name,
				position: helpers.applyOffsetToVec(agent.$fairyEntity.get().position),
				isGenerating: agent.isGenerating(),
				bounds: activeRequest?.bounds ? helpers.applyOffsetToBox(activeRequest.bounds) : null,
				personality: agent.$fairyConfig.get().personality,
				currentProjectId: agent.getCurrentProject()?.id ?? null,
			}
		}

		const otherFairiesData = $fairyAgentsAtom
			.get(this.editor)
			.filter((agent) => agent.id !== this.agent.id)
			.map((agent) => mapFairyToData(agent))

		const thisFairyData = mapFairyToData(this.agent)

		return {
			type: 'otherFairies',
			otherFairies: otherFairiesData,
			thisFairy: thisFairyData,
		}
	}
}
