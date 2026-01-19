import { react } from 'tldraw'
import { PersistedAgentState } from '../TldrawAgent'
import { BaseAgentAppManager } from './BaseAgentAppManager'

/**
 * The key prefix used for localStorage persistence.
 */
const STORAGE_PREFIX = 'tldraw-agent-app'

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
	 * Serialize the current app state for persistence.
	 */
	serializeState(): PersistedAppState {
		const agents = this.app.agents.getAgents()

		return {
			agents: agents.reduce(
				(acc, agent) => {
					acc[agent.id] = agent.serializeState()
					return acc
				},
				{} as Record<string, PersistedAgentState>
			),
		}
	}

	/**
	 * Load app state from localStorage.
	 * Call this after the app is initialized.
	 */
	loadState() {
		this.isLoadingState = true

		try {
			const appState = this.loadValue<PersistedAppState>('state')
			if (!appState) {
				this.isLoadingState = false
				return
			}

			// Load state for each agent
			const agents = this.app.agents.getAgents()
			agents.forEach((agent) => {
				const agentState = appState.agents[agent.id]
				if (agentState) {
					agent.loadState(agentState)
				}
			})
		} catch (e) {
			console.error('Failed to load app state:', e)
		} finally {
			this.isLoadingState = false
		}
	}

	/**
	 * Start auto-saving app state changes.
	 * Call this after loadState() to avoid saving during load.
	 */
	startAutoSave() {
		const agents = this.app.agents.getAgents()

		// Watch each agent's state for changes
		agents.forEach((agent) => {
			const cleanup = react(`${agent.id} state`, () => {
				// Access reactive state to trigger on changes
				agent.chat.getHistory()
				agent.chatOrigin.getOrigin()
				agent.todos.getTodos()
				agent.context.getItems()
				agent.$modelName.get()
				agent.debug.getDebugFlags()

				// Save if not currently loading
				if (!this.isLoadingState) {
					this.saveState()
				}
			})
			this.autoSaveCleanupFns.push(cleanup)
		})
	}

	/**
	 * Save the current app state to localStorage.
	 */
	private saveState() {
		const agents = this.app.agents.getAgents()
		// Don't save if no agents exist (e.g., during dispose)
		if (agents.length === 0) {
			return
		}
		const appState = this.serializeState()
		this.saveValue('state', appState)
	}

	/**
	 * Stop auto-saving and clean up watchers.
	 */
	stopAutoSave() {
		this.autoSaveCleanupFns.forEach((cleanup) => cleanup())
		this.autoSaveCleanupFns = []
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
	private loadValue<T>(key: string): T | null {
		const localStorage = globalThis.localStorage
		if (!localStorage) return null

		try {
			const fullKey = `${STORAGE_PREFIX}:${key}`
			const stored = localStorage.getItem(fullKey)
			if (stored) {
				return JSON.parse(stored) as T
			}
		} catch {
			console.warn(`Couldn't load ${key} from localStorage`)
		}

		return null
	}

	/**
	 * Save a value to localStorage.
	 */
	private saveValue<T>(key: string, value: T): void {
		const localStorage = globalThis.localStorage
		if (!localStorage) return

		try {
			const fullKey = `${STORAGE_PREFIX}:${key}`
			localStorage.setItem(fullKey, JSON.stringify(value))
		} catch {
			console.warn(`Couldn't save ${key} to localStorage`)
		}
	}
}
