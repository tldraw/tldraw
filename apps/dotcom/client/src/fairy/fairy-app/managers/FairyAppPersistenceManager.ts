import {
	ChatHistoryItem,
	PersistedFairyAgentState,
	PersistedFairyState,
} from '@tldraw/fairy-shared'
import { react, throttle } from 'tldraw'
import { BaseFairyAppManager } from './BaseFairyAppManager'

const STATE_SETTLE_DELAY_MS = 100

/**
 * Manager for fairy state persistence - loading, saving, and auto-save.
 */
export class FairyAppPersistenceManager extends BaseFairyAppManager {
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
	private autoSaveCleanupFns: (() => void)[] = []

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
			const agents = this.fairyApp.agents.getAgents()
			agents.forEach((agent) => {
				// Skip if already loaded
				if (this.fairyApp.agents.isAgentLoaded(agent.id)) return

				const persistedAgent = fairyState.agents[agent.id]
				if (persistedAgent) {
					agent.loadState(persistedAgent)
					this.fairyApp.agents.markAgentLoaded(agent.id)
				}
			})

			// Load shared task list only once
			if (fairyState.fairyTaskList && !this.fairyTaskListLoaded) {
				this.fairyApp.tasks.setTasks(fairyState.fairyTaskList)
				this.fairyTaskListLoaded = true
			}

			// Load projects only once
			if (fairyState.projects && !this.projectsLoaded) {
				this.fairyApp.projects.setProjects(fairyState.projects)
				this.projectsLoaded = true
			}

			// Clear any projects since we can't resume them
			this.fairyApp.projects.disbandAllProjects()

			// Allow a tick for state to settle before allowing saves
			// This delay ensures all state updates from loading have propagated before we start saving again
			setTimeout(() => {
				this.isLoadingState = false
			}, STATE_SETTLE_DELAY_MS)
		} catch (e) {
			console.error('Failed to load fairy state:', e)
			this.isLoadingState = false
		}
	}

	/**
	 * Serialize the current fairy state for persistence.
	 */
	serializeState(): PersistedFairyState {
		const agents = this.fairyApp.agents.getAgents()

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
			fairyTaskList: this.fairyApp.tasks.getTasks(),
			projects: this.fairyApp.projects.getProjects(),
		}
	}

	forcePersist() {
		// Don't save if we're currently loading state
		if (this.isLoadingState) return
		if (!this._fileId) return

		const fairyState = this.serializeState()
		this.fairyApp.tldrawApp.onFairyStateUpdate(this._fileId, fairyState)
	}

	private _fileId: string | null = null

	/**
	 * Start watching for state changes and auto-save to backend.
	 *
	 * @param fileId - The file ID to save state to
	 */
	startAutoSave(fileId: string) {
		this._fileId = fileId
		const updateFairyState = throttle(() => this.forcePersist(), 2000) // Save maximum every 2 seconds

		// Watch for changes in fairy atoms
		const agents = this.fairyApp.agents.getAgents()
		agents.forEach((agent) => {
			const cleanup = react(`${agent.id} state`, () => {
				agent.getEntity()
				agent.chat.getHistory()
				agent.todos.getTodos()
				updateFairyState()
			})
			this.autoSaveCleanupFns.push(cleanup)
		})

		// Watch shared fairy state
		const cleanupSharedFairyState = react('shared fairy atom state', () => {
			this.fairyApp.tasks.getTasks()
			this.fairyApp.projects.getProjects()
			updateFairyState()
		})
		this.autoSaveCleanupFns.push(cleanupSharedFairyState)

		// Store the flush function for cleanup
		this.autoSaveCleanupFns.push(() => updateFairyState.flush())
	}

	/**
	 * Stop auto-saving and clean up watchers.
	 */
	stopAutoSave() {
		this.autoSaveCleanupFns.forEach((cleanup) => cleanup())
		this.autoSaveCleanupFns = []
	}

	/**
	 * Reset loading state flags. Call when switching files.
	 */
	resetLoadingFlags() {
		this.fairyTaskListLoaded = false
		this.projectsLoaded = false
		// Also reset the agent loaded tracking so agents can be reloaded in the new file
		this.fairyApp.agents.clearLoadedAgentIds()
	}

	/**
	 * Reset the manager to its initial state.
	 */
	reset() {
		this.stopAutoSave()
		this.resetLoadingFlags()
		this.isLoadingState = false
	}

	/**
	 * Dispose of the persistence manager.
	 */
	dispose() {
		this.forcePersist()
		this.stopAutoSave()
		super.dispose()
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
