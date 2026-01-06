import { TimePart } from '../../shared/schema/PromptPartDefinitions'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const TimePartUtil = registerPromptPartUtil(
	class TimePartUtil extends PromptPartUtil<TimePart> {
		static override type = 'time' as const

		override getPart(): TimePart {
			return {
				type: 'time',
				timestamp: Date.now(),
			}
		}

		override buildContent({ timestamp }: TimePart) {
			const time = new Date(timestamp).toLocaleTimeString()
			return ["The user's current time is:", time]
		}
	}
)
