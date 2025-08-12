import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartHandler } from './PromptPartHandler'

export class ContextBoundsPromptPart extends PromptPartHandler {
	static override type = 'contextBounds' as const

	override async getPromptPart(options: TLAgentPromptOptions) {
		const { contextBounds } = options
		return { contextBounds }
	}
}
