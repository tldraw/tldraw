import { Signal, react, transact } from '@tldraw/state'
import {
	RecordId,
	RecordsDiff,
	Store,
	UnknownRecord,
	reverseRecordsDiff,
	squashRecordDiffs,
} from '@tldraw/store'
import {
	exhaustiveSwitchError,
	fpsThrottle,
	isEqual,
	objectMapEntries,
	uniqueId,
} from '@tldraw/utils'
import { NetworkDiff, RecordOpType, applyObjectDiff, diffRecord, getNetworkDiff } from './diff'
import { interval } from './interval'
import {
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
 * @internal
 */
export type SubscribingFn<T> = (cb: (val: T) => void) => () => void

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
} as const
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
 * @internal
 */
export type TlSocketStatusChangeEvent =
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
export type TLSocketStatusListener = (params: TlSocketStatusChangeEvent) => void

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
 * @internal
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
 * @internal
 */
export interface TLPersistentClientSocket<R extends UnknownRecord = UnknownRecord> {
	/** Current connection state - online means actively connected and ready */
	connectionStatus: 'online' | 'offline' | 'error'

	/**
	 * Send a protocol message to the sync server
	 * @param msg - Message to send (connect, push, ping, etc.)
	 */
	sendMessage(msg: TLSocketClientSentEvent<R>): void

	/**
	 * Subscribe to messages received from the server
	 * @param callback - Function called for each received message
	 * @returns Cleanup function to remove the listener
	 */
	onReceiveMessage: SubscribingFn<TLSocketServerSentEvent<R>>

	/**
	 * Subscribe to connection status changes
	 * @param callback - Function called when connection status changes
	 * @returns Cleanup function to remove the listener
	 */
	onStatusChange: SubscribingFn<TlSocketStatusChangeEvent>

	/**
	 * Force a connection restart (disconnect then reconnect)
	 * Used for error recovery or when connection health checks fail
	 */
	restart(): void
}

const PING_INTERVAL = 5000
const MAX_TIME_TO_WAIT_FOR_SERVER_INTERACTION_BEFORE_RESETTING_CONNECTION = PING_INTERVAL * 2

// Should connect support chunking the response to allow for large payloads?

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
 * @internal
 */
export class TLSyncClient<R extends UnknownRecord, S extends Store<R> = Store<R>> {
	/** The last clock time from the most recent server update */
	private lastServerClock = -1
	private lastServerInteractionTimestamp = Date.now()

	/** The queue of in-flight push requests that have not yet been acknowledged by the server */
	private pendingPushRequests: { request: TLPushRequest<R>; sent: boolean }[] = []

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

	readonly store: S
	readonly socket: TLPersistentClientSocket<R>

	readonly presenceState: Signal<R | null> | undefined
	readonly presenceMode: Signal<TLPresenceMode> | undefined

	// isOnline is true when we have an open socket connection and we have
	// established a connection with the server room (i.e. we have received a 'connect' message)
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
	 */
	public readonly onAfterConnect?: (self: this, details: { isReadonly: boolean }) => void

	private readonly onCustomMessageReceived?: TLCustomMessageHandler

	private isDebugging = false
	private debug(...args: any[]) {
		if (this.isDebugging) {
			// eslint-disable-next-line no-console
			console.debug(...args)
		}
	}

	private readonly presenceType: R['typeName'] | null

