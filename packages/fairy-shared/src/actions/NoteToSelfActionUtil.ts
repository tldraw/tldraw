import z from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil, AgentActionUtilConstructor } from './AgentActionUtil'

const NoteToSelfAction = z
	.object({
		_type: z.literal('noteToSelf'),
		note: z.string(),
		intent: z.string(),
	})
	.meta({
		title: 'Note To Self',
		description: 'The fairy leaves a note for itself to remember something next time.',
	})

type NoteToSelfAction = z.infer<typeof NoteToSelfAction>

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

	override getSchema(actions: AgentActionUtilConstructor['type'][]) {
		if (!actions.includes('noteToSelf')) {
			return null
		}
		return NoteToSelfAction
	}
}
