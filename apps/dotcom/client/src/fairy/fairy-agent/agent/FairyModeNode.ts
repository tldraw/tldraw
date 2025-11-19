import { AgentRequest, FairyModeDefinition } from '@tldraw/fairy-shared'
import { $fairyTasks } from '../../FairyTaskList'
import { FairyAgent } from './FairyAgent'

export interface FairyModeNode {
	onEnter?(agent: FairyAgent, fromMode: FairyModeDefinition['type']): void | Promise<void>
	onExit?(agent: FairyAgent, toMode: FairyModeDefinition['type']): void | Promise<void>
	onPromptStart?(agent: FairyAgent, request: AgentRequest): void | Promise<void>
	onPromptEnd?(agent: FairyAgent, request: AgentRequest): void | Promise<void>
}

export const FAIRY_MODE_CHART: Record<FairyModeDefinition['type'], FairyModeNode> = {
	idling: {
		onEnter(agent, _fromMode) {
			agent.cancel()
		},
		onPromptStart(agent) {
			// Start timing if enabled
			const debugFlags = agent.$debugFlags.get()
			if (debugFlags.logResponseTime && agent.promptStartTime === null) {
				agent.promptStartTime = performance.now()
			}

			agent.setMode('soloing')
		},
	},
	soloing: {
		onPromptEnd(agent) {
			// Stop timing and log
			if (agent.promptStartTime !== null) {
				const endTime = performance.now()
				const duration = (endTime - agent.promptStartTime) / 1000
				const fairyName = agent.$fairyConfig.get().name
				// eslint-disable-next-line no-console
				console.log(`🧚 Fairy "${fairyName}" prompt completed in ${duration.toFixed(2)}s`)
				agent.promptStartTime = null
			}

			// Continue if there are outstanding tasks
			const myTasks = $fairyTasks.get().filter((task) => task.assignedTo === agent.id)
			const incompleteTasks = myTasks.filter((task) => task.status !== 'done')
			if (incompleteTasks.length > 0) {
				agent.schedule('Continue until all tasks are complete.')
			} else {
				agent.setMode('idling')
			}
		},
	},
	['standing-by']: {},
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
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				message: 'Continue until the task is marked as done.',
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
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				message: 'Continue until the task is marked as done.',
				bounds: request.bounds,
			})
		},
	},
	['orchestrating-active']: {
		onPromptEnd(agent) {
			if (agent.$waitingFor.get().length > 0) {
				agent.setMode('orchestrating-waiting')
				return
			}

			if (agent.$waitingFor.get().length === 0) {
				agent.schedule('Continue reviewing until the project is marked as completed.')
			}
		},
	},
	['orchestrating-waiting']: {
		onPromptStart(agent) {
			agent.setMode('orchestrating-active')
		},
	},
}
