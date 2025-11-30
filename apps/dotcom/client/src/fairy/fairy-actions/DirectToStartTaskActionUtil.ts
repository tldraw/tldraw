import { AgentInput, DirectToStartTaskAction, Streaming } from '@tldraw/fairy-shared'
import { $fairyAgentsAtom } from '../fairy-globals'
import { assignFairyToTask, getFairyTaskById, setFairyTaskStatus } from '../fairy-task-list'
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
			? `Asked ${otherFairyFirstName} to do${task ? `: ${task.title}` : ' a task'}`
			: `Asking ${otherFairyFirstName} to do a task...`

		return {
			icon: 'comment' as const,
			description: text,
			canGroup: () => false,
			pose: 'reviewing' as const, // todo: bullhorn
		}
	}

	override applyAction(action: Streaming<DirectToStartTaskAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const { otherFairyId, taskId } = action

		const project = this.agent.getProject()
		if (!project) return // shouldn't be possible

		if (otherFairyId === this.agent.id) {
			this.agent.interrupt({
				input:
					'You cannot direct yourself to do a task. Please direct another fairy to do the task.',
			})
			return
		}

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

		const firstName = this.agent.$fairyConfig.get().name.split(' ')[0]
		const otherFairyInput: AgentInput = {
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

		otherFairy.interrupt({
			mode: 'working-drone',
			input: otherFairyInput,
		})
	}
}
