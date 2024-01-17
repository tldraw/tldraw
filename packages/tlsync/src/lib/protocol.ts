import { SerializedSchema, UnknownRecord } from '@tldraw/store'
import { NetworkDiff, ObjectDiff, RecordOpType } from './diff'

/** @public */
export const TLSYNC_PROTOCOL_VERSION = 4

/** @public */
export enum TLIncompatibilityReason {
	ClientTooOld = 'clientTooOld',
	ServerTooOld = 'serverTooOld',
	InvalidRecord = 'invalidRecord',
	InvalidOperation = 'invalidOperation',
}

/** @public */
export type TLSocketServerSentEvent<R extends UnknownRecord> =
	| {
			type: 'connect'
			hydrationType: 'wipe_all' | 'wipe_presence'
			connectRequestId: string
			protocolVersion: number
			schema: SerializedSchema
			diff: NetworkDiff<R>
			serverClock: number
	  }
	| {
			type: 'incompatibility_error'
			reason: TLIncompatibilityReason
	  }
	| {
			type: 'patch'
			diff: NetworkDiff<R>
			serverClock: number
	  }
	| {
			type: 'error'
			error?: any
	  }
	| {
			type: 'push_result'
			clientClock: number
			serverClock: number
			action: 'discard' | 'commit' | { rebaseWithDiff: NetworkDiff<R> }
	  }
	| {
			type: 'pong'
	  }

/** @public */
export type TLPushRequest<R extends UnknownRecord> =
	| {
			type: 'push'
			clientClock: number
			presence: [RecordOpType.Patch, ObjectDiff] | [RecordOpType.Put, R]
	  }
	| {
			type: 'push'
			clientClock: number
			diff: NetworkDiff<R>
	  }

/** @public */
export type TLConnectRequest = {
	type: 'connect'
	connectRequestId: string
	lastServerClock: number
	protocolVersion: number
	schema: SerializedSchema
}

/** @public */
export type TLPingRequest = {
	type: 'ping'
}

/** @public */
export type TLSocketClientSentEvent<R extends UnknownRecord> =
	| TLPushRequest<R>
	| TLConnectRequest
	| TLPingRequest
