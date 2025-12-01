import { AgentRequest, OtherFairiesPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { PromptPartUtil } from './PromptPartUtil'

export class OtherFairiesPartUtil extends PromptPartUtil<OtherFairiesPart> {
	static override type = 'otherFairies' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): OtherFairiesPart {
		const otherFairies = this.agent.fairyApp.agents
			.getAgents()
			.filter((agent: FairyAgent) => agent.id !== this.agent.id)

		const otherFairiesData = otherFairies.map((agent: FairyAgent) => {
			const activeRequest = agent.requests.getActiveRequest()
			return {
				id: agent.id,
				name: agent.getConfig().name,
				position: helpers.roundVec(helpers.applyOffsetToVec(agent.getEntity().position)),
				isGenerating: activeRequest !== null,
				bounds: activeRequest?.bounds ? helpers.applyOffsetToBox(activeRequest.bounds) : null,
				// personality: agent.getConfig().personality,
				currentProjectId: agent.getProject()?.id ?? null,
				isSleeping: agent.mode.isSleeping(),
			}
		})

		const thisActiveRequest = this.agent.requests.getActiveRequest()
		const thisFairyData = {
			id: this.agent.id,
			name: this.agent.getConfig().name,
			position: helpers.roundVec(helpers.applyOffsetToVec(this.agent.getEntity().position)),
			isGenerating: thisActiveRequest !== null,
			bounds: thisActiveRequest?.bounds ? helpers.applyOffsetToBox(thisActiveRequest.bounds) : null,
			// personality: this.agent.getConfig().personality,
			currentProjectId: this.agent.getProject()?.id ?? null,
			isSleeping: this.agent.mode.isSleeping(),
		}

		return {
			type: 'otherFairies',
			otherFairies: otherFairiesData,
			thisFairy: thisFairyData,
		}
	}
}
