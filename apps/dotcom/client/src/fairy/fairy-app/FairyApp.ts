import { AgentModelName, DEFAULT_MODEL_NAME } from '@tldraw/fairy-shared'
import { Atom, atom, Editor } from 'tldraw'
import { TldrawApp } from '../../tla/app/TldrawApp'
import { FairyAppAgentsManager } from './managers/FairyAppAgentsManager'
import { FairyAppFollowingManager } from './managers/FairyAppFollowingManager'
import { FairyAppFungalNetworksManager } from './managers/FairyAppFungalNetworksManager'
import { FairyAppPersistenceManager } from './managers/FairyAppPersistenceManager'
import { FairyAppProjectsManager } from './managers/FairyAppProjectsManager'
import { FairyAppTaskListManager } from './managers/FairyAppTaskListManager'
import { FairyAppWaitManager } from './managers/FairyAppWaitManager'

export type { FungalNetworkState } from './managers/FairyAppFungalNetworksManager'

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

	/**
	 * Manager for fungal network overlays.
	 */
	fungalNetworks: FairyAppFungalNetworksManager

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

	/**
	 * Whether the feed dialog is currently open.
	 */
	private $isFeedDialogOpen: Atom<boolean> = atom('fairyAppIsFeedDialogOpen', false)

	/**
	 * Function to get authentication token, set by FairyAppProvider.
	 */
	private _getToken: (() => Promise<string | undefined>) | null = null

	/**
	 * Error handler, set by FairyAppProvider.
	 */
	private _onError: ((e: any) => void) | null = null

	constructor(
		public editor: Editor,
		public tldrawApp: TldrawApp
	) {
		this.agents = new FairyAppAgentsManager(this)
		this.following = new FairyAppFollowingManager(this)
		this.fungalNetworks = new FairyAppFungalNetworksManager(this)
		this.persistence = new FairyAppPersistenceManager(this)
		this.projects = new FairyAppProjectsManager(this)
		this.tasks = new FairyAppTaskListManager(this)
		this.waits = new FairyAppWaitManager(this)

		editor.on('crash', () => this.dispose())
		editor.on('dispose', () => this.dispose())

		// Attach fairyApp to editor so shapes can access it
		;(editor as any).fairyApp = this
	}

	/**
	 * Dispose of all resources. Call this during cleanup.
	 */
	dispose() {
		this.projects.disbandAllProjects()
		// Stop auto-save
		this.persistence.dispose()

		// Dispose agents manager (cleans up store listener and shape-bound agents)
		this.agents.dispose()

		// Clean up editor reference
		delete (this.editor as any).fairyApp
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

	getIsFeedDialogOpen(): boolean {
		return this.$isFeedDialogOpen.get()
	}

	setIsFeedDialogOpen(value: boolean): void {
		this.$isFeedDialogOpen.set(value)
	}

	/**
	 * Set the token getter function. Called by FairyAppProvider.
	 */
	setGetToken(getToken: () => Promise<string | undefined>): void {
		this._getToken = getToken
	}

	/**
	 * Get the token getter function.
	 */
	getToken(): Promise<string | undefined> {
		if (!this._getToken) {
			return Promise.resolve(undefined)
		}
		return this._getToken()
	}

	/**
	 * Set the error handler. Called by FairyAppProvider.
	 */
	setOnError(onError: (e: any) => void): void {
		this._onError = onError
	}

	/**
	 * Get the error handler.
	 */
	getOnError(): (e: any) => void {
		return this._onError ?? ((e) => console.error('FairyApp error:', e))
	}

	resetEverything() {
		this.projects.disbandAllProjects()
		this.tasks.reset()
		// Delete all fairy configs first so new ones get created when agents are re-synced
		const agents = this.agents.getAgents()
		agents.forEach((agent) => {
			this.tldrawApp.z.mutate.user.deleteFairyConfig({ id: agent.id })
		})
		this.agents.resetAllAgents()
		this.following.reset()
		this.waits.reset()
	}
}