	didCancel?: () => boolean

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
		socket: TLPersistentClientSocket<R>
		presence: Signal<R | null>
		presenceMode?: Signal<TLPresenceMode>
		onLoad(self: TLSyncClient<R, S>): void
		onSyncError(reason: string): void
		onCustomMessageReceived?: TLCustomMessageHandler
		onAfterConnect?(self: TLSyncClient<R, S>, details: { isReadonly: boolean }): void
		didCancel?(): boolean
	}) {
		this.didCancel = config.didCancel

		this.presenceType = config.store.scopedTypes.presence.values().next().value ?? null

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

		this.disposables.push(
			// when local 'user' changes are made, send them to the server
			// or stash them locally in offline mode
			this.store.listen(
				({ changes }) => {
					if (this.didCancel?.()) return this.close()
					this.debug('received store changes', { changes })
					this.push(changes)
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
					// last ping was recent, so no need to take any action
					return
				}

				console.warn(`Haven't heard from the server in a while, resetting connection...`)
				this.resetConnection()
			}, PING_INTERVAL * 2)
		)

		if (this.presenceState) {
			this.disposables.push(
				react('pushPresence', () => {
					if (this.didCancel?.()) return this.close()
					const mode = this.presenceMode?.get()
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
		this.pendingPushRequests = []
		this.incomingDiffBuffer = []
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

				// now re-apply the speculative changes creating a new push request with the
				// appropriate diff
				const speculativeChanges = this.store.filterChangesByScope(
					this.store.extractingChanges(() => {
						this.store.applyDiff(stashedChanges)
					}),
					'document'
				)
				if (speculativeChanges) this.push(speculativeChanges)
			})

			// this.isConnectedToRoom = true
			// this.store.applyDiff(stashedChanges, false)

			this.onAfterConnect?.(this, { isReadonly: event.isReadonly })
			const presence = this.presenceState?.get()
			if (presence) {
				this.pushPresence(presence)
			}
		})

		this.lastServerClock = event.serverClock
	}

	incomingDiffBuffer: TLSocketServerSentDataEvent<R>[] = []

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
		this.flushPendingPushRequests.cancel?.()
		this.scheduleRebase.cancel?.()
	}

	lastPushedPresenceState: R | null = null

	private pushPresence(nextPresence: R | null) {
		// make sure we push any document changes first
		this.store._flushHistory()

		if (!this.isConnectedToRoom) {
			// if we're offline, don't do anything
			return
		}

		let presence: TLPushRequest<any>['presence'] = undefined
		if (!this.lastPushedPresenceState && nextPresence) {
			// we don't have a last presence state, so we need to push the full state
			presence = [RecordOpType.Put, nextPresence]
		} else if (this.lastPushedPresenceState && nextPresence) {
			// we have a last presence state, so we need to push a diff if there is one
			const diff = diffRecord(this.lastPushedPresenceState, nextPresence)
			if (diff) {
				presence = [RecordOpType.Patch, diff]
			}
		}

		if (!presence) return
		this.lastPushedPresenceState = nextPresence

		// if there is a pending push that has not been sent and does not already include a presence update,
		// then add this presence update to it
		const lastPush = this.pendingPushRequests.at(-1)
		if (lastPush && !lastPush.sent && !lastPush.request.presence) {
			lastPush.request.presence = presence
			return
		}

		// otherwise, create a new push request
		const req: TLPushRequest<R> = {
			type: 'push',
			clientClock: this.clientClock++,
			presence,
		}

		if (req) {
			this.pendingPushRequests.push({ request: req, sent: false })
			this.flushPendingPushRequests()
		}
	}

	/** Push a change to the server, or stash it locally if we're offline */
	private push(change: RecordsDiff<any>) {
		this.debug('push', change)
		// the Store doesn't do deep equality checks when making changes
		// so it's possible that the diff passed in here is actually a no-op.
		// either way, we also don't want to send whole objects over the wire if
		// only small parts of them have changed, so we'll do a shallow-ish diff
		// which also uses deep equality checks to see if the change is actually
		// a no-op.
		const diff = getNetworkDiff(change)
		if (!diff) return

		// the change is not a no-op so we'll send it to the server
		// but first let's merge the records diff into the speculative changes
		this.speculativeChanges = squashRecordDiffs([this.speculativeChanges, change])

		if (!this.isConnectedToRoom) {
			// don't sent push requests or even store them up while offline
			// when we come back online we'll generate another push request from
			// scratch based on the speculativeChanges diff
			return
		}

		const pushRequest: TLPushRequest<R> = {
			type: 'push',
			diff,
			clientClock: this.clientClock++,
		}

		this.pendingPushRequests.push({ request: pushRequest, sent: false })

		// immediately calling .send on the websocket here was causing some interaction
		// slugishness when e.g. drawing or translating shapes. Seems like it blocks
		// until the send completes. So instead we'll schedule a send to happen on some
		// tick in the near future.
		this.flushPendingPushRequests()
	}

	/** Send any unsent push requests to the server */
	private flushPendingPushRequests = fpsThrottle(() => {
		this.debug('flushing pending push requests', {
			isConnectedToRoom: this.isConnectedToRoom,
			pendingPushRequests: this.pendingPushRequests,
		})
		if (!this.isConnectedToRoom || this.store.isPossiblyCorrupted()) {
			return
		}
		for (const pendingPushRequest of this.pendingPushRequests) {
			if (!pendingPushRequest.sent) {
				if (this.socket.connectionStatus !== 'online') {
					// we went offline, so don't send anything
					return
				}
				this.socket.sendMessage(pendingPushRequest.request)
				pendingPushRequest.sent = true
			}
		}
	})

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

	// eslint-disable-next-line local/prefer-class-methods
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
					if (this.pendingPushRequests[0].request.clientClock !== diff.clientClock) {
						throw new Error(
							'Received push_result for a push request that is not at the front of the queue'
						)
					}
					if (diff.action === 'discard') {
						this.pendingPushRequests.shift()
					} else if (diff.action === 'commit') {
						const { request } = this.pendingPushRequests.shift()!
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
						for (const { request } of this.pendingPushRequests) {
							if (!('diff' in request) || !request.diff) continue
							this.applyNetworkDiff(request.diff, true)
						}
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

	private scheduleRebase = fpsThrottle(this.rebase)
}
