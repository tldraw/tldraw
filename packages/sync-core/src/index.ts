import { registerTldrawLibraryVersion } from '@tldraw/utils'
export { ClientWebSocketAdapter, ReconnectManager } from './lib/ClientWebSocketAdapter'
export { RoomSessionState, type RoomSession } from './lib/RoomSession'
export type { WebSocketMinimal } from './lib/ServerSocketAdapter'
export { TLRemoteSyncError } from './lib/TLRemoteSyncError'
export { TLSocketRoom, type OmitVoid, type TLSyncLog } from './lib/TLSocketRoom'
export {
	TLSyncClient,
	TLSyncErrorCloseEventCode,
	TLSyncErrorCloseEventReason,
	type SubscribingFn,
	type TLPersistentClientSocket,
	type TLPersistentClientSocketStatus,
	type TLSocketStatusListener,
	type TlSocketStatusChangeEvent,
} from './lib/TLSyncClient'
export {
	DocumentState,
	TLSyncRoom,
	type RoomSnapshot,
	type RoomStoreMethods,
	type TLRoomSocket,
} from './lib/TLSyncRoom'
export { chunk } from './lib/chunk'
export {
	RecordOpType,
	ValueOpType,
	applyObjectDiff,
	diffRecord,
	getNetworkDiff,
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
	TLIncompatibilityReason,
	getTlsyncProtocolVersion,
	type TLConnectRequest,
	type TLPingRequest,
	type TLPushRequest,
	type TLSocketClientSentEvent,
	type TLSocketServerSentDataEvent,
	type TLSocketServerSentEvent,
} from './lib/protocol'
export type { PersistedRoomSnapshotForSupabase } from './lib/server-types'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
