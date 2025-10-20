import { NoteToSelfAction, Streaming } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class NoteToSelfActionUtil extends AgentActionUtil<NoteToSelfAction> {
	static override type = 'noteToSelf' as const

	override getInfo(action: Streaming<NoteToSelfAction>) {
		const label = action.complete ? 'Note To Self' : 'Noting to self'
		return {
			icon: 'pencil' as const,
			description: `**${label}**: ${action.intent ?? ''}`,
			// description: `${action.intent ?? ''}`,
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<NoteToSelfAction>) {
		if (!action.complete) return
		if (!this.agent) return

		this.agent!.schedule({ data: [action.note] })
	}
}
