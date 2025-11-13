import { FairyModeDefinition } from '@tldraw/fairy-shared'
import { $fairyTasks } from '../../FairyTaskList'
import { FairyAgent } from './FairyAgent'

export interface FairyModeNode {
	enter?(agent: FairyAgent, fromMode: FairyModeDefinition['type']): void | Promise<void>
	exit?(agent: FairyAgent, toMode: FairyModeDefinition['type']): void | Promise<void>
	onPromptStart?(agent: FairyAgent): void | Promise<void>
	onPromptEnd?(agent: FairyAgent): void | Promise<void>
	onRequestComplete?(agent: FairyAgent): void | Promise<void>
}

export const FAIRY_MODE_CHART: Record<FairyModeDefinition['type'], FairyModeNode> = {
	idling: {
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
	working: {
		exit(agent, toMode) {
			if (toMode === 'idling' || toMode === 'soloing') {
				agent.$todoList.set([])
			}
		},
		onRequestComplete(agent) {
			// Keep going until the task is complete
			agent.schedule('Continue until the task is done.')
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
