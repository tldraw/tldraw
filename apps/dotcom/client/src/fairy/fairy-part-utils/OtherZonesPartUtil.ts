import { AgentRequest, OtherZonesPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class OtherZonesPartUtil extends PromptPartUtil<OtherZonesPart> {
	static override type = 'otherZones' as const

	override getPart(request: AgentRequest, helpers: AgentHelpers): OtherZonesPart {
		// Get all fungal networks (zones)
		const allZones = this.agent.fairyApp.fungalNetworks.getNetworks()

		// Filter out the current zone (the one this agent is bound to)
		// The agent's ID should match the network ID it's bound to
		const otherZones = allZones
			.filter((zone) => zone.id !== this.agent.id)
			.map((zone) => {
				const offsetBox = helpers.applyOffsetToBox({ x: zone.x, y: zone.y, w: zone.w, h: zone.h })
				return {
					id: zone.id,
					x: offsetBox.x,
					y: offsetBox.y,
					w: offsetBox.w,
					h: offsetBox.h,
					prompt: zone.prompt,
					triggerOn: zone.triggerOn,
				}
			})

		return {
			type: 'otherZones',
			zones: otherZones,
		}
	}
}
