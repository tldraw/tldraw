import { Streaming, ThinkAction } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class ThinkActionUtil extends AgentActionUtil<ThinkAction> {
	static override type = 'think' as const

	override getInfo(action: Streaming<ThinkAction>) {
		// const time = Math.floor(action.time / 1000)
		// let summary = `Thought for ${time} seconds`
		// if (time === 0) summary = 'Thought for less than a second'
		// if (time === 1) summary = 'Thought for 1 second'

		const summary = action.text ?? (action.complete ? null : 'Thinking...')

		return {
			icon: 'brain' as const,
			description: action.text ?? (action.complete ? null : 'Thinking...'),
			summary,
			pose: 'thinking' as const,
		}
	}
}
