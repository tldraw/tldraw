import { react } from 'tldraw'
import { PersistedAgentState, TldrawAgent } from '../TldrawAgent'
import { BaseAgentAppManager } from './BaseAgentAppManager'

const STORAGE_KEY = 'tldraw-agent-app:state'

export interface PersistedAppState {
	agents: Record<string, PersistedAgentState>
}

/**
 * Loads and saves all agents' state to localStorage, delegating the actual
 * (de)serialization to each agent's `serializeState()` / `loadState()`.
 */
export class AgentAppPersistenceManager extends BaseAgentAppManager {
	/** Suppresses saves while loading, so a load never writes itself back. */
	private isLoadingState = false

	private agentsListCleanup: (() => void) | null = null
	private agentWatcherCleanupFns = new Map<string, () => void>()

	serializeState(): PersistedAppState {
		return {
			agents: Object.fromEntries(
				this.app.agents.getAgents().map((agent) => [agent.id, agent.serializeState()])
			),
		}
	}

	/**
	 * Load app state from localStorage, creating agents for any persisted ids
	 * that don't exist yet.
	 */
	loadState() {
		this.isLoadingState = true
		try {
			const appState = this.loadValue()
			if (!appState) return

			for (const agentId of Object.keys(appState.agents)) {
				this.app.agents.createAgent(agentId)
			}
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
	 * Reactively save whenever the agents list or any agent's state changes.
	 * Call after loadState().
	 */
	startAutoSave() {
		this.agentsListCleanup = react('agents list', () => {
			const agents = this.app.agents.getAgents()
			const currentAgentIds = new Set(agents.map((a) => a.id))

			for (const agent of agents) {
				if (!this.agentWatcherCleanupFns.has(agent.id)) {
					this.agentWatcherCleanupFns.set(agent.id, this.createAgentStateWatcher(agent))
				}
			}

			for (const [id, cleanup] of this.agentWatcherCleanupFns) {
				if (!currentAgentIds.has(id)) {
					cleanup()
					this.agentWatcherCleanupFns.delete(id)
				}
			}

			this.saveState()
		})
	}

	private createAgentStateWatcher(agent: TldrawAgent): () => void {
		return react(`${agent.id} state`, () => {
			// Read the reactive state so this reaction re-runs when any of it changes
			agent.chat.getHistory()
			agent.chatOrigin.getOrigin()
			agent.todos.getTodos()
			agent.context.getItems()
			agent.modelName.getModelName()
			agent.debug.getDebugFlags()

			this.saveState()
		})
	}

	private saveState() {
		if (this.isLoadingState) return
		// No agents means we're mid-dispose; don't clobber the saved state
		if (this.app.agents.getAgents().length === 0) return
		this.saveValue(this.serializeState())
	}

	stopAutoSave() {
		this.agentsListCleanup?.()
		this.agentsListCleanup = null
		for (const cleanup of this.agentWatcherCleanupFns.values()) {
			cleanup()
		}
		this.agentWatcherCleanupFns.clear()
	}

	reset() {
		this.stopAutoSave()
		this.isLoadingState = false
	}

	override dispose() {
		this.stopAutoSave()
		super.dispose()
	}

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

	private saveValue(value: PersistedAppState): void {
		if (!globalThis.localStorage) return
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
		} catch {
			console.warn(`Couldn't save ${STORAGE_KEY} to localStorage`)
		}
	}
}
