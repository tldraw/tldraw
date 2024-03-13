import { SerializedSchema, UnknownRecord } from '@tldraw/store'
import { TLRoomSocket } from './TLSyncRoom'
import { TLSocketServerSentDataEvent } from './protocol'

export const RoomSessionState = {
	AwaitingConnectMessage: 'awaiting-connect-message',
	AwaitingRemoval: 'awaiting-removal',
	Connected: 'connected',
} as const

export type RoomSessionState = (typeof RoomSessionState)[keyof typeof RoomSessionState]

export const SESSION_START_WAIT_TIME = 10000
export const SESSION_REMOVAL_WAIT_TIME = 10000
export const SESSION_IDLE_TIMEOUT = 20000

export type RoomSession<R extends UnknownRecord> =
	| {
			state: typeof RoomSessionState.AwaitingConnectMessage
			sessionKey: string
			presenceId: string
			socket: TLRoomSocket<R>
			sessionStartTime: number
	  }
	| {
			state: typeof RoomSessionState.AwaitingRemoval
			sessionKey: string
			presenceId: string
			socket: TLRoomSocket<R>
			cancellationTime: number
	  }
	| {
			state: typeof RoomSessionState.Connected
			sessionKey: string
			presenceId: string
			socket: TLRoomSocket<R>
			serializedSchema: SerializedSchema
			lastInteractionTime: number
			debounceTimer: ReturnType<typeof setTimeout> | null
			outstandingDataMessages: TLSocketServerSentDataEvent<R>[]
	  }
