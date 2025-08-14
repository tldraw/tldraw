import { BoxModel } from 'tldraw'
import { roundBox } from '../AgentTransform'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class PromptBoundsPartUtil extends PromptPartUtil<BoxModel> {
	static override type = 'promptBounds' as const

	override getPriority() {
		return 80 // same as context bounds (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		return options.request.bounds
	}

	override transformPart(part: BoxModel): BoxModel {
		return roundBox(part)
	}

	override buildContent(promptBounds: BoxModel) {
		return [`Your current prompt bounds are:`, JSON.stringify(promptBounds)]
	}
}
