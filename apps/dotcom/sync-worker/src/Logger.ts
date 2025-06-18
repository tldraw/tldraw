import { createSentry } from '@tldraw/worker-shared'
import { Environment, isDebugLogging } from './types'
import { getLogger } from './utils/durableObjects'

export class Logger {
	readonly logger
	constructor(
		env: Environment,
		private prefix: string,
		private sentry?: ReturnType<typeof createSentry>
	) {
		if (isDebugLogging(env)) {
			this.logger = getLogger(env)
		}
	}
	private outgoing: string[] = []

	private isRunning = false

	debug(...args: any[]) {
		if (!this.logger && !this.sentry) return
		const msg = `[${this.prefix} ${new Date().toISOString()}]: ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')}`
		this.outgoing.push(msg)
		this.processQueue()
	}

	private async processQueue() {
		if (this.isRunning) return
		this.isRunning = true
		try {
			while (this.outgoing.length) {
				const batch = this.outgoing
				this.outgoing = []
				await this.logger?.debug(batch)
				for (const message of batch) {
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					this.sentry?.addBreadcrumb({ message })
				}
			}
		} finally {
			this.isRunning = false
		}
	}
}
