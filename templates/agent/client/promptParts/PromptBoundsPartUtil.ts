import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class PromptBoundsPartUtil extends PromptPartUtil {
	static override type = 'promptBounds' as const

	override async getPart(options: TLAgentPromptOptions) {
		const { promptBounds } = options
		return { promptBounds }
	}
}
