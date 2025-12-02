import { MAX_FAIRY_COUNT } from '@tldraw/dotcom-shared'
import {
	FAIRY_VARIANTS,
	FairyConfig,
	FairyVariantType,
	PersistedFairyConfigs,
} from '@tldraw/fairy-shared'
import { atom, Atom, uniqueId } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { getRandomFairyName } from '../../fairy-helpers/getRandomFairyName'
import { getRandomFairySign } from '../../fairy-helpers/getRandomFairySign'
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
	private loadedAgentIds: Set<string> = new Set()

	/**
	 * Get the current list of agents.
	 */
	getAgents(): FairyAgent[] {
		return this.$agents.get()
	}

	/**
	 * Get an agent by ID.
	 */
	getAgentById(id: string): FairyAgent | undefined {
		return this.$agents.get().find((agent) => agent.id === id)
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
		const configIds = Object.keys(fairyConfigs)
		const existingAgents = this.$agents.get()
		const existingIds = new Set(existingAgents.map((a) => a.id))

		// Create a new fairy if we're below max count
		if (configIds.length < MAX_FAIRY_COUNT) {
			const id = this.createNewFairyConfig()
			configIds.push(id)
		}

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
	createNewFairyConfig(): string {
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

		const id = uniqueId()

		const config: FairyConfig = {
			name: getRandomFairyName(),
			outfit: randomOutfit,
			sign: getRandomFairySign(),
		}

		// Add the config to the user's settings
		this.fairyApp.tldrawApp.z.mutate.user.updateFairyConfig({ id, properties: config })

		return id
	}

	/**
	 * Mark an agent as loaded (state restored from persistence).
	 */
	markAgentLoaded(agentId: string) {
		this.loadedAgentIds.add(agentId)
	}

	/**
	 * Check if an agent has already been loaded.
	 */
	isAgentLoaded(agentId: string): boolean {
		return this.loadedAgentIds.has(agentId)
	}

	/**
	 * Clear the loaded agent tracking. Called when switching files.
	 */
	clearLoadedAgentIds() {
		this.loadedAgentIds.clear()
	}

	/**
	 * Dispose all agents. Call this during cleanup.
	 */
	disposeAll() {
		const agents = this.$agents.get()
		agents.forEach((agent) => agent.reset())
	}

	/**
	 * Reset the manager to its initial state.
	 */
	reset() {
		this.disposeAll()
	}
}
