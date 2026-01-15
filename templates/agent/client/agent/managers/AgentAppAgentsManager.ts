import { Atom, atom } from 'tldraw'
import { TldrawAgent } from '../TldrawAgent'
import { BaseAgentAppManager } from './BaseAgentAppManager'

/**
 * The default ID used for the single agent.
 * If you extend this to support multiple agents, you can use different IDs.
 */
export const DEFAULT_AGENT_ID = 'agent-starter'

/**
 * Manager for agent lifecycle - creation, disposal, and tracking.
 *
 * Currently manages a single agent, but the architecture supports
 * multiple agents if needed. The agents are stored in an array atom
 * to make it easy to extend for multi-agent scenarios.
 */
export class AgentAppAgentsManager extends BaseAgentAppManager {
	/**
	 * Atom containing the current list of agents.
	 * Currently only one agent is created, but the architecture supports multiple.
	 */
	private $agents: Atom<TldrawAgent[]> = atom('agentAppAgents', [])

	/**
	 * Get all agents.
	 * Currently returns an array with a single agent.
	 */
	getAgents(): TldrawAgent[] {
		return this.$agents.get()
	}

	/**
	 * Get an agent by ID.
	 * If no ID is provided, returns the default agent.
	 */
	getAgent(id: string = DEFAULT_AGENT_ID): TldrawAgent | undefined {
		return this.$agents.get().find((agent) => agent.id === id)
	}

	/**
	 * Create the default agent.
	 * Call this after the app is initialized.
	 */
	createDefaultAgent(): TldrawAgent {
		const existingAgent = this.getAgent(DEFAULT_AGENT_ID)
		if (existingAgent) {
			return existingAgent
		}

		const agent = new TldrawAgent({
			editor: this.app.editor,
			id: DEFAULT_AGENT_ID,
			onError: this.app.options.onError,
		})

		this.$agents.update((agents) => [...agents, agent])

		return agent
	}

	/**
	 * Reset the state of all agents without disposing them.
	 * Clears chats, todos, context, and returns agents to initial mode.
	 */
	resetAllAgents() {
		const agents = this.$agents.get()
		agents.forEach((agent) => agent.reset())
	}

	/**
	 * Dispose all agents. Call this during cleanup.
	 */
	disposeAllAgents() {
		const agents = this.$agents.get()
		agents.forEach((agent) => agent.dispose())
		this.$agents.set([])
	}

	/**
	 * Reset the manager to its initial state.
	 */
	reset() {
		this.resetAllAgents()
	}

	/**
	 * Dispose of the manager and all agents.
	 */
	override dispose() {
		this.disposeAllAgents()
		super.dispose()
	}
}
