import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class ContextBoundsPartUtil extends PromptPartUtil {
	static override type = 'contextBounds' as const

	override async getPart(options: TLAgentPromptOptions) {
		const { contextBounds } = options
		return { contextBounds }
	}
}
