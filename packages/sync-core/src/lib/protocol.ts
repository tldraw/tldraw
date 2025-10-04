import { SerializedSchema, UnknownRecord } from '@tldraw/store'
import { NetworkDiff, ObjectDiff, RecordOpType } from './diff'

const TLSYNC_PROTOCOL_VERSION = 7

/** @internal */
export function getTlsyncProtocolVersion() {
	return TLSYNC_PROTOCOL_VERSION
}

/**
 * @public
 * @deprecated Replaced by websocket .close status/reason
 */
export const TLIncompatibilityReason = {
	ClientTooOld: 'clientTooOld',
	ServerTooOld: 'serverTooOld',
	InvalidRecord: 'invalidRecord',
	InvalidOperation: 'invalidOperation',
} as const

/**
 * @public
 * @deprecated replaced by websocket .close status/reason
 */
export type TLIncompatibilityReason =
	(typeof TLIncompatibilityReason)[keyof typeof TLIncompatibilityReason]

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
			isReadonly: boolean
	  }
	| {
			type: 'incompatibility_error'
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			reason: TLIncompatibilityReason
	  }
	| {
			type: 'pong'
	  }
	| { type: 'data'; data: TLSocketServerSentDataEvent<R>[] }
	| { type: 'custom'; data: any }
	| TLSocketServerSentDataEvent<R>

/** @public */
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

/** @public */
export interface TLPushRequest<R extends UnknownRecord> {
	type: 'push'
	clientClock: number
	diff?: NetworkDiff<R>
	presence?: [typeof RecordOpType.Patch, ObjectDiff] | [typeof RecordOpType.Put, R]
}

/** @public */
export interface TLConnectRequest {
	type: 'connect'
	connectRequestId: string
	lastServerClock: number
	protocolVersion: number
	schema: SerializedSchema
}

/** @public */
export interface TLPingRequest {
	type: 'ping'
}

/** @public */
export type TLSocketClientSentEvent<R extends UnknownRecord> =
	| TLPushRequest<R>
	| TLConnectRequest
	| TLPingRequest
