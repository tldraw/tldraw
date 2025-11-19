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

		const text = action.complete
			? `Directed ${otherFairyName} to start task ${action.taskId}.`
			: `Directing ${otherFairyName} to start task ${action.taskId}...`

		return {
			icon: 'pencil' as const,
			description: text,
		}
	}

	override applyAction(action: Streaming<DirectToStartTaskAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const { otherFairyId, taskId } = action

		const project = this.agent.getProject()
		if (!project) return // shouldn't be possible

		const otherFairy = $fairyAgentsAtom.get(this.editor).find((fairy) => fairy.id === otherFairyId)
		if (!otherFairy) return // todo error

		const task = getFairyTaskById(taskId)
		if (!task) return // todo error

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

		otherFairy.setMode('working-drone')
		if (otherFairy.isGenerating()) {
			otherFairy.schedule(otherFairyPrompt)
		} else {
			otherFairy.prompt(otherFairyPrompt)
		}
		// todo find a way to agent.interrupt to be able to prompt without causing errors, and use that here
	}
}
