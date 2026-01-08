import type { TldrawAgent } from '../TldrawAgent'

/**
 * Base class for all agent managers.
 * Provides common lifecycle methods and resource cleanup functionality.
 */
export abstract class BaseAgentManager {
	constructor(public agent: TldrawAgent) {}

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
