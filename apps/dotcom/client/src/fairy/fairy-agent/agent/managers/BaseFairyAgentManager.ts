import { FairyAgent } from '../FairyAgent'

export abstract class BaseFairyAgentManager {
	constructor(public agent: FairyAgent) {}
	protected disposables = new Set<() => void>()

	abstract reset(): void

	dispose(): void {
		for (const fn of this.disposables) {
			fn()
		}
		this.disposables.clear()
	}
}
