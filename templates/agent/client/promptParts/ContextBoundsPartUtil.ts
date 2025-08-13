import { BoxModel } from 'tldraw'
import { AgentTransform } from '../AgentTransform'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class ContextBoundsPartUtil extends PromptPartUtil {
	static override type = 'contextBounds' as const

	static override getPriority(_prompt: AgentPrompt): number {
		return 80 // viewport bounds should appear early (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const contextBounds = options.request?.bounds
		if (!contextBounds) return undefined
		return contextBounds
	}

	override transformPromptPart(
		promptPart: BoxModel,
		transform: AgentTransform,
		_prompt: Partial<AgentPrompt>
	): BoxModel {
		return transform.roundBoxModel(promptPart)
	}

	static override buildContent(_prompt: AgentPrompt, contextBounds: BoxModel): string[] {
		return [`Your current context bounds are:`, JSON.stringify(contextBounds)]
	}
}
