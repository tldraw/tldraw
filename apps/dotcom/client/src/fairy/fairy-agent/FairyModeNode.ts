import { AgentRequest, FairyModeDefinition, FairyTask } from '@tldraw/fairy-shared'
import { FairyAgent } from './FairyAgent'

function startPromptTimer(agent: FairyAgent): void {
	const debugFlags = agent.$debugFlags.get()
	if (debugFlags.logResponseTime && agent.promptStartTime === null) {
		agent.promptStartTime = performance.now()
	}
}

function stopPromptTimer(agent: FairyAgent): void {
	if (agent.promptStartTime !== null) {
		const endTime = performance.now()
		const duration = (endTime - agent.promptStartTime) / 1000
		const fairyName = agent.getConfig().name
		// eslint-disable-next-line no-console
		console.log(`🧚 Fairy "${fairyName}" prompt completed in ${duration.toFixed(2)}s`)
		agent.promptStartTime = null
	}
}

export interface FairyModeNode {
	onEnter?(agent: FairyAgent, fromMode: FairyModeDefinition['type']): void
	onExit?(agent: FairyAgent, toMode: FairyModeDefinition['type']): void
	onPromptStart?(agent: FairyAgent, request: AgentRequest): void
	onPromptEnd?(agent: FairyAgent, request: AgentRequest): void
	onPromptCancel?(agent: FairyAgent, request: AgentRequest): void
}

