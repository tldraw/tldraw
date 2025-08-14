import { BoxModel } from 'tldraw'
import { roundBox } from '../AgentTransform'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'

export class AgentViewportBoundsPartUtil extends PromptPartUtil<BoxModel> {
	static override type = 'agentViewportBounds' as const

	override getPriority() {
		return 80 // viewport bounds should appear early (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		return options.request.bounds
	}

	override transformPart(part: BoxModel): BoxModel {
		return roundBox(part)
	}

	override buildContent(contextBounds: BoxModel): string[] {
		return [`Your current visible bounds are:`, JSON.stringify(contextBounds)]
	}
}
