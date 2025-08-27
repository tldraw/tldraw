import { registerTldrawLibraryVersion } from '@tldraw/utils'
export { chunk } from './lib/chunk'
export { ClientWebSocketAdapter, ReconnectManager } from './lib/ClientWebSocketAdapter'
export {
	applyObjectDiff,
	diffRecord,
	getNetworkDiff,
	RecordOpType,
	ValueOpType,
	type AppendOp,
	type DeleteOp,
	type NetworkDiff,
	type ObjectDiff,
	type PatchOp,
	type PutOp,
	type RecordOp,
	type ValueOp,
} from './lib/diff'
export {
	getTlsyncProtocolVersion,
	TLIncompatibilityReason,
	type TLConnectRequest,
	type TLPingRequest,
	type TLPushRequest,
	type TLSocketClientSentEvent,
	type TLSocketServerSentDataEvent,
	type TLSocketServerSentEvent,
} from './lib/protocol'
export { RoomSessionState, type RoomSession } from './lib/RoomSession'
export type { PersistedRoomSnapshotForSupabase } from './lib/server-types'
export type { WebSocketMinimal } from './lib/ServerSocketAdapter'
export { TLRemoteSyncError } from './lib/TLRemoteSyncError'
export { TLSocketRoom, type OmitVoid, type TLSyncLog } from './lib/TLSocketRoom'
export {
	TLSyncClient,
	TLSyncErrorCloseEventCode,
	TLSyncErrorCloseEventReason,
	type SubscribingFn,
	type TLCustomMessageHandler,
	type TLPersistentClientSocket,
	type TLPersistentClientSocketStatus,
	type TLPresenceMode,
	type TlSocketStatusChangeEvent,
	type TLSocketStatusListener,
} from './lib/TLSyncClient'
export {
	DocumentState,
	TLSyncRoom,
	type RoomSnapshot,
	type RoomStoreMethods,
	type TLRoomSocket,
} from './lib/TLSyncRoom'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
