import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartHandler } from './PromptPartHandler'

export class CurrentUserViewportBoundsPromptPart extends PromptPartHandler {
	static override type = 'currentUserViewportBounds' as const

	override async getPromptPart(options: TLAgentPromptOptions) {
		const { currentUserViewportBounds } = options
		return { currentUserViewportBounds }
	}
}
