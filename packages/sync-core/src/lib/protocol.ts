import { SerializedSchema, UnknownRecord } from '@tldraw/store'
import { NetworkDiff, ObjectDiff, RecordOpType } from './diff'

const TLSYNC_PROTOCOL_VERSION = 7

/**
 * Gets the current tldraw sync protocol version number.
 *
 * This version number is used during WebSocket connection handshake to ensure
 * client and server compatibility. When versions don't match, the connection
 * will be rejected with an incompatibility error.
 *
 * @returns The current protocol version number
 *
 * @example
 * ```ts
 * const version = getTlsyncProtocolVersion()
 * console.log(`Using protocol version: ${version}`)
 * ```
 *
 * @internal
 */
export function getTlsyncProtocolVersion() {
	return TLSYNC_PROTOCOL_VERSION
}

/**
 * Constants defining the different types of protocol incompatibility reasons.
 *
 * These values indicate why a client-server connection was rejected due to
 * version or compatibility issues. Each reason helps diagnose specific problems
 * during the connection handshake.
 *
 * @example
 * ```ts
 * if (error.reason === TLIncompatibilityReason.ClientTooOld) {
 *   showUpgradeMessage('Please update your client')
 * }
 * ```
 *
 * @internal
 * @deprecated Replaced by websocket .close status/reason
 */
export const TLIncompatibilityReason = {
	ClientTooOld: 'clientTooOld',
	ServerTooOld: 'serverTooOld',
	InvalidRecord: 'invalidRecord',
	InvalidOperation: 'invalidOperation',
} as const

/**
 * Union type representing all possible incompatibility reason values.
 *
 * This type represents the different reasons why a client-server connection
 * might fail due to protocol or version mismatches.
 *
 * @example
 * ```ts
 * function handleIncompatibility(reason: TLIncompatibilityReason) {
 *   switch (reason) {
 *     case 'clientTooOld':
 *       return 'Client needs to be updated'
 *     case 'serverTooOld':
 *       return 'Server needs to be updated'
 *   }
 * }
 * ```
 *
 * @internal
 * @deprecated replaced by websocket .close status/reason
 */
export type TLIncompatibilityReason =
	(typeof TLIncompatibilityReason)[keyof typeof TLIncompatibilityReason]

/**
 * Union type representing all possible message types that can be sent from server to client.
 *
 * This encompasses the complete set of server-originated WebSocket messages in the tldraw
 * sync protocol, including connection establishment, data synchronization, and error handling.
 *
 * @param R - The record type being synchronized (extends UnknownRecord)
 *
 * @example
 * ```ts
 * syncClient.onReceiveMessage((message: TLSocketServerSentEvent<MyRecord>) => {
 *   switch (message.type) {
 *     case 'connect':
 *       console.log('Connected to room with clock:', message.serverClock)
 *       break
 *     case 'data':
 *       console.log('Received data updates:', message.data)
 *       break
 *   }
 * })
 * ```
 *
 * @internal
 */
export type TLSocketServerSentEvent<R extends UnknownRecord> =
	| {
			type: 'connect'
			hydrationType: 'wipe_all' | 'wipe_presence'
			connectRequestId: string
			protocolVersion: number
			schema: SerializedSchema
			diff: NetworkDiff<R>
			serverClock: number
			isReadonly: boolean
	  }
	| {
			type: 'incompatibility_error'
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			reason: TLIncompatibilityReason
	  }
	| {
			type: 'pong'
	  }
	| { type: 'data'; data: TLSocketServerSentDataEvent<R>[] }
	| { type: 'custom'; data: any }
	| TLSocketServerSentDataEvent<R>

