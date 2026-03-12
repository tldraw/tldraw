import { DebugPart } from '../../shared/schema/PromptPartDefinitions'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const DebugPartUtil = registerPromptPartUtil(
	class DebugPartUtil extends PromptPartUtil<DebugPart> {
		static override type = 'debug' as const

		override getPart(): DebugPart {
			const debugFlags = this.agent.debug.getDebugFlags()

			return {
				type: 'debug',
				logSystemPrompt: debugFlags.logSystemPrompt,
				logMessages: debugFlags.logMessages,
			}
		}
	}
)
