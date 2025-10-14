import { AgentHelpers } from '../AgentHelpers'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil, PromptPartUtilConstructor } from './PromptPartUtil'

interface TimePart extends BasePromptPart<'time'> {
	time: string
}

export class TimePartUtil extends PromptPartUtil<TimePart> {
	static override type = 'time' as const

	override getPart(
		_request: AgentRequest,
		_helpers: AgentHelpers,
		parts: PromptPartUtilConstructor['type'][]
	): TimePart {
		if (!parts.includes('time')) {
			return {
				type: 'time',
				time: 'null',
			}
		}

		return {
			type: 'time',
			time: new Date().toLocaleTimeString(),
		}
	}

	override buildContent({ time }: TimePart) {
		return ["The user's current time is:", time]
	}
}
