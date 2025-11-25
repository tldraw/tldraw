import { AgentRequest, DirectToStartTaskAction, Streaming } from '@tldraw/fairy-shared'
import { $fairyAgentsAtom } from '../fairy-agent/agent/fairyAgentsAtom'
import { assignFairyToTask, getFairyTaskById, setFairyTaskStatus } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class DirectToStartTaskActionUtil extends AgentActionUtil<DirectToStartTaskAction> {
	static override type = 'direct-to-start-project-task' as const

	override getInfo(action: Streaming<DirectToStartTaskAction>) {
		let otherFairyName = 'a fairy'

		if (action.complete) {
			const otherFairy = $fairyAgentsAtom
				.get(this.editor)
				.find((fairy) => fairy.id === action.otherFairyId)
			otherFairyName = otherFairy ? otherFairy.$fairyConfig.get().name : 'a fairy'
		}

		const otherFairyFirstName = otherFairyName.split(' ')[0]
		const task = action.complete ? getFairyTaskById(action.taskId) : null

		const text = action.complete
			? `Directed ${otherFairyFirstName} to do task${task ? `: ${task.title}` : ''}`
			: `Directing ${otherFairyFirstName} to do task...`

		return {
			icon: 'comment' as const,
			description: text,
			canGroup: () => false,
			pose: 'writing' as const, // todo: bullhorn
		}
	}

	override applyAction(action: Streaming<DirectToStartTaskAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const { otherFairyId, taskId } = action

		const project = this.agent.getProject()
		if (!project) return // shouldn't be possible

		const otherFairy = $fairyAgentsAtom.get(this.editor).find((fairy) => fairy.id === otherFairyId)
		if (!otherFairy) {
			this.agent.interrupt({
				input: `Fairy ${otherFairyId} not found. Please take another look at the fairy list and try again.`,
			})
			return
		}

		const task = getFairyTaskById(taskId)
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

		assignFairyToTask(taskId, otherFairyId, $fairyAgentsAtom.get(this.editor))
		setFairyTaskStatus(taskId, 'in-progress')

		const otherFairyPrompt: Partial<AgentRequest> = {
			messages: [`You have been asked to complete task ${taskId}. Please complete it.`],
			source: 'other-agent',
		}
		if (
			task.x !== undefined &&
			task.y !== undefined &&
			task.w !== undefined &&
			task.h !== undefined
		) {
			otherFairyPrompt.bounds = {
				x: task.x,
				y: task.y,
				w: task.w,
				h: task.h,
			}
		}

		otherFairy.interrupt({ mode: 'working-drone', input: otherFairyPrompt })
	}
}
