import { SerializedSchema, UnknownRecord } from '@tldraw/store'
import { TLRoomSocket } from './TLSyncRoom'

export enum RoomSessionState {
	AWAITING_CONNECT_MESSAGE = 'awaiting-connect-message',
	AWAITING_REMOVAL = 'awaiting-removal',
	CONNECTED = 'connected',
}

export const SESSION_START_WAIT_TIME = 10000
export const SESSION_REMOVAL_WAIT_TIME = 10000
export const SESSION_IDLE_TIMEOUT = 20000

export type RoomSession<R extends UnknownRecord> =
	| {
			state: RoomSessionState.AWAITING_CONNECT_MESSAGE
			sessionKey: string
			presenceId: string
			socket: TLRoomSocket<R>
			sessionStartTime: number
	  }
	| {
			state: RoomSessionState.AWAITING_REMOVAL
			sessionKey: string
			presenceId: string
			socket: TLRoomSocket<R>
			cancellationTime: number
	  }
	| {
			state: RoomSessionState.CONNECTED
			sessionKey: string
			presenceId: string
			socket: TLRoomSocket<R>
			serializedSchema: SerializedSchema
			lastInteractionTime: number
	  }
