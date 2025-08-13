import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class PromptBoundsPartUtil extends PromptPartUtil {
	static override type = 'promptBounds' as const

	static override getPriority(_prompt: AgentPrompt): number {
		return 80 // same as context bounds (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const promptBounds = options.request?.bounds
		if (!promptBounds) return undefined
		return promptBounds
	}

	static override buildContent(_prompt: AgentPrompt, promptBounds: any): string[] {
		return [`Your current prompt bounds are:`, JSON.stringify(promptBounds)]
	}
}
