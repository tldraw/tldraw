import { CreateProjectTaskAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getProjectByAgentId } from '../fairy-projects'
import { createFairyTask } from '../fairy-task-list'
import { AgentActionUtil } from './AgentActionUtil'

// Creates a task for a project with a specifiable assignedTo id
export class CreateProjectTaskActionUtil extends AgentActionUtil<CreateProjectTaskAction> {
	static override type = 'create-project-task' as const

	override getInfo(action: Streaming<CreateProjectTaskAction>) {
		return {
			icon: 'note' as const,
			description: action.complete
				? `Planned task: ${action.title}`
				: `Planning task${action.title ? `: ${action.title}` : ''}${action.text ? `\n\n${action.text}` : ''}`,
			pose: 'writing' as const,
		}
	}

	override applyAction(action: Streaming<CreateProjectTaskAction>, helpers: AgentHelpers) {
		if (!action.complete) return

		const project = this.agent.getProject()
		if (!project) {
			this.agent.interrupt({
				input: 'You are not currently part of a project. You must be in a project to create tasks.',
			})
			return
		}

		const assignedToId = action.assignedTo
		const assignedAgentsProject = getProjectByAgentId(assignedToId)
		if (!assignedAgentsProject || assignedAgentsProject.id !== project.id) {
			this.agent.interrupt({
				input: `Fairy ${assignedToId} is not in the same project as you. You may only assign tasks to fairies in the same project.`,
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

		createFairyTask({
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
