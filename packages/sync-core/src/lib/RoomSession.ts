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
export type RoomSession<R extends UnknownRecord, Meta> =
	| {
			state: typeof RoomSessionState.AwaitingConnectMessage
			sessionId: string
			presenceId: string | null
			socket: TLRoomSocket<R>
			sessionStartTime: number
			meta: Meta
			isReadonly: boolean
			requiresLegacyRejection: boolean
	  }
	| {
			state: typeof RoomSessionState.AwaitingRemoval
			sessionId: string
			presenceId: string | null
			socket: TLRoomSocket<R>
			cancellationTime: number
			meta: Meta
			isReadonly: boolean
			requiresLegacyRejection: boolean
	  }
	| {
			state: typeof RoomSessionState.Connected
			sessionId: string
			presenceId: string | null
			socket: TLRoomSocket<R>
			serializedSchema: SerializedSchema
			lastInteractionTime: number
			debounceTimer: ReturnType<typeof setTimeout> | null
			outstandingDataMessages: TLSocketServerSentDataEvent<R>[]
			meta: Meta
			isReadonly: boolean
			requiresLegacyRejection: boolean
	  }
