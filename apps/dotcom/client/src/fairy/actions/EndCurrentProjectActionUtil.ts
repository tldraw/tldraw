import { EndCurrentProjectAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyAgentById } from '../fairy-agent/agent/fairyAgentsAtom'
import { deleteProject } from '../Projects'
import { $sharedTodoList } from '../SharedTodoList'
import { AgentActionUtil } from './AgentActionUtil'

export class EndCurrentProjectActionUtil extends AgentActionUtil<EndCurrentProjectAction> {
	static override type = 'end-current-project' as const

	override getInfo(action: Streaming<EndCurrentProjectAction>) {
		return {
			icon: 'note' as const,
			description: action.complete ? 'Ended current project' : 'Ending current project...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<EndCurrentProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const project = this.agent.getCurrentProject()
		if (!project) return

		const otherMemberFairies = project.memberIds
			.filter((id) => id !== this.agent.id)
			.map((id) => getFairyAgentById(id, this.editor))
			.filter((fairy) => fairy !== undefined)

		// Wipe the chat history of all other the project's fairies
		otherMemberFairies.forEach((fairy) => {
			fairy.reset()
		})

		$sharedTodoList.update((sharedTodoItems) => {
			return sharedTodoItems.filter((item) => item.projectId !== project.id)
		})

		deleteProject(project.id)
	}
}
