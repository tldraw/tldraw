import { SerializedSchema, UnknownRecord } from '@tldraw/store'
import { TLRoomSocket } from './TLSyncRoom'
import { TLSocketServerSentDataEvent } from './protocol'

/**
 * Enumeration of possible states for a room session during its lifecycle.
 *
 * Room sessions progress through these states as clients connect, authenticate,
 * and disconnect from collaborative rooms.
 *
 * @internal
 */
export const RoomSessionState = {
	/** Session is waiting for the initial connect message from the client */
	AwaitingConnectMessage: 'awaiting-connect-message',
	/** Session is disconnected but waiting for final cleanup before removal */
	AwaitingRemoval: 'awaiting-removal',
	/** Session is fully connected and actively synchronizing */
	Connected: 'connected',
} as const

/**
 * Type representing the possible states a room session can be in.
 *
 * @example
 * ```ts
 * const sessionState: RoomSessionState = RoomSessionState.Connected
 * if (sessionState === RoomSessionState.AwaitingConnectMessage) {
 *   console.log('Session waiting for connect message')
 * }
 * ```
 *
 * @internal
 */
export type RoomSessionState = (typeof RoomSessionState)[keyof typeof RoomSessionState]

/**
 * Maximum time in milliseconds to wait for a connect message after socket connection.
 *
 * If a client connects but doesn't send a connect message within this time,
 * the session will be terminated.
 *
 * @public
 */
export const SESSION_START_WAIT_TIME = 10000

/**
 * Time in milliseconds to wait before completely removing a disconnected session.
 *
 * This grace period allows for quick reconnections without losing session state,
 * which is especially helpful for brief network interruptions.
 *
 * @public
 */
export const SESSION_REMOVAL_WAIT_TIME = 5000

/**
 * Maximum time in milliseconds a connected session can remain idle before cleanup.
 *
 * Sessions that don't receive any messages or interactions for this duration
 * may be considered for cleanup to free server resources.
 *
 * @public
 */
export const SESSION_IDLE_TIMEOUT = 20000

/**
 * Represents a client session within a collaborative room, tracking the connection
 * state, permissions, and synchronization details for a single user.
 *
 * Each session corresponds to one WebSocket connection and progresses through
 * different states during its lifecycle. The session type is a discriminated union
 * based on the current state, ensuring type safety when accessing state-specific properties.
 *
 * @example
 * ```ts
 * // Check session state and access appropriate properties
 * function handleSession(session: RoomSession<MyRecord, UserMeta>) {
 *   switch (session.state) {
 *     case RoomSessionState.AwaitingConnectMessage:
 *       console.log(`Session ${session.sessionId} started at ${session.sessionStartTime}`)
 *       break
 *     case RoomSessionState.Connected:
 *       console.log(`Connected session has ${session.outstandingDataMessages.length} pending messages`)
 *       break
 *     case RoomSessionState.AwaitingRemoval:
 *       console.log(`Session will be removed at ${session.cancellationTime}`)
 *       break
 *   }
 * }
 * ```
 *
 * @internal
 */
export type RoomSession<R extends UnknownRecord, Meta> =
	| {
			/** Current state of the session */
			state: typeof RoomSessionState.AwaitingConnectMessage
			/** Unique identifier for this session */
			sessionId: string
			/** Presence identifier for live cursor/selection tracking, if available */
			presenceId: string | null
			/** WebSocket connection wrapper for this session */
			socket: TLRoomSocket<R>
			/** Timestamp when the session was created */
			sessionStartTime: number
			/** Custom metadata associated with this session */
			meta: Meta
			/** Whether this session has read-only permissions */
			isReadonly: boolean
			/** Whether this session requires legacy protocol rejection handling */
			requiresLegacyRejection: boolean
	  }
	| {
			/** Current state of the session */
			state: typeof RoomSessionState.AwaitingRemoval
			/** Unique identifier for this session */
			sessionId: string
			/** Presence identifier for live cursor/selection tracking, if available */
			presenceId: string | null
			/** WebSocket connection wrapper for this session */
			socket: TLRoomSocket<R>
			/** Timestamp when the session was marked for removal */
			cancellationTime: number
			/** Custom metadata associated with this session */
			meta: Meta
			/** Whether this session has read-only permissions */
			isReadonly: boolean
			/** Whether this session requires legacy protocol rejection handling */
			requiresLegacyRejection: boolean
	  }
	| {
			/** Current state of the session */
			state: typeof RoomSessionState.Connected
			/** Unique identifier for this session */
			sessionId: string
			/** Presence identifier for live cursor/selection tracking, if available */
			presenceId: string | null
			/** WebSocket connection wrapper for this session */
			socket: TLRoomSocket<R>
			/** Serialized schema information for this connected session */
			serializedSchema: SerializedSchema
			/** Timestamp of the last interaction or message from this session */
			lastInteractionTime: number
			/** Timer for debouncing operations, if active */
			debounceTimer: ReturnType<typeof setTimeout> | null
			/** Queue of data messages waiting to be sent to this session */
			outstandingDataMessages: TLSocketServerSentDataEvent<R>[]
			/** Custom metadata associated with this session */
			meta: Meta
			/** Whether this session has read-only permissions */
			isReadonly: boolean
			/** Whether this session requires legacy protocol rejection handling */
			requiresLegacyRejection: boolean
	  }
