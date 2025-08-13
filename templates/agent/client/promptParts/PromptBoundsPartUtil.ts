import { BoxModel } from 'tldraw'
import { AgentTransform } from '../AgentTransform'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class PromptBoundsPartUtil extends PromptPartUtil {
	static override type = 'promptBounds' as const

	override async getPart(options: AgentPromptOptions) {
		const promptBounds = options.request?.bounds
		if (!promptBounds) return undefined
		return promptBounds
	}

	override transformPromptPart(
		promptPart: BoxModel,
		transform: AgentTransform,
		_prompt: Partial<AgentPrompt>
	): BoxModel {
		return transform.roundBoxModel(promptPart)
	}

	static override getPriority(_prompt: AgentPrompt): number {
		return 80 // same as context bounds (low priority)
	}

	static override buildContent(_prompt: AgentPrompt, promptBounds: BoxModel): string[] {
		return [`Your current prompt bounds are:`, JSON.stringify(promptBounds)]
	}
}
