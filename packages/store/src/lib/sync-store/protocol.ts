import { UnknownRecord } from '../BaseRecord'
import { SerializedSchema } from '../StoreSchema'
import { NetworkDiff } from './diff'

/** @public */
export enum TLIncompatibilityReason {
	ClientTooOld = 'clientTooOld',
	ServerTooOld = 'serverTooOld',
	InvalidRecord = 'invalidRecord',
	InvalidOperation = 'invalidOperation',
}

export type GoingUpstreamMessage<R extends UnknownRecord> =
	| {
			type: 'push'
			diff: NetworkDiff<R>
			clock: number
	  }
	| {
			type: 'connect'
			spanId: string
			lastUpstreamClock: number
			protocolVersion: number
			schema: SerializedSchema
	  }

export type GoingDownstreamPatchMessage<R extends UnknownRecord> = {
	type: 'patch'
	diff: NetworkDiff<R>
	serverClock: number
	satisfiedPushIds?: string[]
}

export type GoingDownstreamMessage<R extends UnknownRecord> =
	| {
			type: 'connect'
			hydrationType: 'wipe_all' | 'wipe_presence'
			protocolVersion: number
			schema: SerializedSchema
			diff: NetworkDiff<R>
			upstreamClock: number
			spanId: string
	  }
	| {
			type: 'incompatibility_error'
			reason: TLIncompatibilityReason
	  }
	| GoingDownstreamPatchMessage<R>
	| {
			type: 'error'
			error?: any
	  }
	| {
			type: 'pong'
	  }

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
