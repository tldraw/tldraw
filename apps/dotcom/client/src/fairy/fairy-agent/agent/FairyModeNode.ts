import { AgentRequest, FairyModeDefinition } from '@tldraw/fairy-shared'
import { $fairyTasks, getFairyTasksByProjectId } from '../../FairyTaskList'
import { FairyAgent } from './FairyAgent'
import { $fairyAgentsAtom } from './fairyAgentsAtom'

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
			// Start timing if enabled
			const debugFlags = agent.$debugFlags.get()
			if (debugFlags.logResponseTime && agent.promptStartTime === null) {
				agent.promptStartTime = performance.now()
			}

			agent.setMode('soloing')
		},
		onEnter(agent) {
			agent.$personalTodoList.set([])
			agent.$userActionHistory.set([])
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
				agent.schedule('Continue until all tasks are marked as complete.')
			} else {
				agent.setMode('idling')
			}
		},
		onPromptCancel(agent) {
			// Stop timing and log
			if (agent.promptStartTime !== null) {
				const endTime = performance.now()
				const duration = (endTime - agent.promptStartTime) / 1000
				const fairyName = agent.$fairyConfig.get().name
				// eslint-disable-next-line no-console
				console.log(`🧚 Fairy "${fairyName}" prompt completed in ${duration.toFixed(2)}s`)
				agent.promptStartTime = null
			}

			agent.setMode('idling')
		},
	},
	['standing-by']: {},
	['working-drone']: {
		onEnter(agent) {
			agent.$userActionHistory.set([])
			agent.$personalTodoList.set([])
		},
		onExit(agent) {
			agent.$userActionHistory.set([])
			agent.$personalTodoList.set([])
		},
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				message: 'Continue until the task is marked as done.',
				bounds: request.bounds,
			})
		},
		onPromptCancel() {
			throw new Error('Cannot cancel a fairy mid-project. Clear the project first.')
		},
	},
	['working-solo']: {
		onEnter(agent) {
			agent.$userActionHistory.set([])
			agent.flushTodoList()
		},
		onExit(agent) {
			// Wipe todo list after finishing a task
			agent.$userActionHistory.set([])
			agent.flushTodoList()
		},
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				message: 'Continue until the task is marked as done.',
				bounds: request.bounds,
			})
		},
		onPromptCancel(agent) {
			agent.setMode('idling')
		},
	},
	['orchestrating-active']: {
		onPromptEnd(agent) {
			const project = agent.getProject()
			if (!project) {
				agent.setMode('idling')
				return
			}

			if (agent.$waitingFor.get().length > 0) {
				const members = project.members.filter((member) => member.id !== agent.id)
				const memberAgents = $fairyAgentsAtom
					.get(agent.editor)
					.filter((agent) => members.some((member) => member.id === agent.id))
				const activeMemberAgents = memberAgents.filter((agent) => agent.isGenerating())

				// If there are no active members, we need to deploy someone again probably!
				if (activeMemberAgents.length === 0) {
					agent.schedule(
						'No one is currently working on tasks. Consider deploying someone again, or end the project if all tasks are complete.'
					)
					return
				}

				// Wait for all other members to finish their tasks
				agent.setMode('orchestrating-waiting')
				return
			}

			if (agent.$waitingFor.get().length === 0) {
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
			agent.setMode('orchestrating-active')
		},
	},
	['duo-orchestrating-active']: {
		onPromptEnd(agent) {
			const project = agent.getProject()
			if (!project) {
				agent.setMode('idling')
				return
			}

			if (agent.$waitingFor.get().length > 0) {
				const partner = project.members.find((member) => member.id !== agent.id)
				if (!partner) {
					agent.setMode('idling')
					return
				}

				const partnerAgent = $fairyAgentsAtom.get(agent.editor).find((a) => a.id === partner.id)
				if (!partnerAgent) {
					agent.setMode('idling')
					return
				}

				// If partner is not active, we might need to deploy them again or continue ourselves
				if (!partnerAgent.isGenerating()) {
					agent.schedule(
						'Your partner is not currently working on tasks. Consider directing them to start a task, starting a task yourself, or ending the project if all tasks are complete.'
					)
					return
				}

				// Wait for partner to finish their tasks
				agent.setMode('duo-orchestrating-waiting')
				return
			}

			if (agent.$waitingFor.get().length === 0) {
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
			agent.setMode('duo-orchestrating-active')
		},
	},
	['working-orchestrator']: {
		onEnter(agent) {
			agent.$userActionHistory.set([])
			agent.$personalTodoList.set([])
		},
		onExit(agent) {
			agent.$userActionHistory.set([])
			agent.$personalTodoList.set([])
		},
		onPromptEnd(agent, request) {
			// Keep going until the task is complete
			agent.schedule({
				message: 'Continue until the task is marked as done.',
				bounds: request.bounds,
			})
		},
		onPromptCancel() {
			throw new Error('Cannot cancel a fairy mid-project. Clear the project first.')
		},
	},
}
