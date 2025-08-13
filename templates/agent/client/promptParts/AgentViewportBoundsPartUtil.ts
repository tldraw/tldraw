import { BoxModel } from 'tldraw'
import { AgentTransform } from '../AgentTransform'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class AgentViewportBoundsPartUtil extends PromptPartUtil<BoxModel> {
	static override type = 'agentViewportBounds' as const

	override getPriority() {
		return 80 // viewport bounds should appear early (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		return options.request.bounds
	}

	override transformPart(part: BoxModel, transform: AgentTransform): BoxModel {
		return transform.roundBoxModel(part)
	}

	override buildContent(contextBounds: BoxModel): string[] {
		return [`Your current visible bounds are:`, JSON.stringify(contextBounds)]
	}
}
