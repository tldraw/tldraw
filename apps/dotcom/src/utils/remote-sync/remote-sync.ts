import { Signal, TLStoreSnapshot, TLUserPreferences } from '@tldraw/tldraw'
import { TLIncompatibilityReason } from '@tldraw/tlsync'

/** @public */
export class RemoteSyncError extends Error {
	override name = 'RemoteSyncError'
	constructor(public readonly reason: TLIncompatibilityReason) {
		super(`remote sync error: ${reason}`)
	}
}

/** @public */
export type UseSyncClientConfig = {
	uri: string
	roomId?: string
	userPreferences?: Signal<TLUserPreferences>
	snapshotForNewRoomRef?: { current: null | TLStoreSnapshot }
	getAccessToken?: () => Promise<string | undefined | null> | string | undefined | null
}
