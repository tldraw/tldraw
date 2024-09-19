import { TLIncompatibilityReason } from './protocol'

/** @internal */
export class TLRemoteSyncError extends Error {
	override name = 'RemoteSyncError'
	constructor(public readonly reason: TLIncompatibilityReason) {
		super(`remote sync error: ${reason}`)
	}
}
