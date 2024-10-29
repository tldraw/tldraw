import { TLSyncErrorCloseEventReason } from './TLSyncClient'

/** @public */
export class TLRemoteSyncError extends Error {
	override name = 'RemoteSyncError'
	constructor(public readonly reason: TLSyncErrorCloseEventReason | string) {
		super(`sync error: ${reason}`)
	}
}
