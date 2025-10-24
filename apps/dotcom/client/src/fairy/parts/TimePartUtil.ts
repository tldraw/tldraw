import { TimePart } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export class TimePartUtil extends PromptPartUtil<TimePart> {
	static override type = 'time' as const

	override getPart(): TimePart {
		return {
			type: 'time',
			time: new Date().toLocaleTimeString(),
		}
	}
}
