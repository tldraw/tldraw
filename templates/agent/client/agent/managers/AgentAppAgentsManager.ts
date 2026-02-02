import { Editor, EditorAtom, uniqueId } from 'tldraw'
import { TldrawAgent } from '../TldrawAgent'
import { BaseAgentAppManager } from './BaseAgentAppManager'

/**
 * Generate a unique agent ID.
 */
function generateAgentId(): string {
	return uniqueId()
}

/**
 * Manager for agent lifecycle - creation, disposal, and tracking.
 *
 * Manages multiple agents per editor. The agents are stored in an EditorAtom
 * so they can be accessed from tools that only have access to the editor.
 *
 * Use the static methods `getAgents(editor)` and `getAgent(editor, id)` to access
 * agents from tools. Use instance methods for agent lifecycle management.
 */
export class AgentAppAgentsManager extends BaseAgentAppManager {
	/**
	 * Static EditorAtom containing agents.
	 * This allows tools to access agents without needing the full TldrawAgentApp.
	 */
	private static $agents = new EditorAtom<TldrawAgent[]>('agents', () => [])

	/**
	 * Get all agents for an editor.
	 * Use this static method from tools that only have access to the editor.
	 */
	static getAgents(editor: Editor): TldrawAgent[] {
		return AgentAppAgentsManager.$agents.get(editor)
	}

	/**
	 * Get an agent by ID for an editor.
	 * If no ID is provided, returns the first agent.
	 * Use this static method from tools that only have access to the editor.
	 */
	static getAgent(editor: Editor, id?: string): TldrawAgent | undefined {
		const agents = AgentAppAgentsManager.$agents.get(editor)
		if (id) {
			return agents.find((agent) => agent.id === id)
		}
		return agents[0]
	}

	/**
	 * Get all agents.
	 */
	getAgents(): TldrawAgent[] {
		return AgentAppAgentsManager.$agents.get(this.app.editor)
	}

	/**
	 * Get an agent by ID.
	 * If no ID is provided, returns the first agent.
	 */
	getAgent(id?: string): TldrawAgent | undefined {
		const agents = AgentAppAgentsManager.$agents.get(this.app.editor)
		if (id) {
			return agents.find((agent) => agent.id === id)
		}
		return agents[0]
	}

	/**
	 * Create an agent with the given ID.
	 * If an agent with the ID already exists, returns the existing agent.
	 *
	 * @param id - The ID for the new agent
	 * @returns The created or existing agent
	 */
	createAgent(id: string): TldrawAgent {
		const existingAgent = this.getAgent(id)
		if (existingAgent) {
			return existingAgent
		}

		const agent = new TldrawAgent({
			editor: this.app.editor,
			id,
			onError: this.app.options.onError,
		})

		// Register the agent in the static atom
		AgentAppAgentsManager.$agents.update(this.app.editor, (agents) => [...agents, agent])

		return agent
	}

	/**
	 * Ensure at least one agent exists.
	 * Returns the first existing agent, or creates a new one with a generated ID.
	 * Call this after the app is initialized.
	 */
	ensureAtLeastOneAgent(): TldrawAgent {
		const existingAgent = this.getAgent()
		if (existingAgent) {
			return existingAgent
		}
		return this.createAgent(generateAgentId())
	}

	/**
	 * Delete an agent by ID.
	 * Disposes the agent and removes it from the registry.
	 *
	 * @param id - The ID of the agent to delete
	 * @returns true if the agent was found and deleted, false otherwise
	 */
	deleteAgent(id: string): boolean {
		const agent = this.getAgent(id)
		if (!agent) {
			return false
		}

		// Dispose the agent first
		agent.dispose()

		// Remove from the static atom
		AgentAppAgentsManager.$agents.update(this.app.editor, (agents) =>
			agents.filter((a) => a.id !== id)
		)

		return true
	}

	/**
	 * Reset the state of all agents without disposing them.
	 * Clears chats, todos, context, and returns agents to initial mode.
	 */
	resetAllAgents() {
		const agents = AgentAppAgentsManager.$agents.get(this.app.editor)
		agents.forEach((agent) => agent.reset())
	}

	/**
	 * Dispose all agents. Call this during cleanup.
	 */
	disposeAllAgents() {
		const agents = AgentAppAgentsManager.$agents.get(this.app.editor)
		agents.forEach((agent) => agent.dispose())
		AgentAppAgentsManager.$agents.set(this.app.editor, [])
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
