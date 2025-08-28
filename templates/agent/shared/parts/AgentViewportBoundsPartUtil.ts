import { BoxModel, Editor } from 'tldraw'
import { roundBox } from '../AgentTransform'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface AgentViewportBoundsPart extends BasePromptPart<'agentViewportBounds'> {
	bounds: BoxModel
}

export class AgentViewportBoundsPartUtil extends PromptPartUtil<AgentViewportBoundsPart> {
	static override type = 'agentViewportBounds' as const

	override getPriority() {
		return 80 // viewport bounds should appear early (low priority)
	}

	override getPart(_editor: Editor, request: AgentRequest): AgentViewportBoundsPart {
		return {
			type: 'agentViewportBounds',
			bounds: request.bounds,
		}
	}

	override transformPart(part: AgentViewportBoundsPart): AgentViewportBoundsPart {
		return { ...part, bounds: roundBox(part.bounds) }
	}

	override buildContent({ bounds }: AgentViewportBoundsPart): string[] {
		return [
			`The bounds of the part of the canvas that you can currently see are:`,
			JSON.stringify(bounds),
		]
	}
}
