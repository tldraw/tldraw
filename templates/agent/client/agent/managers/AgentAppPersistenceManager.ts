import { react } from 'tldraw'
import { PersistedAgentState, TldrawAgent } from '../TldrawAgent'
import { BaseAgentAppManager } from './BaseAgentAppManager'

const STORAGE_KEY = 'tldraw-agent-app:state'

/**
 * The persisted state for the entire app.
 * Contains state for all agents.
 */
export interface PersistedAppState {
	agents: Record<string, PersistedAgentState>
}

/**
 * Manager for app-level state persistence.
 *
 * Coordinates loading and saving agent state to localStorage.
 * Calls agent-level serializeState() and loadState() methods
 * to handle the actual state serialization/deserialization.
 */
export class AgentAppPersistenceManager extends BaseAgentAppManager {
	/**
	 * Whether we're currently loading state to prevent premature saves.
	 */
	private isLoadingState = false

	/**
	 * Cleanup function for the agents list watcher.
	 */
	private agentsListCleanup: (() => void) | null = null

	/**
	 * Cleanup functions for per-agent state watchers, keyed by agent ID.
	 */
	private agentWatcherCleanupFns = new Map<string, () => void>()

	/**
	 * Serialize the current app state for persistence.
	 */
	serializeState(): PersistedAppState {
		return {
			agents: Object.fromEntries(
				this.app.agents.getAgents().map((agent) => [agent.id, agent.serializeState()])
			),
		}
	}

	/**
	 * Load app state from localStorage.
	 * Call this after the app is initialized.
	 * Creates agents for all persisted agent IDs that don't already exist.
	 */
	loadState() {
		this.isLoadingState = true
		try {
			const appState = this.loadValue()
			if (!appState) return

			// Create agents for all persisted IDs (createAgent returns existing if already exists)
			for (const agentId of Object.keys(appState.agents)) {
				this.app.agents.createAgent(agentId)
			}

			// Load state for each agent
			for (const agent of this.app.agents.getAgents()) {
				const agentState = appState.agents[agent.id]
				if (agentState) agent.loadState(agentState)
			}
		} catch (e) {
			console.error('Failed to load app state:', e)
		} finally {
			this.isLoadingState = false
		}
	}

	/**
	 * Start auto-saving app state changes.
	 * Call this after loadState() to avoid saving during load.
	 * Reactively watches the agents list and all agent state.
	 */
	startAutoSave() {
		// Watch for changes to the agents list and set up per-agent watchers
		this.agentsListCleanup = react('agents list', () => {
			const agents = this.app.agents.getAgents()
			const currentAgentIds = new Set(agents.map((a) => a.id))

			// Set up watchers for new agents
			for (const agent of agents) {
				if (!this.agentWatcherCleanupFns.has(agent.id)) {
					this.agentWatcherCleanupFns.set(agent.id, this.createAgentStateWatcher(agent))
				}
			}

			// Clean up watchers for removed agents
			for (const [id, cleanup] of this.agentWatcherCleanupFns) {
				if (!currentAgentIds.has(id)) {
					cleanup()
					this.agentWatcherCleanupFns.delete(id)
				}
			}

			// Save when agent list changes (if not loading)
			this.saveState()
		})
	}

	/**
	 * Create a reactive watcher for a single agent's state.
	 */
	private createAgentStateWatcher(agent: TldrawAgent): () => void {
		return react(`${agent.id} state`, () => {
			// Access reactive state to trigger on changes
			agent.chat.getHistory()
			agent.chatOrigin.getOrigin()
			agent.todos.getTodos()
			agent.context.getItems()
			agent.modelName.getModelName()
			agent.debug.getDebugFlags()

			// Save if not currently loading
			this.saveState()
		})
	}

	/**
	 * Save the current app state to localStorage.
	 */
	private saveState() {
		if (this.isLoadingState) return
		// Don't save if no agents exist (e.g., during dispose)
		if (this.app.agents.getAgents().length === 0) return
		this.saveValue(this.serializeState())
	}

	/**
	 * Stop auto-saving and clean up watchers.
	 */
	stopAutoSave() {
		this.agentsListCleanup?.()
		this.agentsListCleanup = null
		for (const cleanup of this.agentWatcherCleanupFns.values()) {
			cleanup()
		}
		this.agentWatcherCleanupFns.clear()
	}

	/**
	 * Reset the manager to its initial state.
	 */
	reset() {
		this.stopAutoSave()
		this.isLoadingState = false
	}

	/**
	 * Dispose of the persistence manager.
	 */
	override dispose() {
		this.stopAutoSave()
		super.dispose()
	}

	// --- Helper methods ---

	/**
	 * Load a value from localStorage.
	 */
	private loadValue(): PersistedAppState | null {
		if (!globalThis.localStorage) return null
		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			return stored ? (JSON.parse(stored) as PersistedAppState) : null
		} catch {
			console.warn(`Couldn't load ${STORAGE_KEY} from localStorage`)
			return null
		}
	}

	/**
	 * Save a value to localStorage.
	 */
	private saveValue(value: PersistedAppState): void {
		if (!globalThis.localStorage) return
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
		} catch {
			console.warn(`Couldn't save ${STORAGE_KEY} to localStorage`)
		}
	}
}
