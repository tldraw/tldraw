import { AgentRequest, FairyModeDefinition } from '@tldraw/fairy-shared'
import { $fairyAgentsAtom, $fairyTasks } from '../fairy-globals'
import { getFairyTasksByProjectId } from '../fairy-task-list'
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
		const fairyName = agent.$fairyConfig.get().name
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
				agent.modeManager.setMode('one-shotting')
			} else {
				agent.modeManager.setMode('soloing')
			}
		},
		onEnter(agent, fromMode) {
			// If waking up from sleeping, move to a spawn point near the viewport center
			if (fromMode === 'sleeping') {
				agent.positionManager.moveToSpawnPoint()
			}
			agent.todoManager.deleteAll()
			agent.userActionTracker.clearHistory()
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
			const todoList = agent.todoManager.getTodos()
			const incompleteTodoItems = todoList.filter((item) => item.status !== 'done')
			if (incompleteTodoItems.length > 0) {
				agent.schedule(
					"Continue until all your todo items are marked as done. If you've completed the work, feel free to mark them as done, otherwise keep going."
				)
			} else {
				agent.modeManager.setMode('idling')
			}
		},
		onPromptCancel(agent) {
			agent.modeManager.setMode('one-shotting-pausing')
		},
		onExit(agent, toMode) {
			if (toMode !== 'one-shotting-pausing') {
				agent.userActionTracker.clearHistory()
				agent.todoManager.deleteAll()
			}
		},
	},
	['one-shotting-pausing']: {
		onPromptStart(agent) {
			agent.modeManager.setMode('one-shotting')
		},
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	soloing: {
		onPromptEnd(agent) {
			// Continue if there are outstanding tasks
			const myTasks = $fairyTasks.get().filter((task) => task.assignedTo === agent.id)
			const incompleteTasks = myTasks.filter((task) => task.status !== 'done')
			if (incompleteTasks.length > 0) {
				agent.schedule('Continue until all tasks are marked as complete.')
			} else {
				agent.modeManager.setMode('idling')
			}
		},
		onPromptCancel(agent) {
			agent.modeManager.setMode('idling')
		},
	},
	['standing-by']: {
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['working-drone']: {
		onEnter(agent) {
			agent.userActionTracker.clearHistory()
			agent.todoManager.deleteAll()
		},
		onExit(agent) {
			agent.userActionTracker.clearHistory()
			agent.todoManager.deleteAll()
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
			agent.userActionTracker.clearHistory()
			agent.todoManager.flush()
		},
		onExit(agent) {
			// Wipe todo list after finishing a task
			agent.userActionTracker.clearHistory()
			agent.todoManager.flush()
		},
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				agentMessages: ['Continue until the task is marked as done.'],
				bounds: request.bounds,
			})
		},
		onPromptCancel(agent) {
			agent.modeManager.setMode('idling')
		},
	},
	['orchestrating-active']: {
		onPromptEnd(agent) {
			const project = agent.getProject()
			if (!project) {
				agent.modeManager.setMode('idling')
				return
			}

			if (agent.waitManager.isWaiting()) {
				const members = project.members.filter((member) => member.id !== agent.id)
				const memberAgents = $fairyAgentsAtom
					.get(agent.editor)
					.filter((agent) => members.some((member) => member.id === agent.id))
				const activeMemberAgents = memberAgents.filter((agent) =>
					agent.requestManager.isGenerating()
				)

				// If there are no active members, we need to deploy someone again probably!
				if (activeMemberAgents.length === 0) {
					agent.schedule(
						'No one is currently working on tasks. Consider deploying someone again, or end the project if all tasks are complete.'
					)
					return
				}

				// Wait for all other members to finish their tasks
				agent.modeManager.setMode('orchestrating-waiting')
				return
			}

			if (agent.waitManager.getWaitingFor().length === 0) {
				const projectTasks = getFairyTasksByProjectId(project.id)
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
			agent.modeManager.setMode('orchestrating-active')
		},
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['duo-orchestrating-active']: {
		onPromptEnd(agent) {
			const project = agent.getProject()
			if (!project) {
				agent.modeManager.setMode('idling')
				return
			}

			if (agent.waitManager.isWaiting()) {
				const partner = project.members.find((member) => member.id !== agent.id)
				if (!partner) {
					agent.modeManager.setMode('idling')
					return
				}

				const partnerAgent = $fairyAgentsAtom.get(agent.editor).find((a) => a.id === partner.id)
				if (!partnerAgent) {
					agent.modeManager.setMode('idling')
					return
				}

				// If partner is not active, we might need to deploy them again or continue ourselves
				if (!partnerAgent.requestManager.isGenerating()) {
					agent.schedule(
						'Your partner is not currently working on tasks. Consider directing them to start a task, starting a task yourself, or ending the project if all tasks are complete.'
					)
					return
				}

				// Wait for partner to finish their tasks
				agent.modeManager.setMode('duo-orchestrating-waiting')
				return
			}

			if (agent.waitManager.getWaitingFor().length === 0) {
				const projectTasks = getFairyTasksByProjectId(project.id)
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
			agent.modeManager.setMode('duo-orchestrating-active')
		},
		onEnter(agent) {
			stopPromptTimer(agent)
		},
	},
	['working-orchestrator']: {
		onEnter(agent) {
			agent.userActionTracker.clearHistory()
			agent.todoManager.deleteAll()
		},
		onExit(agent) {
			agent.userActionTracker.clearHistory()
			agent.todoManager.deleteAll()
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
