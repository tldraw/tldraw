import type { TldrawAgent } from '../TldrawAgent'

/**
 * Base class for per-agent managers. Subclasses add cleanup functions to
 * `disposables`; `dispose()` runs them.
 */
export abstract class BaseAgentManager {
	constructor(public agent: TldrawAgent) {}

	protected disposables = new Set<() => void>()

	abstract reset(): void

	dispose(): void {
		for (const fn of this.disposables) {
			fn()
		}
		this.disposables.clear()
	}
}
