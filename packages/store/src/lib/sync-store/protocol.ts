import { UnknownRecord } from '../BaseRecord'
import { SerializedSchema } from '../StoreSchema'
import { NetworkDiff } from './diff'

/** @public */
export const TLSYNC_PROTOCOL_VERSION = 4

/** @public */
export enum TLIncompatibilityReason {
	ClientTooOld = 'clientTooOld',
	ServerTooOld = 'serverTooOld',
	InvalidRecord = 'invalidRecord',
	InvalidOperation = 'invalidOperation',
}

export type GoingUpstreamConnectMessage = {
	type: 'connect'
	spanId: string
	lastUpstreamClock: number
	protocolVersion: number
	schema: SerializedSchema
}

export type GoingUpstreamPushMessage<R extends UnknownRecord> = {
	type: 'push'
	pushId: string
	diff: NetworkDiff<R>
}

export type GoingUpstreamPingMessage = {
	type: 'ping'
}

export type GoingUpstreamMessage<R extends UnknownRecord> =
	| GoingUpstreamPushMessage<R>
	| GoingUpstreamConnectMessage
	| GoingUpstreamPingMessage

export type GoingDownstreamPatchMessage<R extends UnknownRecord> = {
	type: 'patch'
	diff: NetworkDiff<R>
	serverClock: number
	satisfiedPushIds?: string[]
}

export type GoingDownstreamConnectMessage<R extends UnknownRecord> = {
	type: 'connect'
	hydrationType: 'wipe_all' | 'wipe_presence'
	protocolVersion: number
	schema: SerializedSchema
	diff: NetworkDiff<R>
	upstreamClock: number
	spanId: string
}

export type GoingDownstreamIncompatibilityMessage = {
	type: 'incompatibility_error'
	reason: TLIncompatibilityReason
}

export type GoingDownstreamErrorMessage = {
	type: 'error'
	error?: any
}

export type GoingDownstreamPongMessage = {
	type: 'pong'
}

export type GoingDownstreamMessage<R extends UnknownRecord> =
	| GoingDownstreamPatchMessage<R>
	| GoingDownstreamConnectMessage<R>
	| GoingDownstreamIncompatibilityMessage
	| GoingDownstreamErrorMessage
	| GoingDownstreamPongMessage

export interface GoingUpstreamSocket<R extends UnknownRecord> {
	isOpen(): boolean
	sendMessage(message: GoingUpstreamMessage<R>): void
	onMessage(callback: (message: GoingDownstreamMessage<R>) => void): () => void
	onStatusChange(cb: (isOpen: boolean) => void): () => void
	reopen(): void
}

export interface GoingDownstreamSocket<R extends UnknownRecord> {
	isOpen(): boolean
	sendMessage(message: GoingDownstreamMessage<R>): void
	onMessage(callback: (message: GoingUpstreamMessage<R>) => void): () => void
	close(): void
}
