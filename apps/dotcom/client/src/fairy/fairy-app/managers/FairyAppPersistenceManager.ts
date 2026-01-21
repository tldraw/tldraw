import {
	ChatHistoryItem,
	FairyProject,
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
	 * Track which message IDs have been sent to the database per agent.
	 */
	private sentMessageIds = new Map<string, Set<string>>()

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
				// Ensure all projects have softDeleted set (default to false for backward compatibility)
				const projectsWithSoftDeleted: FairyProject[] = fairyState.projects.map((p) => ({
					...p,
					softDeleted: (p as any).softDeleted ?? false,
				}))
				this.fairyApp.projects.setProjects(projectsWithSoftDeleted)
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
					const agentState = stripUnneededFieldsFromAgentState(agent.serializeState())
					acc[agent.id] = agentState
					return acc
				},
				{} as Record<string, PersistedFairyAgentState>
			),
			fairyTaskList: this.fairyApp.tasks.getTasks(),
			projects: this.fairyApp.projects.getProjects(true), // Include soft-deleted projects for persistence
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
			this.fairyApp.projects.getProjects(true) // Include soft-deleted projects for persistence
			updateFairyState()
		})
		this.autoSaveCleanupFns.push(cleanupSharedFairyState)

		// Store the flush function for cleanup
		this.autoSaveCleanupFns.push(() => updateFairyState.flush())

		// Start watching chat messages for append-only persistence
		this.startChatMessageAppending(fileId)
	}

	/**
	 * Start watching chat history and append complete messages to database.
	 *
	 * @param fileId - The file ID to append messages to
	 */
	private startChatMessageAppending(fileId: string) {
		const agents = this.fairyApp.agents.getAgents()

		// Initialize sent message IDs for all agents
		agents.forEach((agent) => {
			const chatHistory = agent.chat.getHistory()
			const sent = new Set<string>()

			chatHistory.forEach((item) => {
				// Skip legacy messages without IDs
				if (!item.id) return

				// Mark all messages as sent initially
				sent.add(item.id)
			})

			this.sentMessageIds.set(agent.id, sent)
		})

		const appendMessages = throttle(() => {
			// Don't append if we're currently loading state
			if (this.isLoadingState) return

			const allMessagesToAppend: ChatHistoryItem[] = []

			agents.forEach((agent) => {
				const chatHistory = agent.chat.getHistory()
				const sent = this.sentMessageIds.get(agent.id) || new Set()

				chatHistory.forEach((item) => {
					// Skip legacy messages without IDs
					if (!item.id) return

					// Skip incomplete actions
					if (item.type === 'action' && !item.action.complete) return

					// Skip if already sent
					if (sent.has(item.id)) return

					// Strip unneeded fields before sending
					allMessagesToAppend.push(stripUnneededFieldsFromChatItem(item))
					sent.add(item.id)
				})
			})

			if (allMessagesToAppend.length > 0) {
				this.fairyApp.tldrawApp.appendFairyChatMessages(fileId, allMessagesToAppend)
			}
		}, 2000) // Append maximum every 2 seconds

		// Watch each agent's chat history
		agents.forEach((agent) => {
			const cleanup = react(`${agent.id} chat message appending`, () => {
				agent.chat.getHistory()
				appendMessages()
			})
			this.autoSaveCleanupFns.push(cleanup)
		})

		// Store the flush function for cleanup
		this.autoSaveCleanupFns.push(() => appendMessages.flush())
	}

	/**
	 * Stop auto-saving and clean up watchers.
	 */
	stopAutoSave() {
		this.autoSaveCleanupFns.forEach((cleanup) => cleanup())
		this.autoSaveCleanupFns = []
		this.sentMessageIds.clear()
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
		this.sentMessageIds.clear()
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
 * Strip unneeded fields from chat history items before persisting.
 */
function stripUnneededFieldsFromChatItem(item: ChatHistoryItem): ChatHistoryItem {
	if (item.type === 'action') {
		const { diff: _diff, ...rest } = item
		return rest as ChatHistoryItem
	}
	return item
}

/**
 * Strip unneeded fields from agent state before persisting.
 */
function stripUnneededFieldsFromAgentState(
	agentState: PersistedFairyAgentState
): PersistedFairyAgentState {
	// Strip waitingFor to reduce size
	const { waitingFor: _waitingFor, ...rest } = agentState
	// Strip diff from chat history items
	if (rest.chatHistory) {
		rest.chatHistory = rest.chatHistory.map(stripUnneededFieldsFromChatItem)
	}
	return rest
}
