import { TimePart } from '../../shared/schema/PromptPartDefinitions'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const TimePartUtil = registerPromptPartUtil(
	class TimePartUtil extends PromptPartUtil<TimePart> {
		static override type = 'time' as const

		override getPart(): TimePart {
			return {
				type: 'time',
				time: new Date().toLocaleTimeString(),
			}
		}
	}
)