/**
 * Union type representing data-related messages sent from server to client.
 *
 * These messages handle the core synchronization operations: applying patches from
 * other clients and confirming the results of client push operations.
 *
 * @param R - The record type being synchronized (extends UnknownRecord)
 *
 * @example
 * ```ts
 * function handleDataEvent(event: TLSocketServerSentDataEvent<MyRecord>) {
 *   if (event.type === 'patch') {
 *     // Apply changes from other clients
 *     applyNetworkDiff(event.diff)
 *   } else if (event.type === 'push_result') {
 *     // Handle result of our push request
 *     if (event.action === 'commit') {
 *       console.log('Changes accepted by server')
 *     }
 *   }
 * }
 * ```
 *
 * @internal
 */
export type TLSocketServerSentDataEvent<R extends UnknownRecord> =
	| {
			type: 'patch'
			diff: NetworkDiff<R>
			serverClock: number
	  }
	| {
			type: 'push_result'
			clientClock: number
			serverClock: number
			action: 'discard' | 'commit' | { rebaseWithDiff: NetworkDiff<R> }
	  }

/**
 * Interface defining a client-to-server push request message.
 *
 * Push requests are sent when the client wants to synchronize local changes
 * with the server. They contain document changes and optionally presence updates
 * (like cursor position or user selection).
 *
 * @param R - The record type being synchronized (extends UnknownRecord)
 *
 * @example
 * ```ts
 * const pushRequest: TLPushRequest<MyRecord> = {
 *   type: 'push',
 *   clientClock: 15,
 *   diff: {
 *     'shape:abc123': [RecordOpType.Patch, { x: [ValueOpType.Put, 100] }]
 *   },
 *   presence: [RecordOpType.Put, { cursor: { x: 150, y: 200 } }]
 * }
 * socket.sendMessage(pushRequest)
 * ```
 *
 * @internal
 */
export interface TLPushRequest<R extends UnknownRecord> {
	type: 'push'
	clientClock: number
	diff?: NetworkDiff<R>
	presence?: [typeof RecordOpType.Patch, ObjectDiff] | [typeof RecordOpType.Put, R]
}

/**
 * Interface defining a client-to-server connection request message.
 *
 * This message initiates a WebSocket connection to a sync room. It includes
 * the client's schema, protocol version, and last known server clock for
 * proper synchronization state management.
 *
 * @example
 * ```ts
 * const connectRequest: TLConnectRequest = {
 *   type: 'connect',
 *   connectRequestId: 'conn-123',
 *   lastServerClock: 42,
 *   protocolVersion: getTlsyncProtocolVersion(),
 *   schema: mySchema.serialize()
 * }
 * socket.sendMessage(connectRequest)
 * ```
 *
 * @internal
 */
export interface TLConnectRequest {
	type: 'connect'
	connectRequestId: string
	lastServerClock: number
	protocolVersion: number
	schema: SerializedSchema
}

/**
 * Interface defining a client-to-server ping request message.
 *
 * Ping requests are used to measure network latency and ensure the connection
 * is still active. The server responds with a 'pong' message.
 *
 * @example
 * ```ts
 * const pingRequest: TLPingRequest = { type: 'ping' }
 * socket.sendMessage(pingRequest)
 *
 * // Server will respond with { type: 'pong' }
 * ```
 *
 * @internal
 */
export interface TLPingRequest {
	type: 'ping'
}

/**
 * Union type representing all possible message types that can be sent from client to server.
 *
 * This encompasses the complete set of client-originated WebSocket messages in the tldraw
 * sync protocol, covering connection establishment, data synchronization, and connectivity checks.
 *
 * @param R - The record type being synchronized (extends UnknownRecord)
 *
 * @example
 * ```ts
 * function sendMessage(message: TLSocketClientSentEvent<MyRecord>) {
 *   switch (message.type) {
 *     case 'connect':
 *       console.log('Establishing connection...')
 *       break
 *     case 'push':
 *       console.log('Pushing changes:', message.diff)
 *       break
 *     case 'ping':
 *       console.log('Checking connection latency')
 *       break
 *   }
 *   socket.send(JSON.stringify(message))
 * }
 * ```
 *
 * @internal
 */
export type TLSocketClientSentEvent<R extends UnknownRecord> =
	| TLPushRequest<R>
	| TLConnectRequest
	| TLPingRequest
