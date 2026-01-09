import type { AgentRequest } from '../../shared/types/AgentRequest'
import type { TldrawAgent } from '../agent/TldrawAgent'
import type { AgentModeDefinition, AgentModeType } from './AgentModeDefinitions'

/**
 * Lifecycle hooks for an agent mode.
 * Each mode can optionally implement these hooks to respond to state changes.
 */
export interface AgentModeNode {
	onEnter?(agent: TldrawAgent, fromMode: AgentModeType): void
	onExit?(agent: TldrawAgent, toMode: AgentModeType): void
	onPromptStart?(agent: TldrawAgent, request: AgentRequest): void
	onPromptEnd?(agent: TldrawAgent, request: AgentRequest): void
	onPromptCancel?(agent: TldrawAgent, request: AgentRequest): void
}

/**
 * Lifecycle implementations for each agent mode.
 *
 * This chart maps mode types to their lifecycle hooks.
 * Modes can implement any subset of hooks (all are optional).
 * Not all modes need an entry - modes without entries simply have no lifecycle behavior.
 *
 * To add lifecycle behavior for a new mode:
 * 1. Add the mode to AGENT_MODE_DEFINITIONS in AgentModeDefinitions.ts
 * 2. Add an entry here with the lifecycle hooks you need
 */
const _AGENT_MODE_CHART: Record<AgentModeDefinition['type'], AgentModeNode> = {
	idling: {
		onPromptStart(agent) {
			agent.mode.setMode('working')
		},
		onEnter(agent, _fromMode) {
			agent.todos.reset()
			agent.userAction.clearHistory()
		},
	},
	working: {
		onEnter(agent, _fromMode) {
			// Reset state when entering default mode
			agent.todos.reset()
			agent.userAction.clearHistory()
		},

		onPromptEnd(agent, _request) {
			// Check if there are incomplete todos
			const todoList = agent.todos.getTodos()
			const incompleteTodos = todoList.filter((item) => item.status !== 'done')

			if (incompleteTodos.length > 0) {
				// Schedule continuation to complete remaining work
				agent.schedule(
					"Continue until all your todo items are marked as done. If you've completed the work, mark them as done, otherwise keep going."
				)
				return
			}

			// All work complete - return to idling
			agent.mode.setMode('idling')
		},

		onPromptCancel(agent, _request) {
			// Return to idling on cancel
			agent.mode.setMode('idling')
		},
	},
}

/**
 * Get the lifecycle node for a mode, if one exists.
 * This function helps TypeScript resolve types correctly with circular imports.
 */
export function getModeNode(mode: AgentModeType): AgentModeNode {
	return _AGENT_MODE_CHART[mode]
}
