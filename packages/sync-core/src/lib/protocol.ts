import { SerializedSchema, UnknownRecord } from '@tldraw/store'
import { NetworkDiff, ObjectDiff, RecordOpType } from './diff'

const TLSYNC_PROTOCOL_VERSION = 6

/** @internal */
export function getTlsyncProtocolVersion() {
	return TLSYNC_PROTOCOL_VERSION
}

/** @internal */
export const TLIncompatibilityReason = {
	ClientTooOld: 'clientTooOld',
	ServerTooOld: 'serverTooOld',
	InvalidRecord: 'invalidRecord',
	InvalidOperation: 'invalidOperation',
	RoomNotFound: 'roomNotFound',
	Forbidden: 'forbidden',
} as const

/** @internal */
export type TLIncompatibilityReason =
	(typeof TLIncompatibilityReason)[keyof typeof TLIncompatibilityReason]

/** @internal */
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
			type: 'error'
			error?: any
	  }
	| {
			type: 'pong'
	  }
	| { type: 'data'; data: TLSocketServerSentDataEvent<R>[] }
	| TLSocketServerSentDataEvent<R>

/** @internal */
export type TLSocketServerSentDataEvent<R extends UnknownRecord> =
	| {
			type: 'patch'
			diff: NetworkDiff<R>
			serverClock: number
	  }
	| {
			type: 'push_result'
			clientClock: number
			serverClock: number
			action: 'discard' | 'commit' | { rebaseWithDiff: NetworkDiff<R> }
	  }

/** @internal */
export interface TLPushRequest<R extends UnknownRecord> {
	type: 'push'
	clientClock: number
	diff?: NetworkDiff<R>
	presence?: [typeof RecordOpType.Patch, ObjectDiff] | [typeof RecordOpType.Put, R]
}

/** @internal */
export interface TLConnectRequest {
	type: 'connect'
	connectRequestId: string
	lastServerClock: number
	protocolVersion: number
	schema: SerializedSchema
}

/** @internal */
export interface TLPingRequest {
	type: 'ping'
}

/** @internal */
export type TLSocketClientSentEvent<R extends UnknownRecord> =
	| TLPushRequest<R>
	| TLConnectRequest
	| TLPingRequest
