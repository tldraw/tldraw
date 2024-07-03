import { UnknownRecord } from '@tldraw/store'
import ws from 'ws'
import { TLRoomSocket } from './TLSyncRoom'
import { TLSocketServerSentEvent } from './protocol'

interface ServerSocketAdapterOptions<R extends UnknownRecord> {
	readonly ws: WebSocket | ws.WebSocket
	readonly onBeforeSendMessage?: (msg: TLSocketServerSentEvent<R>, stringified: string) => void
}

/** @public */
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
	close() {
		this.opts.ws.close()
	}
}
