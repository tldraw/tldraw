import { TLIncompatibilityReason } from '@tldraw/tlsync'
import { Signal, TLStoreSnapshot, TLUserPreferences } from 'tldraw'

/** @public */
export class RemoteSyncError extends Error {
	override name = 'RemoteSyncError'
	constructor(public readonly reason: TLIncompatibilityReason) {
		super(`remote sync error: ${reason}`)
	}
}

/** @public */
export interface UseSyncClientConfig {
	uri: string
	roomId?: string
	userPreferences?: Signal<TLUserPreferences>
	snapshotForNewRoomRef?: { current: null | TLStoreSnapshot }
}
