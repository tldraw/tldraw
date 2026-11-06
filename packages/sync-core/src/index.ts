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
export { TLRelationsClient } from './lib/relations/client'
export { defaultRelationSchema } from './lib/relations/defaultSchema'
export {
	RelationEvaluator,
	authorizeRelationWrite,
	canReadRelationRecord,
	type TLRelationCeiling,
	type TLRelationContext,
	type TLRelationSource,
	type TLRelationWriteResult,
} from './lib/relations/evaluate'
export { RelationTupleIndex, createRelationRoomAccess } from './lib/relations/roomAccess'
export {
	allOf,
	anyOf,
	anyone,
	butNot,
	defineRelationSchema,
	direct,
	field,
	from,
	nobody,
	when,
	type TLRelationEnv,
	type TLRelationExpr,
	type TLRelationFieldExpr,
	type TLRelationSchema,
	type TLRelationTypeDef,
	type TLRelationWriteOp,
} from './lib/relations/schema'
export {
	attenuateCapabilityToken,
	createCapabilityToken,
	verifyCapabilityToken,
	type TLCapability,
	type TLCapabilityCaveat,
} from './lib/relations/tokens'
export {
	InMemoryTupleStore,
	resolveRelationContext,
	type ResolveRelationContextOptions,
	type TLRelationTuple,
	type TLTupleStore,
} from './lib/relations/tupleStore'
export { RoomSessionState, type RoomSession, type RoomSessionBase } from './lib/RoomSession'
export type { PersistedRoomSnapshotForSupabase } from './lib/server-types'
export type { WebSocketMinimal } from './lib/ServerSocketAdapter'
export type { TLRoomAccess, TLRoomAccessView, TLRoomAccessWrite } from './lib/TLRoomAccess'
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
	TLSyncRoom,
	type MinimalDocStore,
	type PresenceStore,
	type RoomSnapshot,
	type TLRecordAuthorizer,
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