export const FAIRY_MODE_CHART: Record<FairyModeDefinition['type'], FairyModeNode> = {
	idling: {
		onPromptStart(agent) {
			startPromptTimer(agent)

			// Check one-shot mode flag and set mode accordingly
			const oneShotMode = agent.$useOneShottingMode.get()
			if (oneShotMode) {
				agent.mode.setMode('one-shotting')
			} else {
				agent.mode.setMode('soloing')
			}
		},
		onEnter(agent, fromMode) {
			// If waking up from sleeping, move to a spawn point near the viewport center
			if (fromMode === 'sleeping') {
				agent.position.moveToSpawnPoint()
			}
			agent.todos.deleteAll()
			agent.userAction.clearHistory()
			stopPromptTimer(agent)
		},
	},
	['sleeping']: {
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['one-shotting']: {
		onPromptEnd(agent) {
			const todoList = agent.todos.getTodos()
			const incompleteTodoItems = todoList.filter((item) => item.status !== 'done')
			if (incompleteTodoItems.length > 0) {
				agent.schedule(
					"Continue until all your todo items are marked as done. If you've completed the work, feel free to mark them as done, otherwise keep going."
				)
			} else {
				agent.mode.setMode('idling')
			}
		},
		onPromptCancel(agent) {
			agent.mode.setMode('one-shotting-pausing')
		},
		onExit(agent, toMode) {
			if (toMode !== 'one-shotting-pausing') {
				agent.userAction.clearHistory()
				agent.todos.deleteAll()
			}
		},
	},
	['one-shotting-pausing']: {
		onPromptStart(agent) {
			agent.mode.setMode('one-shotting')
		},
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	soloing: {
		onPromptEnd(agent) {
			// Continue if there are outstanding tasks
			const myTasks = agent.fairyApp.tasks
				.getTasks()
				.filter((task: FairyTask) => task.assignedTo === agent.id)
			const incompleteTasks = myTasks.filter((task: FairyTask) => task.status !== 'done')
			if (incompleteTasks.length > 0) {
				agent.schedule('Continue until all tasks are marked as complete.')
			} else {
				agent.mode.setMode('idling')
			}
		},
		onPromptCancel(agent) {
			agent.mode.setMode('idling')
		},
	},
	['standing-by']: {
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['working-drone']: {
		onEnter(agent) {
			agent.userAction.clearHistory()
			agent.todos.deleteAll()
		},
		onExit(agent) {
			agent.userAction.clearHistory()
			agent.todos.deleteAll()
		},
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				agentMessages: ['Continue until the task is marked as done.'],
				bounds: request.bounds,
			})
		},
		onPromptCancel() {
			throw new Error('Cannot cancel a fairy mid-project. Clear the project first.')
		},
	},
	['working-solo']: {
		onEnter(agent) {
			agent.userAction.clearHistory()
			agent.todos.flush()
		},
		onExit(agent) {
			// Wipe todo list after finishing a task
			agent.userAction.clearHistory()
			agent.todos.flush()
		},
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				agentMessages: ['Continue until the task is marked as done.'],
				bounds: request.bounds,
			})
		},
		onPromptCancel(agent) {
			agent.mode.setMode('idling')
		},
	},
	['orchestrating-active']: {
		onPromptEnd(agent) {
			const project = agent.getProject()
			if (!project) {
				agent.mode.setMode('idling')
				return
			}

			if (agent.waits.isWaiting()) {
				const members = project.members.filter((member) => member.id !== agent.id)
				const memberAgents = agent.fairyApp.agents
					.getAgents()
					.filter((a: FairyAgent) => members.some((member) => member.id === a.id))
				const activeMemberAgents = memberAgents.filter((a: FairyAgent) => a.requests.isGenerating())

				// If there are no active members, we need to deploy someone again probably!
				if (activeMemberAgents.length === 0) {
					agent.schedule(
						'No one is currently working on tasks. Consider deploying someone again, or end the project if all tasks are complete.'
					)
					return
				}

				// Wait for all other members to finish their tasks
				agent.mode.setMode('orchestrating-waiting')
				return
			}

			if (agent.waits.getWaitingFor().length === 0) {
				const projectTasks = agent.fairyApp.tasks.getTasksByProjectId(project.id)
				const outstandingTasks = projectTasks.filter((task) => task.status !== 'done')
				const completedTasks = projectTasks.filter((task) => task.status === 'done')
				if (outstandingTasks.length > 0) {
					agent.schedule(
						'There are still outstanding tasks. Continue until all tasks are marked as done and the project is ended.'
					)
					return
				}

				if (projectTasks.length === 0) {
					agent.schedule(
						'There are no tasks created for the project yet. Consider creating tasks and directing a project member to start a task.'
					)
					return
				}

				if (completedTasks.length === projectTasks.length) {
					agent.schedule('All tasks have been completed. You may end the project.')
					return
				}
			}
		},
		onPromptCancel() {
			throw new Error('Cannot cancel a fairy mid-project. Clear the project first.')
		},
	},
	['orchestrating-waiting']: {
		onPromptStart(agent) {
			agent.mode.setMode('orchestrating-active')
		},
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['duo-orchestrating-active']: {
		onPromptEnd(agent) {
			const project = agent.getProject()
			if (!project) {
				agent.mode.setMode('idling')
				return
			}

			if (agent.waits.isWaiting()) {
				const partner = project.members.find((member) => member.id !== agent.id)
				if (!partner) {
					agent.mode.setMode('idling')
					return
				}

				const partnerAgent = agent.fairyApp.agents
					.getAgents()
					.find((a: FairyAgent) => a.id === partner.id)
				if (!partnerAgent) {
					agent.mode.setMode('idling')
					return
				}

				// If partner is not active, we might need to deploy them again or continue ourselves
				if (!partnerAgent.requests.isGenerating()) {
					agent.schedule(
						'Your partner is not currently working on tasks. Consider directing them to start a task, starting a task yourself, or ending the project if all tasks are complete.'
					)
					return
				}

				// Wait for partner to finish their tasks
				agent.mode.setMode('duo-orchestrating-waiting')
				return
			}

			if (agent.waits.getWaitingFor().length === 0) {
				const projectTasks = agent.fairyApp.tasks.getTasksByProjectId(project.id)
				const outstandingTasks = projectTasks.filter((task) => task.status !== 'done')
				const completedTasks = projectTasks.filter((task) => task.status === 'done')
				if (outstandingTasks.length > 0) {
					agent.schedule(
						'There are still outstanding tasks. Continue until all tasks are marked as done and the project is ended.'
					)
					return
				}

				if (projectTasks.length === 0) {
					agent.schedule(
						'There are no tasks created for the project yet. Consider creating tasks and directing your partner to start a task.'
					)
					return
				}

				if (completedTasks.length === projectTasks.length) {
					agent.schedule('All tasks have been completed. You may end the project.')
					return
				}
			}
		},
		onPromptCancel() {
			throw new Error('Cannot cancel a fairy mid-project. Clear the project first.')
		},
	},
	['duo-orchestrating-waiting']: {
		onPromptStart(agent) {
			agent.mode.setMode('duo-orchestrating-active')
		},
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['working-orchestrator']: {
		onEnter(agent) {
			agent.userAction.clearHistory()
			agent.todos.deleteAll()
		},
		onExit(agent) {
			agent.userAction.clearHistory()
			agent.todos.deleteAll()
		},
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				agentMessages: [
					"If you've finished the task, mark it as done. Otherwise, continue until the task finished.",
				],
				bounds: request.bounds,
			})
		},
		onPromptCancel() {
			throw new Error('Cannot cancel a fairy mid-project. Clear the project first.')
		},
	},
}
