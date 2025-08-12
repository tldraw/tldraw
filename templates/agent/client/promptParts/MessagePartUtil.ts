import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class MessagePartUtil extends PromptPartUtil {
	static override type = 'message' as const

	override async getPart(options: TLAgentPromptOptions) {
		const { message } = options
		return { message }
	}
}
