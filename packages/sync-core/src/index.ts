import { registerTldrawLibraryVersion } from '@tldraw/utils'
export { chunk, JsonChunkAssembler } from './lib/chunk'
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
export { DurableObjectSqliteSyncWrapper } from './lib/DurableObjectSqliteSyncWrapper'
export { DEFAULT_INITIAL_SNAPSHOT, InMemorySyncStorage } from './lib/InMemorySyncStorage'
export { NodeSqliteWrapper, type SyncSqliteDatabase } from './lib/NodeSqliteWrapper'
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
export { RoomSessionState, type RoomSession, type RoomSessionBase } from './lib/RoomSession'
export type { PersistedRoomSnapshotForSupabase } from './lib/server-types'
export type { WebSocketMinimal } from './lib/ServerSocketAdapter'
export {
	SQLiteSyncStorage,
	type TLSqliteInputValue,
	type TLSqliteOutputValue,
	type TLSqliteRow,
	type TLSyncSqliteStatement,
	type TLSyncSqliteWrapper,
	type TLSyncSqliteWrapperConfig,
} from './lib/SQLiteSyncStorage'
export { TLRemoteSyncError } from './lib/TLRemoteSyncError'
export {
	TLSocketRoom,
	type OmitVoid,
	type RoomStoreMethods,
	type TLSocketRoomOptions,
	type TLSyncLog,
} from './lib/TLSocketRoom'
export {
	TLSyncClient,
	TLSyncErrorCloseEventCode,
	TLSyncErrorCloseEventReason,
	type SubscribingFn,
	type TLCustomMessageHandler,
	type TLPersistentClientSocket,
	type TLPersistentClientSocketStatus,
	type TLPresenceMode,
	type TLSocketStatusChangeEvent,
	type TLSocketStatusListener,
} from './lib/TLSyncClient'
export {
	TLSyncRoom,
	type MinimalDocStore,
	type PresenceStore,
	type RoomSnapshot,
	type TLRoomSocket,
} from './lib/TLSyncRoom'
export {
	loadSnapshotIntoStorage,
	type TLSyncForwardDiff,
	type TLSyncStorage,
	type TLSyncStorageGetChangesSinceResult,
	type TLSyncStorageOnChangeCallbackProps,
	type TLSyncStorageTransaction,
	type TLSyncStorageTransactionCallback,
	type TLSyncStorageTransactionOptions,
	type TLSyncStorageTransactionResult,
} from './lib/TLSyncStorage'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
