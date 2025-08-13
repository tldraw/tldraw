import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class PromptBoundsPartUtil extends PromptPartUtil {
	static override type = 'promptBounds' as const

	static override getPriority(_prompt: TLAgentPrompt): number {
		return 80 // same as context bounds (low priority)
	}

	override async getPart(options: TLAgentPromptOptions) {
		const promptBounds = options.request?.bounds
		if (!promptBounds) return undefined
		return promptBounds
	}

	static override buildContent(_prompt: TLAgentPrompt, promptBounds: any): string[] {
		return [`Your current prompt bounds are:`, JSON.stringify(promptBounds)]
	}
}
