import { RecordId, SerializedSchema, UnknownRecord } from '@tldraw/store'
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

export type RoomSession =
	| {
			state: typeof RoomSessionState.AwaitingConnectMessage
			sessionKey: string
			presenceId: RecordId<UnknownRecord>
			socket: TLRoomSocket
			sessionStartTime: number
	  }
	| {
			state: typeof RoomSessionState.AwaitingRemoval
			sessionKey: string
			presenceId: RecordId<UnknownRecord>
			socket: TLRoomSocket
			cancellationTime: number
	  }
	| {
			state: typeof RoomSessionState.Connected
			sessionKey: string
			presenceId: RecordId<UnknownRecord>
			socket: TLRoomSocket
			serializedSchema: SerializedSchema
			lastInteractionTime: number
			debounceTimer: ReturnType<typeof setTimeout> | null
			outstandingDataMessages: TLSocketServerSentDataEvent[]
	  }
