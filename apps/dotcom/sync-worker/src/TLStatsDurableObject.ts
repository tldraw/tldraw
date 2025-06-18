import { DurableObject } from 'cloudflare:workers'
import { Environment } from './types'
const ONE_SECOND = 1000
const ONE_MINUTE = 60 * ONE_SECOND
const USER_DO_ABORT_THRESHOLD = 20
const REPLICTOR_BOOT_RETRY_THRESHOLD = 10

function dropWhile(array: number[], predicate: (n: number) => boolean) {
	let i = 0
	while (i < array.length && predicate(array[i])) {
		i++
	}
	return array.slice(i)
}

export class TLStatsDurableObject extends DurableObject<Environment> {
	// User DO related stats
	private userDoAborts: number[] = []

	// Repliator related stats
	private replicatorBootRetries: number[] = []
	private lastReplicatorPostgresUpdate: number = 0

	// Internal state
	private startupTime: number
	private lastPruneTime = Date.now()

	constructor(state: DurableObjectState, env: Environment) {
		super(state, env)
		this.startupTime = Date.now()
		this.alarm()
	}

	override async alarm() {
		// Keep the object alive
		this.ctx.storage.setAlarm(ONE_SECOND)
		// Make sure we don't run out of memory if the checks stop working for some reason. We'll prune every 5 minutes
		if (this.lastPruneTime < Date.now() - 5 * ONE_MINUTE) {
			this.prune()
		}
	}

	private prune() {
		this.pruneUserDoAborts()
		this.pruneReplicatorBootRetries()
		this.lastPruneTime = Date.now()
	}

	private pruneUserDoAborts() {
		const cutoffTime = this.getCutoffTime()
		this.userDoAborts = dropWhile(this.userDoAborts, (ts) => ts < cutoffTime)
	}

	private pruneReplicatorBootRetries() {
		const cutoffTime = this.getCutoffTime()
		this.replicatorBootRetries = dropWhile(this.replicatorBootRetries, (ts) => ts < cutoffTime)
	}

	private getCutoffTime() {
		return Date.now() - ONE_MINUTE
	}

	// Let's wait for 10s before using the reported data
	private bootingUp() {
		return this.startupTime > Date.now() - 10 * ONE_SECOND
	}

	/* ----- RPCs for recording events ----- */

	async recordUserDoAbort() {
		this.userDoAborts.push(Date.now())
	}

	async recordReplicatorBootRetry() {
		this.replicatorBootRetries.push(Date.now())
	}

	async recordReplicatorPostgresUpdate() {
		this.lastReplicatorPostgresUpdate = Date.now()
	}

	/* ----- RPCs for sending checks data ----- */

	async unusualNumberOfUserDOAborts() {
		this.pruneUserDoAborts()
		return this.userDoAborts.length > USER_DO_ABORT_THRESHOLD
	}

	async unusualNumberOfReplicatorBootRetries() {
		this.pruneReplicatorBootRetries()
		return this.replicatorBootRetries.length > REPLICTOR_BOOT_RETRY_THRESHOLD
	}

	async isReplicatorGettingUpdates() {
		if (this.bootingUp()) return true

		return this.lastReplicatorPostgresUpdate > this.getCutoffTime()
	}
}
