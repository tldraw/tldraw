import { MAX_FAIRY_COUNT } from '@tldraw/dotcom-shared'
import {
	AgentId,
	FAIRY_VARIANTS,
	FairyConfig,
	FairyVariantType,
	PersistedFairyConfigs,
	toAgentId,
} from '@tldraw/fairy-shared'
import { atom, Atom, uniqueId } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { getRandomFairyHat } from '../../fairy-helpers/getRandomFairyHat'
import { getRandomFairyHatColor } from '../../fairy-helpers/getRandomFairyHatColor'
import { getRandomFairyName } from '../../fairy-helpers/getRandomFairyName'
import { getRandomFairySign } from '../../fairy-helpers/getRandomFairySign'
import { getRandomLegLength } from '../../fairy-helpers/getRandomLegLength'
import { BaseFairyAppManager } from './BaseFairyAppManager'

/**
 * Manager for fairy agent lifecycle - creation, disposal, and tracking.
 *
 * This duplicates functionality from the React component FairyApp.ts
 * but in a class-based form that doesn't depend on React hooks.
 */
export class FairyAppAgentsManager extends BaseFairyAppManager {
	/**
	 * Atom containing the current list of fairy agents.
	 */
	private $agents: Atom<FairyAgent[]> = atom('fairyAppAgents', [])

	/**
	 * Track which agents have been loaded to avoid reloading existing agents.
	 */
	private loadedAgentIds: Set<AgentId> = new Set()

	/**
	 * Map of shape-bound agents that aren't tied to user fairy configs.
	 * Key is the shape ID, value is the agent.
	 */
	private $shapeBoundAgents: Atom<Map<string, FairyAgent>> = atom('shapeBoundAgents', new Map())

	/**
	 * Get the current list of agents.
	 */
	getAgents(): FairyAgent[] {
		return this.$agents.get()
	}

	/**
	 * Get an agent by ID.
	 */
	getAgentById(id: AgentId): FairyAgent | undefined {
		return this.$agents.get().find((agent) => agent.id === id)
	}

	/**
	 * Create a shape-bound agent that isn't tied to user fairy configs.
	 * This is used for shapes like FungalNetwork that want their own dedicated agent.
	 *
	 * @param shapeId - The ID of the shape to bind the agent to
	 * @param options - Options for agent creation
	 * @returns The created or existing agent
	 */
	createShapeBoundAgent(
		shapeId: string,
		options: {
			onError(e: any): void
			getToken(): Promise<string | undefined>
		}
	): FairyAgent {
		const existing = this.$shapeBoundAgents.get().get(shapeId)
		if (existing) return existing

		const id = toAgentId(shapeId) // Use the network ID directly as it's already unique and we want it stable
		const agent = new FairyAgent({
			id,
			fairyApp: this.fairyApp,
			editor: this.fairyApp.editor,
			onError: options.onError,
			getToken: options.getToken,
		})

		this.$shapeBoundAgents.update((map) => {
			const newMap = new Map(map)
			newMap.set(shapeId, agent)
			return newMap
		})

		agent.mode.setMode('zone-idling')

		return agent
	}

	/**
	 * Get a shape-bound agent by shape ID.
	 *
	 * @param shapeId - The ID of the shape
	 * @returns The agent if it exists, undefined otherwise
	 */
	getShapeBoundAgent(shapeId: string): FairyAgent | undefined {
		return this.$shapeBoundAgents.get().get(shapeId)
	}

	/**
	 * Get all shape-bound agents (zone agents).
	 *
	 * @returns Array of all shape-bound agents
	 */
	getShapeBoundAgents(): FairyAgent[] {
		return Array.from(this.$shapeBoundAgents.get().values())
	}

	/**
	 * Dispose a shape-bound agent when the shape is deleted.
	 *
	 * @param shapeId - The ID of the shape whose agent should be disposed
	 */
	disposeShapeBoundAgent(shapeId: string): void {
		const agent = this.$shapeBoundAgents.get().get(shapeId)
		if (agent) {
			agent.dispose()
			this.$shapeBoundAgents.update((map) => {
				const newMap = new Map(map)
				newMap.delete(shapeId)
				return newMap
			})
		}
	}

