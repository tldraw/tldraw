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

		const otherFairiesData = otherFairies.map((agent) => {
			const activeRequest = agent.$activeRequest.get()
			return {
				id: agent.id,
				name: agent.$fairyConfig.get().name,
				position: helpers.applyOffsetToVec(agent.$fairyEntity.get().position),
				isGenerating: activeRequest !== null,
				bounds: activeRequest?.bounds ? helpers.applyOffsetToBox(activeRequest.bounds) : null,
				personality: agent.$fairyConfig.get().personality,
			}
		})

		const thisActiveRequest = this.agent.$activeRequest.get()
		const thisFairyData = {
			id: this.agent.id,
			name: this.agent.$fairyConfig.get().name,
			position: helpers.applyOffsetToVec(this.agent.$fairyEntity.get().position),
			isGenerating: thisActiveRequest !== null,
			bounds: thisActiveRequest?.bounds ? helpers.applyOffsetToBox(thisActiveRequest.bounds) : null,
			personality: this.agent.$fairyConfig.get().personality,
		}

		return {
			type: 'otherFairies',
			otherFairies: otherFairiesData,
			thisFairy: thisFairyData,
		}
	}
}
