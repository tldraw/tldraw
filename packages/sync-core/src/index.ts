import { registerTldrawLibraryVersion } from '@tldraw/utils'
export { canWrite, type TLCanWriteCheck, type TLCanWriteChecks } from './lib/canWrite'
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
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	TLIncompatibilityReason,
	type TLConnectRequest,
	type TLObjectStoreAccess,
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
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	type RoomStoreMethods,
	type SessionStateSnapshot,
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
	composeBeforeRead,
	composeBeforeWrite,
	TLSyncRoom,
	type MinimalDocStore,
	type PresenceStore,
	type RoomSnapshot,
	type TLBeforeReadHook,
	type TLBeforeReadHooks,
	type TLBeforeWriteHook,
	type TLBeforeWriteHooks,
	// oxlint-disable-next-line typescript/no-deprecated
	type TLRecordAuthorizer,
	// oxlint-disable-next-line typescript/no-deprecated
	type TLRecordAuthorizers,
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
