import { AgentRequest, FairyModeDefinition } from '@tldraw/fairy-shared'
import { $fairyTasks } from '../../FairyTaskList'
import { FairyAgent } from './FairyAgent'

export interface FairyModeNode {
	onEnter?(agent: FairyAgent, fromMode: FairyModeDefinition['type']): void | Promise<void>
	onExit?(agent: FairyAgent, toMode: FairyModeDefinition['type']): void | Promise<void>
	onPromptStart?(agent: FairyAgent): void | Promise<void>
	onPromptEnd?(agent: FairyAgent): void | Promise<void>
	onRequestComplete?(agent: FairyAgent, request: AgentRequest): void | Promise<void>
}

export const FAIRY_MODE_CHART: Record<FairyModeDefinition['type'], FairyModeNode> = {
	idling: {
		onEnter(agent, _fromMode) {
			agent.cancel()
		},
		onPromptStart(agent) {
			agent.setMode('soloing')
		},
	},
	soloing: {
		onPromptEnd(agent) {
			agent.setMode('idling')
		},
		onRequestComplete(agent) {
			// Continue if there are outstanding tasks
			const myTasks = $fairyTasks.get().filter((task) => task.assignedTo === agent.id)
			const incompleteTasks = myTasks.filter((task) => task.status !== 'done')
			if (incompleteTasks.length > 0) {
				agent.schedule('Continue until all tasks are complete.')
			}
		},
	},
	['working-drone']: {
		onEnter(agent) {
			// Wipe memory before starting a task
			// TODO: Use memory zones for this instead
			agent.$chatHistory.set([])
			agent.$userActionHistory.set([])
			agent.$todoList.set([])
		},
		onExit(agent) {
			// Wipe memory after finishing a task
			// TODO: Use memory zones for this instead
			agent.$chatHistory.set([])
			agent.$userActionHistory.set([])
			agent.$todoList.set([])
		},
		onRequestComplete(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				message: 'Continue until the task is done.',
				bounds: request.bounds,
			})
		},
	},
	['working-solo']: {
		onExit(agent) {
			// Wipe todo list after finishing a task
			// TODO: Use memory zones for this instead
			agent.$todoList.set([])
		},
		onRequestComplete(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				message: 'Continue until the task is done.',
				bounds: request.bounds,
			})
		},
	},
	['standing-by']: {},
	orchestrating: {
		onRequestComplete(agent) {
			if (agent.$waitingFor.get().length === 0) {
				agent.schedule('Continue reviewing until the project is complete.')
			}
		},
	},
}
