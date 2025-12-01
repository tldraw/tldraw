import { CreateDuoTaskAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

// Creates a task for a duo project with a specifiable assignedTo id
export class CreateDuoTaskActionUtil extends AgentActionUtil<CreateDuoTaskAction> {
	static override type = 'create-duo-task' as const

	override getInfo(action: Streaming<CreateDuoTaskAction>) {
		return createAgentActionInfo({
			icon: 'note',
			description: action.complete
				? `Planned task: ${action.title}`
				: `Planning task${action.title ? `: ${action.title}` : ''}${action.text ? `\n\n${action.text}` : ''}`,
			pose: 'writing',
		})
	}

	override applyAction(action: Streaming<CreateDuoTaskAction>, helpers: AgentHelpers) {
		if (!action.complete) return

		const project = this.agent.getProject()
		if (!project) {
			this.agent.interrupt({
				input: 'You are not currently part of a project. You must be in a project to create tasks.',
			})
			return
		}

		const assignedToId = action.assignedTo
		const assignedAgentsProject = this.agent.fairyApp.projects.getProjectByAgentId(assignedToId)
		if (!assignedAgentsProject || assignedAgentsProject.id !== project.id) {
			this.agent.interrupt({
				input: `Fairy ${assignedToId} is not in the same project as you. You may only assign tasks to your partner in the same duo project.`,
			})
			return
		}

		// todo don't allow them to assign to themselves for now

		const bounds = helpers.removeOffsetFromBox({
			x: action.x,
			y: action.y,
			w: action.w,
			h: action.h,
		})

		this.agent.fairyApp.tasks.createTask({
			id: action.taskId,
			title: action.title,
			text: action.text,
			assignedTo: action.assignedTo,
			projectId: project.id,
			status: 'todo',
			pageId: this.agent.editor.getCurrentPageId(),
			x: bounds.x,
			y: bounds.y,
			w: bounds.w,
			h: bounds.h,
		})
	}
}
