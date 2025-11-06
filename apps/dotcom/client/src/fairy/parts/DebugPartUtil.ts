import { AgentRequest, DebugPart } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export class DebugPartUtil extends PromptPartUtil<DebugPart> {
	static override type = 'debug' as const

	override getPart(_request: AgentRequest): DebugPart {
		const debugFlags = this.agent.$debugFlags.get()

		return {
			type: 'debug',
			logSystemPrompt: debugFlags.logSystemPrompt,
			logMessages: debugFlags.logMessages,
		}
	}
}
