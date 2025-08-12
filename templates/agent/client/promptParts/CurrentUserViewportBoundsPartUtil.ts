import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class CurrentUserViewportBoundsPartUtil extends PromptPartUtil {
	static override type = 'currentUserViewportBounds' as const

	override async getPart(options: TLAgentPromptOptions) {
		const { currentUserViewportBounds } = options
		return { currentUserViewportBounds }
	}
}
