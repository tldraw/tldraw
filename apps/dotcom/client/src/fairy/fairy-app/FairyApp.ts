import { AgentModelName, DEFAULT_MODEL_NAME, PersistedFairyState } from '@tldraw/fairy-shared'
import { Atom, atom, Editor } from 'tldraw'
import { TldrawApp } from '../../tla/app/TldrawApp'
import { FairyAppAgentsManager } from './managers/FairyAppAgentsManager'
import { FairyAppFollowingManager } from './managers/FairyAppFollowingManager'
import { FairyAppPersistenceManager } from './managers/FairyAppPersistenceManager'
import { FairyAppProjectsManager } from './managers/FairyAppProjectsManager'
import { FairyAppTaskListManager } from './managers/FairyAppTaskListManager'
import { FairyAppWaitManager } from './managers/FairyAppWaitManager'

/**
 * The FairyApp class manages the fairy system for a given editor instance.
 *
 * This is a class-based alternative to the React component FairyApp.
 * It encapsulates all fairy-related state and behavior without depending on React hooks.
 *
 * Note: This is currently non-destructive and duplicates functionality.
 * It is not yet wired up to the rest of the UI.
 */
export class FairyApp {
	/**
	 * Manager for fairy agent lifecycle.
	 */
	agents: FairyAppAgentsManager

	/**
	 * Manager for fairy camera following.
	 */
	following: FairyAppFollowingManager

	/**
	 * Manager for fairy state persistence.
	 */
	persistence: FairyAppPersistenceManager

	/**
	 * Manager for fairy projects.
	 */
	projects: FairyAppProjectsManager

	/**
	 * Manager for fairy task list.
	 */
	tasks: FairyAppTaskListManager

	/**
	 * Manager for fairy wait/notification system.
	 */
	waits: FairyAppWaitManager

	// --- Global fairy state ---

	/**
	 * Whether any fairy is currently applying an action to the canvas.
	 * Used to prevent agent actions from being recorded as user actions.
	 */
	private $isApplyingAction: Atom<boolean> = atom('fairyAppIsApplyingAction', false)

	/**
	 * Debug flags for controlling fairy debug features.
	 */
	private $debugFlags: Atom<{ showTaskBounds: boolean }> = atom('fairyAppDebugFlags', {
		showTaskBounds: false,
	})

	/**
	 * The currently selected AI model for fairy requests.
	 */
	private $modelSelection: Atom<AgentModelName> = atom('fairyAppModelSelection', DEFAULT_MODEL_NAME)

	constructor(
		public editor: Editor,
		public tldrawApp: TldrawApp
	) {
		this.agents = new FairyAppAgentsManager(this)
		this.following = new FairyAppFollowingManager(this)
		this.persistence = new FairyAppPersistenceManager(this)
		this.projects = new FairyAppProjectsManager(this)
		this.tasks = new FairyAppTaskListManager(this)
		this.waits = new FairyAppWaitManager(this)
	}

	/**
	 * Dispose of all resources. Call this during cleanup.
	 */
	dispose() {
		// Stop following any fairy
		this.following.dispose()

		// Disband all projects first
		this.projects.disbandAllProjects()

		// Stop auto-save
		this.persistence.dispose()

		// Dispose all agents
		this.agents.disposeAll()
	}

	getIsApplyingAction(): boolean {
		return this.$isApplyingAction.get()
	}

	setIsApplyingAction(value: boolean): void {
		this.$isApplyingAction.set(value)
	}

	getDebugFlags(): { showTaskBounds: boolean } {
		return this.$debugFlags.get()
	}

	setDebugFlags(flags: { showTaskBounds: boolean }): void {
		this.$debugFlags.set(flags)
	}

	getModelSelection(): AgentModelName {
		return this.$modelSelection.get()
	}

	setModelSelection(value: AgentModelName): void {
		this.$modelSelection.set(value)
	}

	// --- Convenience methods delegating to persistenceManager ---

	/**
	 * Check if state is currently being loaded.
	 */
	getIsLoadingState(): boolean {
		return this.persistence.getIsLoadingState()
	}

	/**
	 * Load fairy state from persisted data.
	 */
	loadState(fairyState: PersistedFairyState) {
		this.persistence.loadState(fairyState)
	}
}
