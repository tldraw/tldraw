import {
	AgentModelName,
	ChatHistoryItem,
	DEFAULT_MODEL_NAME,
	PersistedFairyAgentState,
	PersistedFairyState,
} from '@tldraw/fairy-shared'
import { Atom, atom, Editor, react, throttle } from 'tldraw'
import { TldrawApp } from '../../tla/app/TldrawApp'
import { FairyAppAgentsManager } from './managers/FairyAppAgentsManager'
import { FairyAppFollowingManager } from './managers/FairyAppFollowingManager'
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
	agentsManager: FairyAppAgentsManager

	/**
	 * Manager for fairy camera following.
	 */
	followingManager: FairyAppFollowingManager

	/**
	 * Manager for fairy projects.
	 */
	projectsManager: FairyAppProjectsManager

	/**
	 * Manager for fairy task list.
	 */
	taskListManager: FairyAppTaskListManager

	/**
	 * Manager for fairy wait/notification system.
	 */
	waitManager: FairyAppWaitManager

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

	// --- State persistence properties ---

	/**
	 * Track whether we're currently loading state to prevent premature saves.
	 */
	private isLoadingState = false

	/**
	 * Track whether the fairy task list has been loaded.
	 */
	private fairyTaskListLoaded = false

	/**
	 * Track whether projects have been loaded.
	 */
	private projectsLoaded = false

	/**
	 * Cleanup functions for state watchers.
	 */
	private cleanupFns: (() => void)[] = []

	constructor(
		public editor: Editor,
		public tldrawApp: TldrawApp
	) {
		this.agentsManager = new FairyAppAgentsManager(this)
		this.followingManager = new FairyAppFollowingManager(this)
		this.projectsManager = new FairyAppProjectsManager(this)
		this.taskListManager = new FairyAppTaskListManager(this)
		this.waitManager = new FairyAppWaitManager(this)
	}

	/**
	 * Dispose of all resources. Call this during cleanup.
	 */
	dispose() {
		// Stop following any fairy
		this.followingManager.dispose()

		// Disband all projects first
		this.projectsManager.disbandAllProjects()

		// Stop auto-save
		this.stopAutoSave()

		// Dispose all agents
		this.agentsManager.disposeAll()
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

	// --- State persistence methods ---

	/**
	 * Check if state is currently being loaded.
	 */
	getIsLoadingState(): boolean {
		return this.isLoadingState
	}

	/**
	 * Load fairy state from persisted data.
	 *
	 * @param fairyState - The persisted fairy state
	 */
	loadState(fairyState: PersistedFairyState) {
		this.isLoadingState = true

		try {
			// Load agent states
			const agents = this.agentsManager.getAgents()
			agents.forEach((agent) => {
				// Skip if already loaded
				if (this.agentsManager.isAgentLoaded(agent.id)) return

				const persistedAgent = fairyState.agents[agent.id]
				if (persistedAgent) {
					agent.loadState(persistedAgent)
					this.agentsManager.markAgentLoaded(agent.id)
				}
			})

			// Load shared task list only once
			if (fairyState.fairyTaskList && !this.fairyTaskListLoaded) {
				this.taskListManager.setTasks(fairyState.fairyTaskList)
				this.fairyTaskListLoaded = true
			}

			// Load projects only once
			if (fairyState.projects && !this.projectsLoaded) {
				this.projectsManager.setProjects(fairyState.projects)
				this.projectsLoaded = true
			}

			// Allow a tick for state to settle before allowing saves
			setTimeout(() => {
				this.isLoadingState = false
			}, 100)
		} catch (e) {
			console.error('Failed to load fairy state:', e)
			this.isLoadingState = false
		}
	}

	/**
	 * Serialize the current fairy state for persistence.
	 */
	serializeState(): PersistedFairyState {
		const agents = this.agentsManager.getAgents()

		return {
			agents: agents.reduce(
				(acc, agent) => {
					const agentState = agent.serializeState()
					// Strip diff field from chat history before sending
					if (agentState.chatHistory) {
						agentState.chatHistory = agentState.chatHistory.map(stripDiffFromChatItem)
					}
					acc[agent.id] = agentState
					return acc
				},
				{} as Record<string, PersistedFairyAgentState>
			),
			fairyTaskList: this.taskListManager.getTasks(),
			projects: this.projectsManager.getProjects(),
		}
	}

	/**
	 * Start watching for state changes and auto-save to backend.
	 *
	 * @param fileId - The file ID to save state to
	 */
	startAutoSave(fileId: string) {
		const updateFairyState = throttle(() => {
			// Don't save if we're currently loading state
			if (this.isLoadingState) return

			const fairyState = this.serializeState()
			this.tldrawApp.onFairyStateUpdate(fileId, fairyState)
		}, 2000) // Save maximum every 2 seconds

		// Watch for changes in fairy atoms
		const agents = this.agentsManager.getAgents()
		agents.forEach((agent) => {
			const cleanup = react(`${agent.id} state`, () => {
				agent.$fairyEntity.get()
				agent.chatManager.getHistory()
				agent.todoManager.getTodos()
				updateFairyState()
			})
			this.cleanupFns.push(cleanup)
		})

		// Watch shared fairy state
		const cleanupSharedFairyState = react('shared fairy atom state', () => {
			this.taskListManager.getTasks()
			this.projectsManager.getProjects()
			updateFairyState()
		})
		this.cleanupFns.push(cleanupSharedFairyState)

		// Store the flush function for cleanup
		this.cleanupFns.push(() => updateFairyState.flush())
	}

	/**
	 * Stop auto-saving and clean up watchers.
	 */
	stopAutoSave() {
		this.cleanupFns.forEach((cleanup) => cleanup())
		this.cleanupFns = []
	}

	/**
	 * Reset loading state flags. Call when switching files.
	 */
	resetLoadingFlags() {
		this.fairyTaskListLoaded = false
		this.projectsLoaded = false
	}
}

/**
 * Strip the diff field from chat history items before persisting.
 */
function stripDiffFromChatItem(item: ChatHistoryItem): ChatHistoryItem {
	if (item.type === 'action') {
		const { diff: _diff, ...rest } = item
		return rest as ChatHistoryItem
	}
	return item
}
