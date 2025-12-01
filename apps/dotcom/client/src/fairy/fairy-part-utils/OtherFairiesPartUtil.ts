import { AgentRequest, OtherFairiesPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { PromptPartUtil } from './PromptPartUtil'

export class OtherFairiesPartUtil extends PromptPartUtil<OtherFairiesPart> {
	static override type = 'otherFairies' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): OtherFairiesPart {
		const otherFairies = this.agent.fairyApp.agentsManager
			.getAgents()
			.filter((agent: FairyAgent) => agent.id !== this.agent.id)

		const otherFairiesData = otherFairies.map((agent: FairyAgent) => {
			const activeRequest = agent.requestManager.getActiveRequest()
			return {
				id: agent.id,
				name: agent.$fairyConfig.get().name,
				position: helpers.roundVec(helpers.applyOffsetToVec(agent.$fairyEntity.get().position)),
				isGenerating: activeRequest !== null,
				bounds: activeRequest?.bounds ? helpers.applyOffsetToBox(activeRequest.bounds) : null,
				// personality: agent.$fairyConfig.get().personality,
				currentProjectId: agent.getProject()?.id ?? null,
				isSleeping: agent.modeManager.isSleeping(),
			}
		})

		const thisActiveRequest = this.agent.requestManager.getActiveRequest()
		const thisFairyData = {
			id: this.agent.id,
			name: this.agent.$fairyConfig.get().name,
			position: helpers.roundVec(helpers.applyOffsetToVec(this.agent.$fairyEntity.get().position)),
			isGenerating: thisActiveRequest !== null,
			bounds: thisActiveRequest?.bounds ? helpers.applyOffsetToBox(thisActiveRequest.bounds) : null,
			// personality: this.agent.$fairyConfig.get().personality,
			currentProjectId: this.agent.getProject()?.id ?? null,
			isSleeping: this.agent.modeManager.isSleeping(),
		}

		return {
			type: 'otherFairies',
			otherFairies: otherFairiesData,
			thisFairy: thisFairyData,
		}
	}
}
