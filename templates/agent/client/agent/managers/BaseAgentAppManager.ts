import type { TldrawAgentApp } from '../TldrawAgentApp'

/**
 * Base class for app-level managers (shared across all agents), as opposed to
 * BaseAgentManager which is per-agent. Subclasses add cleanup functions to
 * `disposables`; `dispose()` runs them.
 */
export abstract class BaseAgentAppManager {
	constructor(public app: TldrawAgentApp) {}

	protected disposables = new Set<() => void>()

	abstract reset(): void

	dispose(): void {
		for (const fn of this.disposables) {
			fn()
		}
		this.disposables.clear()
	}
}
