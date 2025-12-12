import { Atom, atom } from 'tldraw'
import { BaseFairyAppManager } from './BaseFairyAppManager'

export interface FungalNetworkState {
	id: string
	x: number
	y: number
	w: number
	h: number
	prompt: string
	triggerOn: ('enter' | 'leave')[]
}

/**
 * Manager for fungal network overlays.
 *
 * Fungal networks are non-persistent canvas overlays that trigger fairy agents
 * when shapes enter or leave their bounds.
 */
export class FairyAppFungalNetworksManager extends BaseFairyAppManager {
	/**
	 * Active fungal networks.
	 */
	private $networks: Atom<FungalNetworkState[]> = atom('fungalNetworks', [])

	/**
	 * Get all active fungal networks.
	 */
	getNetworks(): FungalNetworkState[] {
		return this.$networks.get()
	}

	/**
	 * Get a specific fungal network by ID.
	 */
	getNetwork(id: string): FungalNetworkState | undefined {
		return this.$networks.get().find((n) => n.id === id)
	}

	/**
	 * Add a new fungal network.
	 */
	addNetwork(network: FungalNetworkState): void {
		this.$networks.set([...this.$networks.get(), network])
	}

	/**
	 * Remove a fungal network by ID.
	 * Also cleans up the associated shape-bound agent.
	 */
	removeNetwork(id: string): void {
		this.$networks.set(this.$networks.get().filter((n) => n.id !== id))
		// Clean up the agent associated with this network
		this.fairyApp.agents.disposeShapeBoundAgent(id)
	}

	/**
	 * Update a fungal network with a partial update.
	 */
	updateNetwork(id: string, patch: Partial<FungalNetworkState>): void {
		this.$networks.set(this.$networks.get().map((n) => (n.id === id ? { ...n, ...patch } : n)))
	}

	/**
	 * Reset the manager - removes all fungal networks and their agents.
	 */
	reset(): void {
		// Clean up all agents first
		for (const network of this.$networks.get()) {
			this.fairyApp.agents.disposeShapeBoundAgent(network.id)
		}
		this.$networks.set([])
	}
}
