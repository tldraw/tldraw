import type { TldrawAgentApp } from '../TldrawAgentApp'

/**
 * Base class for all agent app managers.
 * These managers handle app-level concerns (shared across all agents),
 * as opposed to BaseAgentManager which handles per-agent concerns.
 *
 * Provides common lifecycle methods and resource cleanup functionality.
 */
export abstract class BaseAgentAppManager {
	constructor(public app: TldrawAgentApp) {}

	/**
	 * Set of cleanup functions to be called when the manager is disposed.
	 * Subclasses can add disposables during initialization or operation.
	 * @protected
	 */
	protected disposables = new Set<() => void>()

	/**
	 * Reset the manager to its initial state.
	 * Must be implemented by all subclasses to handle their specific state.
	 * @abstract
	 */
	abstract reset(): void

	/**
	 * Clean up all resources held by this manager.
	 * Calls all registered dispose functions and clears the disposables set.
	 */
	dispose(): void {
		for (const fn of this.disposables) {
			fn()
		}
		this.disposables.clear()
	}
}
