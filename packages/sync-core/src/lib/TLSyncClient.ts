import { Atom, Signal, atom, react, transact } from '@tldraw/state'
import {
	RecordId,
	RecordsDiff,
	Store,
	UnknownRecord,
	createEmptyRecordsDiff,
	isRecordsDiffEmpty,
	reverseRecordsDiff,
	squashRecordDiffsMutable,
} from '@tldraw/store'
import {
	FpsScheduler,
	exhaustiveSwitchError,
	isEqual,
	objectMapEntries,
	uniqueId,
} from '@tldraw/utils'
import {
	TLCommandActor,
	TLCommandCall,
	TLCommandReader,
	TLCommandResult,
	TLCommandSet,
	TLCommandWrites,
	actorCan,
	canEditRecord,
	lookupOf,
	defaultActor,
	runCommand,
} from './commands'
import {
	NetworkDiff,
	ObjectDiff,
	RecordOpType,
	applyObjectDiff,
	diffRecord,
	getNetworkDiff,
} from './diff'
import { interval } from './interval'
import {
	TLObjectStoreAccess,
	TLPushRequest,
	TLSocketClientSentEvent,
	TLSocketServerSentDataEvent,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from './protocol'

/**
 * Function type for subscribing to events with a callback.
 * Returns an unsubscribe function to clean up the listener.
 *
 * @param cb - Callback function that receives the event value
 * @returns Function to call when you want to unsubscribe from the events
 *
 * @public
 */
export type SubscribingFn<T> = (cb: (val: T) => void) => () => void

/** Network sync frame rate when in solo mode (no collaborators) @internal */
const SOLO_MODE_FPS = 1

/** Network sync frame rate when in collaborative mode (with collaborators) @internal */
const COLLABORATIVE_MODE_FPS = 30

/**
 * WebSocket close code used by the server to signal a non-recoverable sync error.
 * This close code indicates that the connection is being terminated due to an error
 * that cannot be automatically recovered from, such as authentication failures,
 * incompatible client versions, or invalid data.
 *
 * @example
 * ```ts
 * // Server-side: Close connection with specific error reason
 * socket.close(TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason.NOT_FOUND)
 *
 * // Client-side: Handle the error in your sync error handler
 * const syncClient = new TLSyncClient({
 *   // ... other config
 *   onSyncError: (reason) => {
 *     console.error('Sync failed:', reason) // Will receive 'NOT_FOUND'
 *   }
 * })
 * ```
 *
 * @public
 */
export const TLSyncErrorCloseEventCode = 4099 as const

/**
 * Predefined reasons for server-initiated connection closures.
 * These constants represent different error conditions that can cause
 * the sync server to terminate a WebSocket connection.
 *
 * @example
 * ```ts
 * // Server usage
 * if (!user.hasPermission(roomId)) {
 *   socket.close(TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason.FORBIDDEN)
 * }
 *
 * // Client error handling
 * syncClient.onSyncError((reason) => {
 *   switch (reason) {
 *     case TLSyncErrorCloseEventReason.NOT_FOUND:
 *       showError('Room does not exist')
 *       break
 *     case TLSyncErrorCloseEventReason.FORBIDDEN:
 *       showError('Access denied')
 *       break
 *     case TLSyncErrorCloseEventReason.CLIENT_TOO_OLD:
 *       showError('Please update your app')
 *       break
 *   }
 * })
 * ```
 *
 * @public
 */
export const TLSyncErrorCloseEventReason = {
	/** Room or resource not found */
	NOT_FOUND: 'NOT_FOUND',
	/** User lacks permission to access the room */
	FORBIDDEN: 'FORBIDDEN',
	/** User authentication required or invalid */
	NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
	/** Unexpected server error occurred */
	UNKNOWN_ERROR: 'UNKNOWN_ERROR',
	/** Client protocol version too old */
	CLIENT_TOO_OLD: 'CLIENT_TOO_OLD',
	/** Server protocol version too old */
	SERVER_TOO_OLD: 'SERVER_TOO_OLD',
	/** Client sent invalid or corrupted record data */
	INVALID_RECORD: 'INVALID_RECORD',
	/** Client exceeded rate limits */
	RATE_LIMITED: 'RATE_LIMITED',
	/** Room has reached maximum capacity */
	ROOM_FULL: 'ROOM_FULL',
	/** A single message exceeded the size the server will assemble */
	MESSAGE_TOO_LARGE: 'MESSAGE_TOO_LARGE',
} as const

/**
 * @internal
 */
export class TLSyncError extends Error {
	constructor(
		message: string,
		public reason: TLSyncErrorCloseEventReason
	) {
		super(message)
	}
}
/**
 * Union type of all possible server connection close reasons.
 * Represents the string values that can be passed when a server closes
 * a sync connection due to an error condition.
 *
 * @public
 */
export type TLSyncErrorCloseEventReason =
	(typeof TLSyncErrorCloseEventReason)[keyof typeof TLSyncErrorCloseEventReason]

/**
 * Handler function for custom application messages sent through the sync protocol.
 * These are user-defined messages that can be sent between clients via the sync server,
 * separate from the standard document synchronization messages.
 *
 * @param data - Custom message payload (application-defined structure)
 *
 * @example
 * ```ts
 * const customMessageHandler: TLCustomMessageHandler = (data) => {
 *   if (data.type === 'user_joined') {
 *     console.log(`${data.username} joined the session`)
 *     showToast(`${data.username} is now collaborating`)
 *   }
 * }
 *
 * const syncClient = new TLSyncClient({
 *   // ... other config
 *   onCustomMessageReceived: customMessageHandler
 * })
 * ```
 *
 * @public
 */
export type TLCustomMessageHandler = (this: null, data: any) => void

/**
 * Event object describing changes in socket connection status.
 * Contains either a basic status change or an error with details.
 *
 * @public
 */
export type TLSocketStatusChangeEvent =
	| {
			/** Connection came online or went offline */
			status: 'online' | 'offline'
	  }
	| {
			/** Connection encountered an error */
			status: 'error'
			/** Description of the error that occurred */
			reason: string
	  }
/**
 * Callback function type for listening to socket status changes.
 *
 * @param params - Event object containing the new status and optional error details
 *
 * @internal
 */
export type TLSocketStatusListener = (params: TLSocketStatusChangeEvent) => void

/**
 * Possible connection states for a persistent client socket.
 * Represents the current connectivity status between client and server.
 *
 * @internal
 */
export type TLPersistentClientSocketStatus = 'online' | 'offline' | 'error'

/**
 * Mode for handling presence information in sync sessions.
 * Controls whether presence data (cursors, selections) is shared with other clients.
 *
 * @public
 */
export type TLPresenceMode =
	/** No presence sharing - client operates independently */
	| 'solo'
	/** Full presence sharing - cursors and selections visible to others */
	| 'full'
/**
 * Interface for persistent WebSocket-like connections used by TLSyncClient.
 * Handles automatic reconnection and provides event-based communication with the sync server.
 * Implementations should maintain connection resilience and handle network interruptions gracefully.
 *
 * @example
 * ```ts
 * class MySocketAdapter implements TLPersistentClientSocket {
 *   connectionStatus: 'offline' | 'online' | 'error' = 'offline'
 *
 *   sendMessage(msg: TLSocketClientSentEvent) {
 *     if (this.ws && this.ws.readyState === WebSocket.OPEN) {
 *       this.ws.send(JSON.stringify(msg))
 *     }
 *   }
 *
 *   onReceiveMessage = (callback) => {
 *     // Set up message listener and return cleanup function
 *   }
 *
 *   restart() {
 *     this.disconnect()
 *     this.connect()
 *   }
 * }
 * ```
 *
 * @public
 */
export interface TLPersistentClientSocket<
	ClientSentMessage extends object = object,
	ServerSentMessage extends object = object,
> {
	/** Current connection state - online means actively connected and ready */
	connectionStatus: 'online' | 'offline' | 'error'

	/**
	 * Send a protocol message to the sync server
	 * @param msg - Message to send (connect, push, ping, etc.)
	 */
	sendMessage(msg: ClientSentMessage): void

	/**
	 * Subscribe to messages received from the server
	 * @param callback - Function called for each received message
	 * @returns Cleanup function to remove the listener
	 */
	onReceiveMessage: SubscribingFn<ServerSentMessage>

	/**
	 * Subscribe to connection status changes
	 * @param callback - Function called when connection status changes
	 * @returns Cleanup function to remove the listener
	 */
	onStatusChange: SubscribingFn<TLSocketStatusChangeEvent>

	/**
	 * Force a connection restart (disconnect then reconnect)
	 * Used for error recovery or when connection health checks fail
	 */
	restart(): void

	/**
	 * Close the connection
	 */
	close(): void
}

const PING_INTERVAL = 5000
const MAX_TIME_TO_WAIT_FOR_SERVER_INTERACTION_BEFORE_RESETTING_CONNECTION = PING_INTERVAL * 2
/**
 * How long an unanswered ping may stay outstanding before the connection is considered dead.
 * Tuned together with MAX_TIME_TO_WAIT_FOR_SERVER_INTERACTION_BEFORE_RESETTING_CONNECTION:
 * a reset needs both stale interaction and a ping overdue by this much.
 */
const PONG_TIMEOUT = PING_INTERVAL * 2

// Should connect support chunking the response to allow for large payloads?

function getPresenceOp<R extends UnknownRecord>(
	lastPushedPresenceState: R | null,
	nextPresence: R | null
): [typeof RecordOpType.Patch, ObjectDiff] | [typeof RecordOpType.Put, R] | undefined {
	if (!lastPushedPresenceState && nextPresence) {
		return [RecordOpType.Put, nextPresence]
	}
	if (lastPushedPresenceState && nextPresence) {
		const diff = diffRecord(lastPushedPresenceState, nextPresence)
		if (!diff) return undefined
		return [RecordOpType.Patch, diff]
	}
	return undefined
}

/**
 * Main client-side synchronization engine for collaborative tldraw applications.
 *
 * TLSyncClient manages bidirectional synchronization between a local tldraw Store
 * and a remote sync server. It uses an optimistic update model where local changes
 * are immediately applied for responsive UI, then sent to the server for validation
 * and distribution to other clients.
 *
 * The synchronization follows a git-like push/pull/rebase model:
 * - **Push**: Local changes are sent to server as diff operations
 * - **Pull**: Server changes are received and applied locally
 * - **Rebase**: Conflicting changes are resolved by undoing local changes,
 *   applying server changes, then re-applying local changes on top
 *
 * @example
 * ```ts
 * import { TLSyncClient, ClientWebSocketAdapter } from '@tldraw/sync-core'
 * import { createTLStore } from '@tldraw/store'
 *
 * // Create store and socket
 * const store = createTLStore({ schema: mySchema })
 * const socket = new ClientWebSocketAdapter('ws://localhost:3000/sync')
 *
 * // Create sync client
 * const syncClient = new TLSyncClient({
 *   store,
 *   socket,
 *   presence: atom(null),
 *   onLoad: () => console.log('Connected and loaded'),
 *   onSyncError: (reason) => console.error('Sync failed:', reason)
 * })
 *
 * // Changes to store are now automatically synchronized
 * store.put([{ id: 'shape1', type: 'geo', x: 100, y: 100 }])
 * ```
 *
 * @example
 * ```ts
 * // Advanced usage with presence and custom messages
 * const syncClient = new TLSyncClient({
 *   store,
 *   socket,
 *   presence: atom({ cursor: { x: 0, y: 0 }, userName: 'Alice' }),
 *   presenceMode: atom('full'),
 *   onCustomMessageReceived: (data) => {
 *     if (data.type === 'chat') {
 *       showChatMessage(data.message, data.from)
 *     }
 *   },
 *   onAfterConnect: (client, { isReadonly }) => {
 *     if (isReadonly) {
 *       showNotification('Connected in read-only mode')
 *     }
 *   }
 * })
 * ```
 *
 * @public
 */
export class TLSyncClient<R extends UnknownRecord, S extends Store<R> = Store<R>> {
	/** The last clock time from the most recent server update */
	private lastServerClock = -1
	private lastServerInteractionTimestamp = Date.now()
	/**
	 * Send time of the oldest outstanding ping; answered iff `lastServerInteractionTimestamp >= it`
	 * (any server message counts). Null until the first ping after (re)connect.
	 */
	private firstUnansweredPingAt: number | null = null

	/** The queue of in-flight push requests that have not yet been acknowledged by the server */
	private pendingPushRequests: TLPushRequest<R>[] = []
	private unsentChanges: {
		nextDiff?: RecordsDiff<R>
		nextPresence?: R | null
	} = { nextDiff: undefined, nextPresence: undefined }

	/**
	 * The diff of 'unconfirmed', 'optimistic' changes that have been made locally by the user if we
	 * take this diff, reverse it, and apply that to the store, our store will match exactly the most
	 * recent state of the server that we know about
	 */
	private speculativeChanges: RecordsDiff<R> = {
		added: {} as any,
		updated: {} as any,
		removed: {} as any,
	}

	private disposables: Array<() => void> = []

	/** Separate scheduler instance for network sync operations */
	private readonly fpsScheduler: FpsScheduler

	/** Send any unsent push requests to the server */
	private readonly sendUnsentChanges: {
		(): void
		cancel?(): void
	}

	/** Schedule a rebase operation */
	private readonly scheduleRebase: {
		(): void
		cancel?(): void
	}

	/** @internal */
	readonly store: S
	/** @internal */
	readonly socket: TLPersistentClientSocket<TLSocketClientSentEvent<R>, TLSocketServerSentEvent<R>>

	/** @internal */
	readonly presenceState: Signal<R | null> | undefined
	/** @internal */
	readonly presenceMode: Signal<TLPresenceMode> | undefined

	// isOnline is true when we have an open socket connection and we have
	// established a connection with the server room (i.e. we have received a 'connect' message)
	/** @internal */
	isConnectedToRoom = false

	/**
	 * The client clock is essentially a counter for push requests Each time a push request is created
	 * the clock is incremented. This clock is sent with the push request to the server, and the
	 * server returns it with the response so that we can match up the response with the request.
	 *
	 * The clock may also be used at one point in the future to allow the client to re-send push
	 * requests idempotently (i.e. the server will keep track of each client's clock and not execute
	 * requests it has already handled), but at the time of writing this is neither needed nor
	 * implemented.
	 */
	private clientClock = 0

	/**
	 * Callback executed immediately after successful connection to sync room.
	 * Use this to perform any post-connection setup required for your application,
	 * such as initializing default content or updating UI state.
	 *
	 * @param self - The TLSyncClient instance that connected
	 * @param details - Connection details
	 *   - isReadonly - Whether the connection is in read-only mode
	 *   - objectAccess - Write access for object-store lane record types (defaults to 'write'
	 *     when the server doesn't send it, e.g. older servers or rooms with no object lane)
	 */
	private readonly onAfterConnect?: (
		self: this,
		details: { isReadonly: boolean; objectAccess: TLObjectStoreAccess }
	) => void

	private readonly onCustomMessageReceived?: TLCustomMessageHandler

	private readonly commands?: TLCommandSet<R>
	private readonly onPushRejected?: (details: { reason: string; command?: TLCommandCall }) => void
	private readonly onActorChange?: (details: { actor: TLCommandActor; isReadonly: boolean }) => void

	/**
	 * Who this client acts as, as the server last said. Before the first connect it has all
	 * permissions, so offline edits work.
	 */
	readonly actor: Atom<TLCommandActor> = atom('TLSyncClient.actor', defaultActor(false))

	private isDebugging = false
	private debug(...args: any[]) {
		if (this.isDebugging) {
			// eslint-disable-next-line no-console
			console.debug(...args)
		}
	}

	private readonly presenceType: R['typeName'] | null

	private didCancel?: () => boolean

	/**
	 * Creates a new TLSyncClient instance to manage synchronization with a remote server.
	 *
	 * @param config - Configuration object for the sync client
	 *   - store - The local tldraw store to synchronize
	 *   - socket - WebSocket adapter for server communication
	 *   - presence - Reactive signal containing current user's presence data
	 *   - presenceMode - Optional signal controlling presence sharing (defaults to 'full')
	 *   - onLoad - Callback fired when initial sync completes successfully
	 *   - onSyncError - Callback fired when sync fails with error reason
	 *   - onCustomMessageReceived - Optional handler for custom messages
	 *   - onAfterConnect - Optional callback fired after successful connection
	 *   - self - The TLSyncClient instance
	 *   - details - Connection details including readonly status
	 *   - didCancel - Optional function to check if sync should be cancelled
	 */
	constructor(config: {
		store: S
		socket: TLPersistentClientSocket<any, any>
		presence: Signal<R | null>
		presenceMode?: Signal<TLPresenceMode>
		onLoad(self: TLSyncClient<R, S>): void
		onSyncError(reason: string): void
		onCustomMessageReceived?: TLCustomMessageHandler
		onAfterConnect?(
			self: TLSyncClient<R, S>,
			details: { isReadonly: boolean; objectAccess: TLObjectStoreAccess }
		): void
		/** The room's commands and edit policy: the same set the server uses. */
		commands?: TLCommandSet<R>
		/** The server discarded a push, or a command was denied locally. */
		onPushRejected?(details: { reason: string; command?: TLCommandCall }): void
		/** The actor changed: at connect, or live when the host changed it. */
		onActorChange?(details: { actor: TLCommandActor; isReadonly: boolean }): void
		didCancel?(): boolean
	}) {
		this.didCancel = config.didCancel
		this.commands = config.commands
		this.onPushRejected = config.onPushRejected
		this.onActorChange = config.onActorChange

		this.presenceType = config.store.scopedTypes.presence.values().next().value ?? null

		// Create a separate throttle instance for network sync operations
		// This ensures sync operations have their own queue separate from UI operations
		this.fpsScheduler = new FpsScheduler(COLLABORATIVE_MODE_FPS)

		// Initialize throttled methods after throttle instance is created
		this.sendUnsentChanges = this.fpsScheduler.fpsThrottle(() => this.flushUnsentChanges())

		this.scheduleRebase = this.fpsScheduler.fpsThrottle(this.rebase)

		if (typeof window !== 'undefined') {
			;(window as any).tlsync = this
		}
		this.store = config.store
		this.socket = config.socket
		this.onAfterConnect = config.onAfterConnect
		this.onCustomMessageReceived = config.onCustomMessageReceived

		let didLoad = false

		this.presenceState = config.presence
		this.presenceMode = config.presenceMode

		if (this.commands) this.registerEditGuard(this.commands)

		this.disposables.push(
			// when local 'user' changes are made, send them to the server
			// or stash them locally in offline mode
			this.store.listen(
				({ changes }) => {
					if (this.didCancel?.()) return this.close()
					this.debug('received store changes', { changes })
					if (this.applyingCommand) {
						// a command's own writes: on the undo stack, but sent as the command
						squashRecordDiffsMutable(this.speculativeChanges, [changes])
						return
					}
					this.push(this.sendUndoAsCommands(changes))
				},
				{ source: 'user', scope: 'document' }
			),
			// when the server sends us events, handle them
			this.socket.onReceiveMessage((msg) => {
				if (this.didCancel?.()) return this.close()
				this.debug('received message from server', msg)
				this.handleServerEvent(msg)
				// the first time we receive a message from the server, we should trigger

				// one of the load callbacks
				if (!didLoad) {
					didLoad = true
					config.onLoad(this)
				}
			}),
			// handle switching between online and offline
			this.socket.onStatusChange((ev) => {
				if (this.didCancel?.()) return this.close()
				this.debug('socket status changed', ev.status)
				if (ev.status === 'online') {
					this.sendConnectMessage()
				} else {
					this.resetConnection()
					if (ev.status === 'error') {
						didLoad = true
						config.onSyncError(ev.reason)
						this.close()
					}
				}
			}),
			// Send a ping every PING_INTERVAL ms while online
			interval(() => {
				if (this.didCancel?.()) return this.close()
				this.debug('ping loop', { isConnectedToRoom: this.isConnectedToRoom })
				if (!this.isConnectedToRoom) return
				try {
					// advance the marker only when the previous ping was answered: a half-open socket
					// that accepts sends but returns nothing must not keep refreshing its own alibi
					if (
						this.firstUnansweredPingAt === null ||
						this.lastServerInteractionTimestamp >= this.firstUnansweredPingAt
					) {
						this.firstUnansweredPingAt = Date.now()
					}
					this.socket.sendMessage({ type: 'ping' })
				} catch (error) {
					console.warn('ping failed, resetting', error)
					this.resetConnection()
				}
			}, PING_INTERVAL),
			// Check the server connection health, reset the connection if needed
			interval(() => {
				if (this.didCancel?.()) return this.close()
				this.debug('health check loop', { isConnectedToRoom: this.isConnectedToRoom })
				if (!this.isConnectedToRoom) return
				const timeSinceLastServerInteraction = Date.now() - this.lastServerInteractionTimestamp

				if (
					timeSinceLastServerInteraction <
					MAX_TIME_TO_WAIT_FOR_SERVER_INTERACTION_BEFORE_RESETTING_CONNECTION
				) {
					this.debug('health check passed', { timeSinceLastServerInteraction })
					return
				}

				// Silence alone is not evidence of a dead socket: in a throttled hidden tab our own ping
				// loop stops, so the server had nothing to answer. Only reset on an unanswered ping.
				const firstUnansweredPingAt = this.firstUnansweredPingAt
				const pingOverdue =
					firstUnansweredPingAt !== null &&
					this.lastServerInteractionTimestamp < firstUnansweredPingAt &&
					Date.now() - firstUnansweredPingAt >= PONG_TIMEOUT
				if (!pingOverdue) {
					this.debug('health check stale but no overdue ping', { timeSinceLastServerInteraction })
					return
				}

				// A frozen tab can deliver a queued pong only after these catch-up ticks run, so one
				// spurious reset on unfreeze is still possible — rare, and the reconnect is clean.
				console.warn(`Haven't heard from the server in a while, resetting connection...`, {
					timeSinceLastServerInteraction,
					pingOutstandingMs: Date.now() - firstUnansweredPingAt!,
				})
				this.resetConnection()
			}, PING_INTERVAL * 2)
		)

		if (this.presenceState) {
			this.disposables.push(
				react('pushPresence', () => {
					if (this.didCancel?.()) return this.close()
					const mode = this.presenceMode?.get()
					this.fpsScheduler.updateTargetFps(this.getSyncFps())
					if (mode !== 'full') return
					this.pushPresence(this.presenceState!.get())
				})
			)
		}

		// if the socket is already online before this client was instantiated
		// then we should send a connect message right away
		if (this.socket.connectionStatus === 'online') {
			this.sendConnectMessage()
		}
	}

	private flushUnsentChanges() {
		this.debug('sending unsent changes', {
			isConnectedToRoom: this.isConnectedToRoom,
			unsentChanges: this.unsentChanges,
		})
		if (!this.isConnectedToRoom || this.store.isPossiblyCorrupted()) {
			return
		}
		if (!this.unsentChanges.nextDiff && !this.unsentChanges.nextPresence) {
			return
		}
		const diff = this.unsentChanges.nextDiff
			? (getNetworkDiff(this.unsentChanges.nextDiff) ?? undefined)
			: undefined
		const presence = this.unsentChanges.nextPresence
			? getPresenceOp<R>(this.lastPushedPresenceState, this.unsentChanges.nextPresence)
			: undefined

		if (!diff && !presence) {
			return
		}

		const pushRequest: TLPushRequest<R> = {
			type: 'push',
			clientClock: this.clientClock,
			diff,
			presence,
		}

		this.debug('sending push request', pushRequest)
		this.socket.sendMessage(pushRequest)

		if (this.unsentChanges.nextPresence) {
			this.lastPushedPresenceState = this.unsentChanges.nextPresence
		}
		this.clientClock++
		this.pendingPushRequests.push(pushRequest)
		this.unsentChanges.nextDiff = undefined
		this.unsentChanges.nextPresence = undefined
	}

	private commandReader(): TLCommandReader<R> {
		return {
			get: (id) => this.store.get(id as RecordId<R>),
			values: () => this.store.allRecords(),
		}
	}

	private applyCommandWrites(writes: TLCommandWrites<R>) {
		if (writes.puts.length) this.store.put(writes.puts)
		if (writes.deletes.length) this.store.remove(writes.deletes as RecordId<R>[])
	}

	/**
	 * Run a named command. It applies at once on this client (optimistically), and the server runs
	 * it again with the trusted actor. If the server's result differs, this client rebases onto it.
	 *
	 * A denied command writes nothing and returns the reason. A command the server later denies is
	 * rolled back, and `onPushRejected` is called.
	 *
	 * A command that returns an inverse goes on the undo stack, and undo sends the inverse.
	 *
	 * @param name - The command's name
	 * @param args - JSON args. Pass new ids here, so the client and server create the same records.
	 */
	runCommand(name: string, args: unknown): TLCommandResult<R> {
		if (!this.commands) throw new Error('This sync client has no commands')
		const call: TLCommandCall = { name, args }
		// Send edits made before this command first, so the server sees them in order.
		this.store._flushHistory()
		this.flushUnsentChanges()

		const result = runCommand(this.commands, this.commandReader(), this.actor.get(), call)
		if (!result.ok) {
			this.onPushRejected?.({ reason: result.reason, command: call })
			return result
		}
		if (result.inverse) {
			// Apply as a user change, so the editor's undo stack holds it. The store listener sees
			// `applyingCommand` and does not send the writes as a raw diff.
			this.applyingCommand = true
			try {
				const changes = this.store.extractingChanges(() => this.applyCommandWrites(result.writes))
				this.store._flushHistory()
				this.rememberUndo(result.inverse, changes)
			} finally {
				this.applyingCommand = false
			}
		} else {
			this.store.mergeRemoteChanges(() => {
				const changes = this.store.extractingChanges(() => this.applyCommandWrites(result.writes))
				squashRecordDiffsMutable(this.speculativeChanges, [changes])
			})
		}
		this.sendCommand(call)
		return result
	}

	private sendCommand(call: TLCommandCall, commandId = uniqueId()) {
		// keep the order: offline edits so far, then this command
		if (!this.isConnectedToRoom && this.offlineChanges) {
			this.replay.push(...this.takeOfflineChanges())
		}
		const pushRequest: TLPushRequest<R> = {
			type: 'push',
			clientClock: this.clientClock++,
			command: call,
			commandId,
		}
		if (!this.isConnectedToRoom) {
			// offline: it applied locally; it goes to the server on reconnect
			this.replay.push(pushRequest)
			return
		}
		this.socket.sendMessage(pushRequest)
		this.pendingPushRequests.push(pushRequest)
	}

	/**
	 * Pushes the server has not answered, and offline work, in order. A reconnect replays them:
	 * edits as diffs, commands as commands with their ids, so the server does not apply a command
	 * twice and the edit policy never sees a command's records as raw edits.
	 */
	private replay: TLPushRequest<R>[] = []
	/** Edits made while offline, since the last offline command. */
	private offlineChanges: RecordsDiff<R> | null = null

	private takeOfflineChanges(): TLPushRequest<R>[] {
		const diff = this.offlineChanges && getNetworkDiff(this.offlineChanges)
		this.offlineChanges = null
		return diff ? [{ type: 'push', clientClock: -1, diff }] : []
	}

	private applyingCommand = false
	/**
	 * Commands on the undo stack, newest last. Each holds the call that reverses it, and the
	 * records it changed, before and after.
	 */
	private undoable: {
		inverse: TLCommandCall
		before: Map<string, R | undefined>
		after: Map<string, R | undefined>
	}[] = []

	private rememberUndo(inverse: TLCommandCall, changes: RecordsDiff<R>) {
		const before = new Map<string, R | undefined>()
		const after = new Map<string, R | undefined>()
		// Only synced records: the editor's own reactions to a command (a deleted page's camera)
		// are not in the undo history the same way.
		const synced = (record: R) => this.store.scopedTypes.document.has(record.typeName)
		for (const [id, record] of objectMapEntries(changes.added)) {
			if (!synced(record)) continue
			before.set(id, undefined)
			after.set(id, record)
		}
		for (const [id, [from, to]] of objectMapEntries(changes.updated)) {
			if (!synced(to)) continue
			before.set(id, from)
			after.set(id, to)
		}
		for (const [id, record] of objectMapEntries(changes.removed)) {
			if (!synced(record)) continue
			before.set(id, record)
			after.set(id, undefined)
		}
		if (before.size === 0) return
		this.undoable.push({ inverse, before, after })
		if (this.undoable.length > 100) this.undoable.shift()
	}

	/** Whether a record change takes a command's record back to its state before or after it. */
	private isUndoStep(id: string, value: R | undefined) {
		return this.undoable.some(
			(e) =>
				e.before.has(id) && (isEqual(e.before.get(id), value) || isEqual(e.after.get(id), value))
		)
	}

	/**
	 * Undo and redo replay record diffs. When a diff takes all of a command's records back to their
	 * state before the command, send the command's inverse instead of the raw records, so the
	 * server authorizes the undo like any other command. Returns the rest of the diff.
	 */
	private sendUndoAsCommands(changes: RecordsDiff<R>): RecordsDiff<R> {
		if (!this.commands || this.undoable.length === 0) return changes
		const valueAfter = (id: string): [boolean, R | undefined] => {
			if (id in changes.added) return [true, (changes.added as any)[id]]
			if (id in changes.updated) return [true, (changes.updated as any)[id][1]]
			if (id in changes.removed) return [true, undefined]
			return [false, undefined]
		}
		let rest = changes
		for (let i = this.undoable.length - 1; i >= 0; i--) {
			const entry = this.undoable[i]
			const matches = [...entry.before].every(([id, value]) => {
				const [touched, next] = valueAfter(id)
				return touched && isEqual(next, value)
			})
			if (!matches) continue
			// The step is applied locally already; the server runs the inverse. Run it here too,
			// on the state before the step, only to learn its own inverse for the next redo.
			const reader: TLCommandReader<R> = {
				get: (id) =>
					entry.after.has(id) ? entry.after.get(id) : this.store.get(id as RecordId<R>),
				values: () => this.store.allRecords(),
			}
			const next = runCommand(this.commands, reader, this.actor.get(), entry.inverse)
			// The same step may hold raw edits to the command's records, such as a drag of a shape
			// that was also voted on. The inverse undoes only the command's part, so the rest goes as
			// a raw edit after it: from what the inverse leaves on the server to the undo target.
			const fixups = createEmptyRecordsDiff<R>()
			const preUndo = (id: string): R | undefined => {
				if (id in changes.updated) return (changes.updated as any)[id][0]
				if (id in changes.removed) return (changes.removed as any)[id]
				if (id in changes.added) return undefined
				return this.store.get(id as RecordId<R>)
			}
			const onServer = runCommand(
				this.commands,
				{ get: preUndo, values: () => this.store.allRecords() },
				this.actor.get(),
				entry.inverse
			)
			if (onServer.ok) {
				const puts = new Map(onServer.writes.puts.map((r) => [r.id as string, r]))
				const deletes = new Set(onServer.writes.deletes)
				for (const id of entry.before.keys()) {
					// untouched since the command: the inverse alone is the undo
					if (isEqual(preUndo(id), entry.after.get(id))) continue
					const left = deletes.has(id) ? undefined : (puts.get(id) ?? preUndo(id))
					const target = valueAfter(id)[1]
					if (isEqual(left, target)) continue
					// a fixup is a raw edit; one the edit lane forbids (a command-only record that the
					// server's run made differ, e.g. by its own clock) is the inverse's job alone
					const op = left && target ? 'update' : target ? 'create' : 'delete'
					if (!this.canEdit(op, left ?? null, target ?? null)) continue
					if (left && target) (fixups.updated as any)[id] = [left, target]
					else if (target) (fixups.added as any)[id] = target
					else if (left) (fixups.removed as any)[id] = left
				}
			}
			this.undoable.splice(i, 1)
			if (next.ok && next.inverse) {
				this.undoable.splice(i, 0, {
					inverse: next.inverse,
					before: entry.after,
					after: entry.before,
				})
			}
			const matched = createEmptyRecordsDiff<R>()
			const remaining = createEmptyRecordsDiff<R>()
			for (const kind of ['added', 'updated', 'removed'] as const) {
				for (const [id, value] of objectMapEntries(rest[kind] as Record<string, any>)) {
					;((entry.before.has(id) ? matched : remaining)[kind] as any)[id] = value
				}
			}
			squashRecordDiffsMutable(this.speculativeChanges, [matched])
			this.push(remaining)
			this.flushUnsentChanges()
			this.sendCommand(entry.inverse)
			if (!isRecordsDiffEmpty(fixups)) {
				this.push(fixups)
				this.flushUnsentChanges()
			}
			rest = createEmptyRecordsDiff<R>()
		}
		return rest
	}

	/** Whether this client's actor has a permission, reactively. */
	can(permission: string): boolean {
		return actorCan(this.actor.get(), permission)
	}

	private storeLookup() {
		return lookupOf<R>({
			get: (id) => this.store.get(id as RecordId<R>),
			values: () => this.store.allRecords(),
		})
	}

	/** Whether this client may make a record change on the edit lane, reactively. */
	canEdit(op: 'create' | 'update' | 'delete', prev: R | null, next: R | null): boolean {
		if (!this.commands) return true
		// the client checks each record as it changes, so the store is the state before and after
		const records = this.storeLookup()
		return canEditRecord(this.commands, this.actor.get(), {
			op,
			prev,
			next,
			...records,
			before: records,
			isClient: true,
		})
	}

	/**
	 * Block user edits that the edit policy denies before they reach the store, so they never
	 * flash and roll back. The server checks again; this guard is only for the feel.
	 */
	private registerEditGuard(set: TLCommandSet<R>) {
		const { sideEffects } = this.store
		let removingDenied = false
		for (const typeName of this.store.scopedTypes.document) {
			this.disposables.push(
				sideEffects.registerBeforeCreateHandler(typeName, (record, source) => {
					if (source !== 'user' || this.applyingCommand || !set.edit.stamp) return record
					// an undo brings back a record as it was, owner and all
					if (this.isUndoStep(record.id, record)) return record
					return set.edit.stamp(this.actor.get(), record, this.storeLookup())
				}),
				// A before-create handler cannot veto, so remove a denied record right after. The
				// create and the remove squash to nothing, so nothing is sent.
				sideEffects.registerAfterCreateHandler(typeName, (record, source) => {
					if (source !== 'user' || this.applyingCommand || this.isUndoStep(record.id, record))
						return
					if (this.canEdit('create', null, record)) return
					removingDenied = true
					try {
						this.store.remove([record.id])
					} finally {
						removingDenied = false
					}
					this.onPushRejected?.({ reason: `edit denied: create ${record.typeName}` })
				}),
				sideEffects.registerBeforeChangeHandler(typeName, (prev, next, source) => {
					if (source !== 'user' || this.applyingCommand || this.isUndoStep(next.id, next))
						return next
					if (this.canEdit('update', prev, next)) return next
					return prev
				}),
				sideEffects.registerBeforeDeleteHandler(typeName, (record, source) => {
					if (source !== 'user' || removingDenied || this.applyingCommand) return
					if (this.isUndoStep(record.id, undefined) || this.canEdit('delete', record, null)) return
					return false
				})
			)
		}
	}

	/** @internal */
	latestConnectRequestId: string | null = null

	/**
	 * This is the first message that is sent over a newly established socket connection. And we need
	 * to wait for the response before this client can be used.
	 */
	private sendConnectMessage() {
		if (this.isConnectedToRoom) {
			console.error('sendConnectMessage called while already connected')
			return
		}
		this.debug('sending connect message')
		this.latestConnectRequestId = uniqueId()
		this.socket.sendMessage({
			type: 'connect',
			connectRequestId: this.latestConnectRequestId,
			schema: this.store.schema.serialize(),
			protocolVersion: getTlsyncProtocolVersion(),
			lastServerClock: this.lastServerClock,
		})
	}

	/** Apply and send the unanswered and offline work again, in order, on the server's state. */
	private replayAfterReconnect(set: TLCommandSet<R>) {
		const replay = [...this.replay, ...this.takeOfflineChanges()]
		this.replay = []
		for (const request of replay) {
			if (request.command) {
				const result = runCommand(set, this.commandReader(), this.actor.get(), request.command)
				if (result.ok) {
					const changes = this.store.extractingChanges(() => this.applyCommandWrites(result.writes))
					squashRecordDiffsMutable(this.speculativeChanges, [changes])
				}
				// sent even if denied here, so the server answers and the client reports it
				this.sendCommand(request.command, request.commandId)
				continue
			}
			if (!request.diff) continue
			const changes = this.store.filterChangesByScope(
				this.store.extractingChanges(() => this.applyNetworkDiff(request.diff!, true)),
				'document'
			)
			if (!changes) continue
			this.push(changes)
			this.flushUnsentChanges()
		}
	}

	/** Switch to offline mode */
	private resetConnection(hard = false) {
		this.debug('resetting connection')
		if (hard) {
			this.lastServerClock = 0
		}
		// kill all presence state
		const keys = Object.keys(this.store.serialize('presence')) as any
		if (keys.length > 0) {
			this.store.mergeRemoteChanges(() => {
				this.store.remove(keys)
			})
		}
		this.lastPushedPresenceState = null
		this.isConnectedToRoom = false
		this.firstUnansweredPingAt = null
		if (this.commands) {
			this.replay.push(...this.pendingPushRequests)
			const unsent = this.unsentChanges.nextDiff && getNetworkDiff(this.unsentChanges.nextDiff)
			if (unsent) this.replay.push({ type: 'push', clientClock: -1, diff: unsent })
		}
		this.pendingPushRequests = []
		this.incomingDiffBuffer = []
		this.unsentChanges.nextDiff = undefined
		this.unsentChanges.nextPresence = undefined
		if (this.socket.connectionStatus === 'online') {
			this.socket.restart()
		}
	}

	/**
	 * Invoked when the socket connection comes online, either for the first time or as the result of
	 * a reconnect. The goal is to rebase on the server's state and fire off a new push request for
	 * any local changes that were made while offline.
	 */
	private didReconnect(event: Extract<TLSocketServerSentEvent<R>, { type: 'connect' }>) {
		this.debug('did reconnect', event)
		if (event.connectRequestId !== this.latestConnectRequestId) {
			// ignore connect events for old connect requests
			return
		}
		this.latestConnectRequestId = null

		if (this.isConnectedToRoom) {
			console.error('didReconnect called while already connected')
			this.resetConnection(true)
			return
		}
		if (this.pendingPushRequests.length > 0) {
			console.error('pendingPushRequests should already be empty when we reconnect')
			this.resetConnection(true)
			return
		}
		// Local changes reach `push` (and so `speculativeChanges`) on the store's frame-throttled
		// history flush. Anything still queued there would be neither reverted below nor
		// re-applied on top of the server state, so bring speculativeChanges up to date first.
		try {
			this.store._flushHistory()
		} catch (e) {
			console.error(e)
		}

		// at the end of this process we want to have at most one pending push request
		// based on anything inside this.speculativeChanges
		transact(() => {
			// Now our goal is to rebase on the server's state.
			// This means wiping away any peer presence data, which the server will replace in full on every connect.
			// If the server does not have enough history to give us a partial document state hydration we will
			// also need to wipe away all of our document state before hydrating with the server's state from scratch.
			const stashedChanges = this.speculativeChanges
			this.speculativeChanges = { added: {} as any, updated: {} as any, removed: {} as any }

			this.store.mergeRemoteChanges(() => {
				// gather records to delete in a NetworkDiff
				const wipeDiff: NetworkDiff<R> = {}
				const wipeAll = event.hydrationType === 'wipe_all'
				if (!wipeAll) {
					// if we're only wiping presence data, undo the speculative changes first
					this.store.applyDiff(reverseRecordsDiff(stashedChanges), { runCallbacks: false })
				}

				// now wipe all presence data and, if needed, all document data
				for (const [id, record] of objectMapEntries(this.store.serialize('all'))) {
					if (
						(wipeAll && this.store.scopedTypes.document.has(record.typeName)) ||
						record.typeName === this.presenceType
					) {
						wipeDiff[id] = [RecordOpType.Remove]
					}
				}

				// then apply the upstream changes
				this.applyNetworkDiff({ ...wipeDiff, ...event.diff }, true)

				this.isConnectedToRoom = true

				if (this.commands) {
					this.replayAfterReconnect(this.commands)
					return
				}

				// now re-apply the speculative changes creating a new push request with the
				// appropriate diff
				const networkDiff = getNetworkDiff(stashedChanges)
				if (!networkDiff) return
				const speculativeChanges = this.store.filterChangesByScope(
					this.store.extractingChanges(() => {
						this.applyNetworkDiff(networkDiff, true)
					}),
					'document'
				)
				if (speculativeChanges) this.push(speculativeChanges)
			})

			// this.isConnectedToRoom = true
			// this.store.applyDiff(stashedChanges, false)

			const actor = event.actor ?? defaultActor(event.isReadonly)
			this.actor.set(actor)
			this.onActorChange?.({ actor, isReadonly: event.isReadonly })
			this.onAfterConnect?.(this, {
				isReadonly: event.isReadonly,
				objectAccess: event.objectAccess ?? 'write',
			})
			const presence = this.presenceState?.get()
			if (presence) {
				this.pushPresence(presence)
			}
		})

		this.lastServerClock = event.serverClock
	}

	private incomingDiffBuffer: TLSocketServerSentDataEvent<R>[] = []

	/** Handle events received from the server */
	private handleServerEvent(event: TLSocketServerSentEvent<R>) {
		this.debug('received server event', event)
		this.lastServerInteractionTimestamp = Date.now()
		// always update the lastServerClock when it is present
		switch (event.type) {
			case 'connect':
				this.didReconnect(event)
				break
			// legacy v4 events
			case 'patch':
			case 'push_result':
				if (!this.isConnectedToRoom) break
				this.incomingDiffBuffer.push(event)
				this.scheduleRebase()
				break
			case 'data':
				// wait for a connect to succeed before processing more events
				if (!this.isConnectedToRoom) break
				this.incomingDiffBuffer.push(...event.data)
				this.scheduleRebase()
				break
			case 'incompatibility_error':
				// legacy unrecoverable errors
				console.error('incompatibility error is legacy and should no longer be sent by the server')
				break
			case 'pong':
				// noop, we only use ping/pong to set lastSeverInteractionTimestamp
				break
			case 'actor':
				this.actor.set(event.actor)
				this.onActorChange?.({ actor: event.actor, isReadonly: event.isReadonly })
				break
			case 'custom':
				this.onCustomMessageReceived?.call(null, event.data)
				break

			default:
				exhaustiveSwitchError(event)
		}
	}

	/**
	 * Closes the sync client and cleans up all resources.
	 *
	 * Call this method when you no longer need the sync client to prevent
	 * memory leaks and close the WebSocket connection. After calling close(),
	 * the client cannot be reused.
	 *
	 * @example
	 * ```ts
	 * // Clean shutdown
	 * syncClient.close()
	 * ```
	 */
	close() {
		this.debug('closing')
		this.disposables.forEach((dispose) => dispose())
		this.sendUnsentChanges.cancel?.()
		this.scheduleRebase.cancel?.()
		if (typeof window !== 'undefined' && (window as any).tlsync === this) {
			delete (window as any).tlsync
		}
	}

	private lastPushedPresenceState: R | null = null

	private pushPresence(nextPresence: R | null) {
		// make sure we push any document changes first
		this.store._flushHistory()

		if (!this.isConnectedToRoom) {
			// if we're offline, don't do anything
			return
		}

		this.unsentChanges.nextPresence = nextPresence
		this.sendUnsentChanges()
	}

	/** Push a change to the server, or stash it locally if we're offline */
	private push(change: RecordsDiff<any>) {
		this.debug('push', change)
		squashRecordDiffsMutable(this.speculativeChanges, [change])
		// in offline mode, we only accumulate in speculativeChanges
		if (!this.isConnectedToRoom) {
			if (this.commands) {
				this.offlineChanges ??= createEmptyRecordsDiff<R>()
				squashRecordDiffsMutable(this.offlineChanges, [change])
			}
			return
		}
		if (!this.unsentChanges.nextDiff) {
			this.unsentChanges.nextDiff = { added: {} as any, updated: {} as any, removed: {} as any }
		}
		// records are immutable, so sharing their references with `change` is fine — the
		// squash gives nextDiff its own containers and tuples without deep-cloning records
		squashRecordDiffsMutable(this.unsentChanges.nextDiff, [change])
		this.sendUnsentChanges()
	}

	/** Get the target FPS for network operations based on presence mode */
	private getSyncFps(): number {
		return this.presenceMode?.get() === 'solo' ? SOLO_MODE_FPS : COLLABORATIVE_MODE_FPS
	}

	/**
	 * Applies a 'network' diff to the store this does value-based equality checking so that if the
	 * data is the same (as opposed to merely identical with ===), then no change is made and no
	 * changes will be propagated back to store listeners
	 */
	private applyNetworkDiff(diff: NetworkDiff<R>, runCallbacks: boolean) {
		this.debug('applyNetworkDiff', diff)
		const changes: RecordsDiff<R> = { added: {} as any, updated: {} as any, removed: {} as any }
		type k = keyof typeof changes.updated
		let hasChanges = false
		for (const [id, op] of objectMapEntries(diff)) {
			if (op[0] === RecordOpType.Put) {
				const existing = this.store.get(id as RecordId<any>)
				if (existing && !isEqual(existing, op[1])) {
					hasChanges = true
					changes.updated[id as k] = [existing, op[1]]
				} else {
					hasChanges = true
					changes.added[id as k] = op[1]
				}
			} else if (op[0] === RecordOpType.Patch) {
				const record = this.store.get(id as RecordId<any>)
				if (!record) {
					// the record was removed upstream
					continue
				}
				const patched = applyObjectDiff(record, op[1])
				hasChanges = true
				changes.updated[id as k] = [record, patched]
			} else if (op[0] === RecordOpType.Remove) {
				if (this.store.has(id as RecordId<any>)) {
					hasChanges = true
					changes.removed[id as k] = this.store.get(id as RecordId<any>)
				}
			}
		}
		if (hasChanges) {
			this.store.applyDiff(changes, { runCallbacks })
		}
	}

	// eslint-disable-next-line tldraw/prefer-class-methods
	private rebase = () => {
		// need to make sure that our speculative changes are in sync with the actual store instance before
		// proceeding, to avoid inconsistency bugs.
		this.store._flushHistory()
		if (this.incomingDiffBuffer.length === 0) return

		const diffs = this.incomingDiffBuffer
		this.incomingDiffBuffer = []

		try {
			this.store.mergeRemoteChanges(() => {
				// first undo speculative changes
				this.store.applyDiff(reverseRecordsDiff(this.speculativeChanges), { runCallbacks: false })

				// then apply network diffs on top of known-to-be-synced data
				for (const diff of diffs) {
					if (diff.type === 'patch') {
						this.applyNetworkDiff(diff.diff, true)
						continue
					}
					// handling push_result
					if (this.pendingPushRequests.length === 0) {
						throw new Error('Received push_result but there are no pending push requests')
					}
					if (this.pendingPushRequests[0].clientClock !== diff.clientClock) {
						throw new Error(
							'Received push_result for a push request that is not at the front of the queue'
						)
					}
					if (diff.action === 'discard') {
						const request = this.pendingPushRequests.shift()!
						if (diff.reason) {
							this.onPushRejected?.({ reason: diff.reason, command: request.command })
						}
					} else if (diff.action === 'commit') {
						const request = this.pendingPushRequests.shift()!
						if ('diff' in request && request.diff) {
							this.applyNetworkDiff(request.diff, true)
						}
					} else {
						this.applyNetworkDiff(diff.action.rebaseWithDiff, true)
						this.pendingPushRequests.shift()
					}
				}
				// update the speculative diff while re-applying pending changes
				try {
					this.speculativeChanges = this.store.extractingChanges(() => {
						for (const request of this.pendingPushRequests) {
							if (request.command && this.commands) {
								// Run the command again on the new state. If it is denied now, the
								// server will deny it too, so drop its effects.
								const result = runCommand(
									this.commands,
									this.commandReader(),
									this.actor.get(),
									request.command
								)
								if (result.ok) this.applyCommandWrites(result.writes)
								continue
							}
							if (!request.diff) continue
							this.applyNetworkDiff(request.diff, true)
						}
						if (!this.unsentChanges.nextDiff) return
						const diff = getNetworkDiff(this.unsentChanges.nextDiff)
						if (!diff) return
						this.applyNetworkDiff(diff, true)
					})
				} catch (e) {
					console.error(e)
					// throw away the speculative changes and start over
					this.speculativeChanges = { added: {} as any, updated: {} as any, removed: {} as any }
					this.resetConnection()
				}
			})
			this.lastServerClock = diffs.at(-1)?.serverClock ?? this.lastServerClock
		} catch (e) {
			console.error(e)
			this.store.ensureStoreIsUsable()
			this.resetConnection()
		}
	}
}
