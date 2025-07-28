import { SerializedSchema, UnknownRecord } from '@tldraw/store'
import { TLRoomSocket } from './TLSyncRoom'
import { TLSocketServerSentDataEvent } from './protocol'

/** @internal */
export const RoomSessionState = {
	AwaitingConnectMessage: 'awaiting-connect-message',
	AwaitingRemoval: 'awaiting-removal',
	Connected: 'connected',
} as const

/** @internal */
export type RoomSessionState = (typeof RoomSessionState)[keyof typeof RoomSessionState]

export const SESSION_START_WAIT_TIME = 10000
export const SESSION_REMOVAL_WAIT_TIME = 5000
export const SESSION_IDLE_TIMEOUT = 20000

/** @internal */
export interface BaseRoomSession<R extends UnknownRecord, Meta> {
	sessionId: string
	presenceId: string | null
	socket: TLRoomSocket<R>
	meta: Meta
	isReadonly: boolean
	requiresLegacyRejection: boolean
	requiresLegacyUncompressedDiff: boolean
}

/** @internal */
export type RoomSession<R extends UnknownRecord, Meta> = BaseRoomSession<R, Meta> &
	(
		| {
				state: typeof RoomSessionState.AwaitingConnectMessage
				sessionStartTime: number
		  }
		| {
				state: typeof RoomSessionState.AwaitingRemoval
				cancellationTime: number
		  }
		| {
				state: typeof RoomSessionState.Connected
				serializedSchema: SerializedSchema
				lastInteractionTime: number
				debounceTimer: ReturnType<typeof setTimeout> | null
				outstandingDataMessages: TLSocketServerSentDataEvent<R>[]
		  }
	)
