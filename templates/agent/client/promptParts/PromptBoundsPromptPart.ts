import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartHandler } from './PromptPartHandler'

export class PromptBoundsPromptPart extends PromptPartHandler {
	static override type = 'promptBounds' as const

	override async getPromptPart(options: TLAgentPromptOptions) {
		const { promptBounds } = options
		return { promptBounds }
	}
}
