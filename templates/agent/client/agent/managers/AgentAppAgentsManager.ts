import { Editor, EditorAtom, uniqueId } from 'tldraw'
import { TldrawAgent } from '../TldrawAgent'
import { BaseAgentAppManager } from './BaseAgentAppManager'

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
		return id ? agents.find((agent) => agent.id === id) : agents[0]
	}

	/**
	 * Get all agents.
	 */
	getAgents(): TldrawAgent[] {
		return AgentAppAgentsManager.getAgents(this.app.editor)
	}

	/**
	 * Get an agent by ID.
	 * If no ID is provided, returns the first agent.
	 */
	getAgent(id?: string): TldrawAgent | undefined {
		return AgentAppAgentsManager.getAgent(this.app.editor, id)
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
		if (existingAgent) return existingAgent

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
		return this.getAgent() ?? this.createAgent(uniqueId())
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
		if (!agent) return false

		// Dispose the agent first
		agent.dispose()

		// Remove from the static atom
		AgentAppAgentsManager.$agents.update(this.app.editor, (agents) =>
			agents.filter((a) => a.id !== id)
		)
		return true
	}

	/**
	 * Reset the manager to its initial state.
	 */
	reset() {
		this.getAgents().forEach((agent) => agent.reset())
	}

	/**
	 * Dispose of the manager and all agents.
	 */
	override dispose() {
		this.getAgents().forEach((agent) => agent.dispose())
		AgentAppAgentsManager.$agents.set(this.app.editor, [])
		super.dispose()
	}
}
