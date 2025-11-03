import { AgentRequest, FAIRY_SHOUTING_DIMENSIONS, OtherFairiesPart } from '@tldraw/fairy-shared'
import { Box } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyAgentsAtom } from '../fairy-agent/agent/fairyAgentsAtom'
import { PromptPartUtil } from './PromptPartUtil'

export class OtherFairiesPartUtil extends PromptPartUtil<OtherFairiesPart> {
	static override type = 'otherFairies' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): OtherFairiesPart {
		// Use raw positions (before offset) for distance calculation
		const thisFairyPosition = this.agent.$fairyEntity.get().position
		const shoutingBox = Box.FromCenter(thisFairyPosition, FAIRY_SHOUTING_DIMENSIONS)

		const otherFairies = $fairyAgentsAtom
			.get(this.editor)
			.filter((agent) => agent.id !== this.agent.id)

		const nearbyFairies: typeof otherFairies = []
		const distantFairies: typeof otherFairies = []

		for (const agent of otherFairies) {
			// Use raw position (before offset) for distance check
			const fairyRawPosition = agent.$fairyEntity.get().position
			const isWithinShoutingDistance = Box.ContainsPoint(shoutingBox, fairyRawPosition)

			if (isWithinShoutingDistance) {
				nearbyFairies.push(agent)
			} else {
				distantFairies.push(agent)
			}
		}

		const mapFairyToData = (agent: (typeof otherFairies)[0]) => {
			const activeRequest = agent.$activeRequest.get()
			return {
				id: agent.id,
				name: agent.$fairyConfig.get().name,
				position: helpers.applyOffsetToVec(agent.$fairyEntity.get().position),
				isGenerating: activeRequest !== null,
				bounds: activeRequest?.bounds ? helpers.applyOffsetToBox(activeRequest.bounds) : null,
				personality: agent.$fairyConfig.get().personality,
				currentProjectId: agent.$currentProjectId.get() || null,
			}
		}

		const thisActiveRequest = this.agent.$activeRequest.get()
		const thisFairyData = {
			id: this.agent.id,
			name: this.agent.$fairyConfig.get().name,
			position: helpers.applyOffsetToVec(this.agent.$fairyEntity.get().position),
			isGenerating: thisActiveRequest !== null,
			bounds: thisActiveRequest?.bounds ? helpers.applyOffsetToBox(thisActiveRequest.bounds) : null,
			personality: this.agent.$fairyConfig.get().personality,
			currentProjectId: this.agent.$currentProjectId.get() || null,
		}

		return {
			type: 'otherFairies',
			nearbyFairies: nearbyFairies.map(mapFairyToData),
			distantFairies: distantFairies.map(mapFairyToData),
			thisFairy: thisFairyData,
		}
	}
}
