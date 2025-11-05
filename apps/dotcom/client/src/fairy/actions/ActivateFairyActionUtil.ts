import { ActivateFairyAction, Streaming } from '@tldraw/fairy-shared'
import { getFairyAgentById } from '../fairy-agent/agent/fairyAgentsAtom'
import { AgentActionUtil } from './AgentActionUtil'

export class ActivateFairyActionUtil extends AgentActionUtil<ActivateFairyAction> {
	static override type = 'activate-fairy' as const

	override getInfo(action: Streaming<ActivateFairyAction>) {
		const fairy = action.fairyId ? getFairyAgentById(action.fairyId, this.editor) : null
		const name = fairy ? fairy.$fairyConfig.get().name : `fairy with id ${action.fairyId}`

		const text = action.complete ? `Awoke ${name}.` : `Awaking ${name}...`
		return {
			icon: 'pencil' as const,
			description: text,
		}
	}

	override applyAction(action: Streaming<ActivateFairyAction>) {
		if (!action.complete) return
		if (!this.agent || !this.editor) return

		const { fairyId } = action

		const fairy = getFairyAgentById(fairyId, this.editor)
		if (!fairy) {
			this.agent.cancel()
			this.agent.schedule(
				`Fairy with id ${fairyId} not found. Maybe there was a typo or they've since left the canvas.`
			)
			return
		}

		// Make sure the fairy is in the current project
		const project = this.agent.getCurrentProject()
		if (fairy.getCurrentProject()?.id !== project?.id) {
			this.agent.cancel()
			this.agent.schedule(
				`Fairy with id ${fairyId} is not in the current project. Maybe they've since left the project.`
			)
			return
		}

		fairy.helpOut(undefined, this.agent.id)
	}
}
