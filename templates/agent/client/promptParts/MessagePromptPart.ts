import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartHandler } from './PromptPartHandler'

export class MessagePromptPart extends PromptPartHandler {
	static override type = 'message' as const

	override async getPromptPart(options: TLAgentPromptOptions) {
		const { message } = options
		return { message }
	}
}