	/**
	 * Sync agents with the provided fairy configs.
	 * Creates new agents for new configs, disposes agents for removed configs.
	 *
	 * @param fairyConfigs - The persisted fairy configurations
	 * @param options - Options for agent creation
	 */
	syncAgentsWithConfigs(
		fairyConfigs: PersistedFairyConfigs,
		options: {
			onError(e: any): void
			getToken(): Promise<string | undefined>
		}
	) {
		const configIds = Object.keys(fairyConfigs) as AgentId[]
		const existingAgents = this.$agents.get()
		const existingIds = new Set(existingAgents.map((a) => a.id))

		// Create a new fairy if we're below max count
		if (configIds.length < MAX_FAIRY_COUNT) {
			const id = this.createNewFairyConfig()
			configIds.push(id)
		}

		this.migrateFairyConfigs(fairyConfigs)

		// Find agents to create (new configs that don't have agents yet)
		const idsToCreate = configIds.filter((id) => !existingIds.has(id))

		// Find agents to dispose (agents that no longer have configs)
		const configIdsSet = new Set(configIds)
		const agentsToDispose = existingAgents.filter((agent) => !configIdsSet.has(agent.id))

		// Dispose removed agents and clean up tracking
		agentsToDispose.forEach((agent) => {
			agent.dispose()
			this.loadedAgentIds.delete(agent.id)
		})

		// Create new agents
		const newAgents = idsToCreate.map((id) => {
			return new FairyAgent({
				id,
				fairyApp: this.fairyApp,
				editor: this.fairyApp.editor,
				onError: options.onError,
				getToken: options.getToken,
			})
		})

		// Keep existing agents that are still in config, add new ones
		const updatedAgents = [
			...existingAgents.filter((agent) => configIdsSet.has(agent.id)),
			...newAgents,
		]

		this.$agents.set(updatedAgents)
	}

	/**
	 * Create a new fairy configuration and add it to the user's settings.
	 * Returns the ID of the new fairy.
	 */
	createNewFairyConfig() {
		const randomOutfit = {
			body: Object.keys(FAIRY_VARIANTS.body)[
				Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.body).length)
			] as FairyVariantType<'body'>,
			hat: Object.keys(FAIRY_VARIANTS.hat)[
				Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.hat).length)
			] as FairyVariantType<'hat'>,
			wings: Object.keys(FAIRY_VARIANTS.wings)[
				Math.floor(Math.random() * Object.keys(FAIRY_VARIANTS.wings).length)
			] as FairyVariantType<'wings'>,
		}

		const id = toAgentId(uniqueId())

		const config: FairyConfig = {
			name: getRandomFairyName(),
			outfit: randomOutfit,
			sign: getRandomFairySign(),
			hat: getRandomFairyHat(),
			hatColor: getRandomFairyHatColor(),
			legLength: getRandomLegLength(),
			version: 2,
		}

		// Add the config to the user's settings
		this.fairyApp.tldrawApp.z.mutate.user.updateFairyConfig({ id, properties: config })

		return id
	}

	migrateFairyConfigs(fairyConfigs: PersistedFairyConfigs) {
		for (const [id, config] of Object.entries(fairyConfigs)) {
			let didMigrate = false
			if (!config.version || config.version < 1) {
				didMigrate = true
				config.hat = getRandomFairyHat()
				config.hatColor = getRandomFairyHatColor()
				config.version = 1
			}
			if (!config.version || config.version < 2) {
				didMigrate = true
				config.legLength = getRandomLegLength()
				config.version = 2
			}
			if (didMigrate) {
				this.fairyApp.tldrawApp.z.mutate.user.updateFairyConfig({ id, properties: config })
			}
		}
	}

	/**
	 * Mark an agent as loaded (state restored from persistence).
	 */
	markAgentLoaded(agentId: AgentId) {
		this.loadedAgentIds.add(agentId)
	}

	/**
	 * Check if an agent has already been loaded.
	 */
	isAgentLoaded(agentId: AgentId): boolean {
		return this.loadedAgentIds.has(agentId)
	}

	/**
	 * Clear the loaded agent tracking. Called when switching files.
	 */
	clearLoadedAgentIds() {
		this.loadedAgentIds.clear()
	}

	/**
	 * Reset the state of all agents without disposing them.
	 * Clears chats, todos, projects, and returns agents to idle mode.
	 */
	resetAllAgents() {
		const agents = this.$agents.get()
		agents.forEach((agent) => agent.reset())
	}

	/**
	 * Dispose all agents. Call this during cleanup.
	 */
	disposeAll() {
		const agents = this.$agents.get()
		agents.forEach((agent) => agent.dispose())
		this.$agents.set([])
		this.loadedAgentIds.clear()

		// Also dispose shape-bound agents
		const shapeBoundAgents = this.$shapeBoundAgents.get()
		shapeBoundAgents.forEach((agent) => agent.dispose())
		this.$shapeBoundAgents.set(new Map())
	}

	/**
	 * Reset the manager to its initial state.
	 */
	reset() {
		this.disposeAll()
	}

	/**
	 * Dispose of the manager and clean up listeners.
	 */
	dispose() {
		this.disposeAll()
	}
}
