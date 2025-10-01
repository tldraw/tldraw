import { UnknownRecord } from '@tldraw/store'
import { TLRoomSocket } from './TLSyncRoom'
import { TLSocketServerSentEvent } from './protocol'

/**
 * Minimal server-side WebSocket interface that is compatible with various WebSocket implementations.
 * This interface abstracts over different WebSocket libraries and platforms to provide a consistent
 * API for the ServerSocketAdapter.
 *
 * Supports:
 * - The standard WebSocket interface (Cloudflare, Deno, some Node.js setups)
 * - The 'ws' WebSocket interface (Node.js ws library)
 * - The Bun.serve socket implementation
 *
 * @public
 * @example
 * ```ts
 * // Standard WebSocket
 * const standardWs: WebSocketMinimal = new WebSocket('ws://localhost:8080')
 *
 * // Node.js 'ws' library WebSocket
 * import WebSocket from 'ws'
 * const nodeWs: WebSocketMinimal = new WebSocket('ws://localhost:8080')
 *
 * // Bun WebSocket (in server context)
 * // const bunWs: WebSocketMinimal = server.upgrade(request)
 * ```
 */
export interface WebSocketMinimal {
	/**
	 * Optional method to add event listeners for WebSocket events.
	 * Not all WebSocket implementations provide this method.
	 *
	 * @param type - The event type to listen for
	 * @param listener - The event handler function
	 */
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	addEventListener?: (type: 'message' | 'close' | 'error', listener: (event: any) => void) => void

	/**
	 * Optional method to remove event listeners for WebSocket events.
	 * Not all WebSocket implementations provide this method.
	 *
	 * @param type - The event type to stop listening for
	 * @param listener - The event handler function to remove
	 */
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	removeEventListener?: (
		type: 'message' | 'close' | 'error',
		listener: (event: any) => void
	) => void

	/**
	 * Sends a string message through the WebSocket connection.
	 *
	 * @param data - The string data to send
	 */
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	send: (data: string) => void

	/**
	 * Closes the WebSocket connection.
	 *
	 * @param code - Optional close code (default: 1000 for normal closure)
	 * @param reason - Optional human-readable close reason
	 */
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	close: (code?: number, reason?: string) => void

	/**
	 * The current state of the WebSocket connection.
	 * - 0: CONNECTING
	 * - 1: OPEN
	 * - 2: CLOSING
	 * - 3: CLOSED
	 */
	readyState: number
}

/**
 * Configuration options for creating a ServerSocketAdapter instance.
 *
 * @internal
 */
export interface ServerSocketAdapterOptions<R extends UnknownRecord> {
	/** The underlying WebSocket connection to wrap */
	readonly ws: WebSocketMinimal

	/**
	 * Optional callback invoked before each message is sent to the client.
	 * Useful for logging, metrics, or message transformation.
	 *
	 * @param msg - The message object being sent
	 * @param stringified - The JSON stringified version of the message
	 */
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	readonly onBeforeSendMessage?: (msg: TLSocketServerSentEvent<R>, stringified: string) => void
}

/**
 * Server-side adapter that wraps various WebSocket implementations to provide a consistent
 * TLRoomSocket interface for the TLSyncRoom. This adapter handles the differences between
 * WebSocket libraries and platforms, allowing sync-core to work across different server
 * environments.
 *
 * The adapter implements the TLRoomSocket interface, providing methods for sending messages,
 * checking connection status, and closing connections.
 *
 * @internal
 * @example
 * ```ts
 * import { ServerSocketAdapter } from '@tldraw/sync-core'
 *
 * // Wrap a standard WebSocket
 * const adapter = new ServerSocketAdapter({
 *   ws: webSocketConnection,
 *   onBeforeSendMessage: (msg, json) => {
 *     console.log('Sending:', msg.type)
 *   }
 * })
 *
 * // Use with TLSyncRoom
 * room.handleNewSession({
 *   sessionId: 'session-123',
 *   socket: adapter,
 *   isReadonly: false
 * })
 * ```
 */
export class ServerSocketAdapter<R extends UnknownRecord> implements TLRoomSocket<R> {
	/**
	 * Creates a new ServerSocketAdapter instance.
	 *
	 * opts - Configuration options for the adapter
	 */
	constructor(public readonly opts: ServerSocketAdapterOptions<R>) {}

	/**
	 * Checks if the underlying WebSocket connection is currently open and ready to send messages.
	 *
	 * @returns True if the connection is open (readyState === 1), false otherwise
	 */
	// eslint-disable-next-line no-restricted-syntax
	get isOpen(): boolean {
		return this.opts.ws.readyState === 1 // ready state open
	}

	/**
	 * Sends a sync protocol message to the connected client. The message is JSON stringified
	 * before being sent through the WebSocket. If configured, the onBeforeSendMessage callback
	 * is invoked before sending.
	 *
	 * @param msg - The sync protocol message to send
	 */
	// see TLRoomSocket for details on why this accepts a union and not just arrays
	sendMessage(msg: TLSocketServerSentEvent<R>) {
		const message = JSON.stringify(msg)
		this.opts.onBeforeSendMessage?.(msg, message)
		this.opts.ws.send(message)
	}

	/**
	 * Closes the WebSocket connection with an optional close code and reason.
	 *
	 * @param code - Optional close code (default: 1000 for normal closure)
	 * @param reason - Optional human-readable reason for closing
	 */
	close(code?: number, reason?: string) {
		this.opts.ws.close(code, reason)
	}
}
