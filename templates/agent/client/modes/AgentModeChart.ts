import type { AgentRequest } from '../../shared/types/AgentRequest'
import type { TldrawAgent } from '../agent/TldrawAgent'
import type { AgentModeDefinition, AgentModeType } from './AgentModeDefinitions'

/**
 * Lifecycle hooks for an agent mode. All are optional.
 */
export interface AgentModeNode {
	onEnter?(agent: TldrawAgent, fromMode: AgentModeType): void
	onExit?(agent: TldrawAgent, toMode: AgentModeType): void
	onPromptStart?(agent: TldrawAgent, request: AgentRequest): void
	onPromptEnd?(agent: TldrawAgent, request: AgentRequest): void
	onPromptCancel?(agent: TldrawAgent, request: AgentRequest): void
}

/**
 * Lifecycle hooks per mode. To add lifecycle behavior for a new mode, add it to
 * AGENT_MODE_DEFINITIONS in AgentModeDefinitions.ts and add an entry here.
 */
const AGENT_MODE_CHART: Record<AgentModeDefinition['type'], AgentModeNode> = {
	idling: {
		onPromptStart(agent) {
			agent.mode.setMode('working')
		},
		onEnter(agent) {
			agent.todos.reset()
			agent.userAction.clearHistory()
		},
	},
	working: {
		onEnter(agent, fromMode) {
			agent.todos.reset()
			agent.context.clear()

			// A user prompt that starts while idling transitions to working before
			// working.onPromptStart runs, so clear created-shape tracking here too
			if (fromMode === 'idling') {
				agent.lints.clearCreatedShapes()
			}
		},

		onExit(agent) {
			agent.lints.unlockCreatedShapes()
		},

		onPromptStart(agent, request) {
			// Covers prompts that start while already working (continuation, interrupt)
			if (request.source === 'user') {
				agent.todos.flush()
				agent.lints.clearCreatedShapes()
			}
		},

		onPromptEnd(agent) {
			if (agent.todos.getTodos().some((item) => item.status !== 'done')) {
				agent.schedule(
					"Continue until all your todo items are marked as done. If you've completed the work, mark them as done, otherwise keep going."
				)
				return
			}

			if (agent.lints.hasUnsurfacedLints(agent.lints.getCreatedShapes())) {
				agent.schedule({
					agentMessages: [
						'The automated linter has detected potential visual problems in the canvas. Decide if they need to be addressed.',
					],
				})
				return
			}

			agent.mode.setMode('idling')
		},

		onPromptCancel(agent) {
			agent.mode.setMode('idling')
		},
	},
}

// Accessed through a function so TypeScript resolves the types correctly with circular imports
export function getModeNode(mode: AgentModeType): AgentModeNode {
	return AGENT_MODE_CHART[mode]
}
