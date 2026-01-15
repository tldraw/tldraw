import { Editor } from 'tldraw'
import { AgentAppAgentsManager } from './managers/AgentAppAgentsManager'
import { AgentAppPersistenceManager } from './managers/AgentAppPersistenceManager'

/**
 * The TldrawAgentApp class manages the agent system for a given editor instance.
 *
 * This is a coordinator class that handles app-level concerns shared across agents,
 * such as agent lifecycle management, persistence, and global settings.
 *
 * Individual agents (TldrawAgent) handle their own concerns like chat, context, and requests.
 * The app manages the agents and coordinates shared state.
 *
 * @example
 * ```tsx
 * const app = new TldrawAgentApp(editor, { onError: handleError })
 * const agent = app.agents.getAgent()
 * agent.prompt('Draw a cat')
 * ```
 */
export class TldrawAgentApp {
	/**
	 * Manager for agent lifecycle - creation, disposal, and tracking.
	 */
	agents: AgentAppAgentsManager

	/**
	 * Manager for state persistence - loading, saving, and auto-save.
	 */
	persistence: AgentAppPersistenceManager

	constructor(
		public editor: Editor,
		public options: {
			onError: (e: any) => void
		}
	) {
		this.agents = new AgentAppAgentsManager(this)
		this.persistence = new AgentAppPersistenceManager(this)

		editor.on('crash', () => this.dispose())
		editor.on('dispose', () => this.dispose())
	}

	/**
	 * Dispose of all resources. Call this during cleanup.
	 */
	dispose() {
		// Stop auto-save BEFORE disposing agents to prevent saving empty state
		this.persistence.dispose()
		this.agents.dispose()
	}

	/**
	 * Reset everything to initial state.
	 */
	reset() {
		this.agents.reset()
		this.persistence.reset()
	}
}
