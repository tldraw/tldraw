import { Atom, atom, Editor } from 'tldraw'
import { AgentModelName, DEFAULT_MODEL_NAME } from '../../shared/models'
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

	// --- Global app state ---

	/**
	 * Whether any agent is currently applying an action to the canvas.
	 * Used to prevent agent actions from being recorded as user actions.
	 */
	private $isApplyingAction: Atom<boolean> = atom('agentAppIsApplyingAction', false)

	/**
	 * Debug flags for controlling agent debug features.
	 */
	private $debugFlags: Atom<{ showContextBounds: boolean }> = atom('agentAppDebugFlags', {
		showContextBounds: false,
	})

	/**
	 * The currently selected AI model for agent requests.
	 */
	private $modelSelection: Atom<AgentModelName> = atom('agentAppModelSelection', DEFAULT_MODEL_NAME)

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
		this.agents.dispose()
		this.persistence.dispose()
	}

	/**
	 * Reset everything to initial state.
	 */
	reset() {
		this.agents.reset()
		this.persistence.reset()
	}

	// --- State accessors ---

	getIsApplyingAction(): boolean {
		return this.$isApplyingAction.get()
	}

	setIsApplyingAction(value: boolean): void {
		this.$isApplyingAction.set(value)
	}

	getDebugFlags(): { showContextBounds: boolean } {
		return this.$debugFlags.get()
	}

	setDebugFlags(flags: { showContextBounds: boolean }): void {
		this.$debugFlags.set(flags)
	}

	getModelSelection(): AgentModelName {
		return this.$modelSelection.get()
	}

	setModelSelection(value: AgentModelName): void {
		this.$modelSelection.set(value)
	}
}
