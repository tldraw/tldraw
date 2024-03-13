import { SerializedSchema, UnknownRecord } from '@tldraw/store'
import { NetworkDiff, ObjectDiff, RecordOpType } from './diff'

/** @public */
export const TLSYNC_PROTOCOL_VERSION = 5

/** @public */
export const TLIncompatibilityReason = {
	ClientTooOld: 'clientTooOld',
	ServerTooOld: 'serverTooOld',
	InvalidRecord: 'invalidRecord',
	InvalidOperation: 'invalidOperation',
} as const

/** @public */
export type TLIncompatibilityReason =
	(typeof TLIncompatibilityReason)[keyof typeof TLIncompatibilityReason]

/** @public */
export type TLSocketServerSentEvent =
	| {
			type: 'connect'
			hydrationType: 'wipe_all' | 'wipe_presence'
			connectRequestId: string
			protocolVersion: number
			schema: SerializedSchema
			diff: NetworkDiff
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
	| { type: 'data'; data: TLSocketServerSentDataEvent[] }

/** @public */
export type TLSocketServerSentDataEvent =
	| {
			type: 'patch'
			diff: NetworkDiff
			serverClock: number
	  }
	| {
			type: 'push_result'
			clientClock: number
			serverClock: number
			action: 'discard' | 'commit' | { rebaseWithDiff: NetworkDiff }
	  }

/** @public */
export type TLPushRequest =
	| {
			type: 'push'
			clientClock: number
			presence: [typeof RecordOpType.Patch, ObjectDiff] | [typeof RecordOpType.Put, UnknownRecord]
	  }
	| {
			type: 'push'
			clientClock: number
			diff: NetworkDiff
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
export type TLSocketClientSentEvent = TLPushRequest | TLConnectRequest | TLPingRequest
