import { UnknownRecord } from '@tldraw/store'
import { TLRoomSocket } from './TLSyncRoom'
import { TLSocketServerSentEvent } from './protocol'

/**
 * Minimal server-side WebSocket interface that is compatible with
 *
 * - The standard WebSocket interface (cloudflare, deno, some node setups)
 * - The 'ws' WebSocket interface (some node setups)
 * - The Bun.serve socket implementation
 *
 * @public
 */
export interface WebSocketMinimal {
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	addEventListener?: (type: 'message' | 'close' | 'error', listener: (event: any) => void) => void
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	removeEventListener?: (
		type: 'message' | 'close' | 'error',
		listener: (event: any) => void
	) => void
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	send: (data: string) => void
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	close: (code?: number, reason?: string) => void
	readyState: number
}

/** @internal */
export interface ServerSocketAdapterOptions<R extends UnknownRecord> {
	readonly ws: WebSocketMinimal
	// eslint-disable-next-line @typescript-eslint/method-signature-style
	readonly onBeforeSendMessage?: (msg: TLSocketServerSentEvent<R>, stringified: string) => void
}

/** @internal */
export class ServerSocketAdapter<R extends UnknownRecord> implements TLRoomSocket<R> {
	constructor(public readonly opts: ServerSocketAdapterOptions<R>) {}
	// eslint-disable-next-line no-restricted-syntax
	get isOpen(): boolean {
		return this.opts.ws.readyState === 1 // ready state open
	}
	// see TLRoomSocket for details on why this accepts a union and not just arrays
	sendMessage(msg: TLSocketServerSentEvent<R>) {
		const message = JSON.stringify(msg)
		this.opts.onBeforeSendMessage?.(msg, message)
		this.opts.ws.send(message)
	}
	close(code?: number, reason?: string) {
		this.opts.ws.close(code, reason)
	}
}
