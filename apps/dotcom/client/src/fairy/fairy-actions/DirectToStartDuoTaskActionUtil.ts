import {
	AgentRequest,
	DirectToStartDuoTaskAction,
	Streaming,
	createAgentActionInfo,
} from '@tldraw/fairy-shared'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { AgentActionUtil } from './AgentActionUtil'

export class DirectToStartDuoTaskActionUtil extends AgentActionUtil<DirectToStartDuoTaskAction> {
	static override type = 'direct-to-start-duo-task' as const

	override getInfo(action: Streaming<DirectToStartDuoTaskAction>) {
		let otherFairyName = 'your partner'

		if (action.complete) {
			const otherFairy = this.agent.fairyApp.agents
				.getAgents()
				.find((fairy: FairyAgent) => fairy.id === action.otherFairyId)
			otherFairyName = otherFairy ? otherFairy.getConfig().name : 'partner'
		}

		const otherFairyFirstName = otherFairyName?.split(' ')[0] ?? ''
		const task = action.complete ? this.agent.fairyApp.tasks.getTaskById(action.taskId) : null

		const text = action.complete
			? `Asked ${otherFairyFirstName} to do${task ? `: ${task.title}` : ' a task'}`
			: `Asking ${otherFairyFirstName} to do a task...`

		return createAgentActionInfo({
			icon: 'comment',
			description: text,
			canGroup: () => false,
			pose: 'reviewing', // todo: bullhorn
		})
	}

	override applyAction(action: Streaming<DirectToStartDuoTaskAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const { otherFairyId, taskId } = action

		const project = this.agent.getProject()
		if (!project) return // shouldn't be possible

		if (otherFairyId === this.agent.id) {
			this.agent.interrupt({
				input:
					'You cannot direct yourself to do a task. Please direct your partner to do the task, or start the task yourself using the Start Task action.',
			})
			return
		}

		const allAgents = this.agent.fairyApp.agents.getAgents()
		const otherFairy = allAgents.find((fairy: FairyAgent) => fairy.id === otherFairyId)
		if (!otherFairy) {
			this.agent.interrupt({
				input: `Fairy ${otherFairyId} not found. Please take another look at the fairy list and try again.`,
			})
			return
		}

		const task = this.agent.fairyApp.tasks.getTaskById(taskId)
		if (!task) {
			this.agent.interrupt({
				input: `Task ${taskId} not found. Please take another look at the task list and try again.`,
			})
			return
		}

		if (task.projectId !== project.id) {
			this.agent.interrupt({
				input: `Task ${taskId} is not in the same project as you. Please take another look at the task list and try again.`,
			})
			return
		}

		this.agent.fairyApp.tasks.assignFairyToTask(taskId, otherFairyId, allAgents)
		this.agent.fairyApp.tasks.setTaskStatus(taskId, 'in-progress')

		const firstName = this.agent.getConfig().name?.split(' ')[0] ?? ''

		const otherFairyInput: Partial<AgentRequest> = {
			agentMessages: [`You have been asked to complete task ${taskId}. Please complete it.`],
			userMessages: [`Asked by ${firstName} to do${task.title ? `: ${task.title}` : ' a task'}`],
			source: 'other-agent',
		}
		if (
			task.x !== undefined &&
			task.y !== undefined &&
			task.w !== undefined &&
			task.h !== undefined
		) {
			otherFairyInput.bounds = {
				x: task.x,
				y: task.y,
				w: task.w,
				h: task.h,
			}
		}

		otherFairy.interrupt({ mode: 'working-drone', input: otherFairyInput })
	}
}
