import { AgentRequest, AssignTaskAction, Streaming } from '@tldraw/fairy-shared'
import { $fairyAgentsAtom } from '../fairy-agent/agent/fairyAgentsAtom'
import { assignFairyToTask, getFairyTaskById, setFairyTaskStatus } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class AssignTaskActionUtil extends AgentActionUtil<AssignTaskAction> {
	static override type = 'direct-to-start-project-task' as const

	override getInfo(action: Streaming<AssignTaskAction>) {
		let otherFairyName = 'a fairy'

		if (action.complete) {
			const otherFairy = $fairyAgentsAtom
				.get(this.editor)
				.find((fairy) => fairy.id === action.otherFairyId)
			otherFairyName = otherFairy ? otherFairy.$fairyConfig.get().name : 'a fairy'
		}

		const text = action.complete
			? `Assigned task ${action.taskId} to ${otherFairyName}.`
			: `Assigning task ${action.taskId} to ${otherFairyName}...`

		return {
			icon: 'pencil' as const,
			description: text,
		}
	}

	override applyAction(action: Streaming<AssignTaskAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const { otherFairyId, taskId } = action

		const otherFairy = $fairyAgentsAtom.get(this.editor).find((fairy) => fairy.id === otherFairyId)
		if (!otherFairy) return // todo error

		const task = getFairyTaskById(taskId)
		assignFairyToTask(taskId, otherFairyId, $fairyAgentsAtom.get(this.editor))
		setFairyTaskStatus(taskId, 'in-progress')
		if (!task) return // todo error

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

		otherFairy.setMode('working')
		otherFairy.prompt(otherFairyPrompt)
	}
}
