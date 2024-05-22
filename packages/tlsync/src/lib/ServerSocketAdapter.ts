import { UnknownRecord } from '@tldraw/store'
import ws from 'ws'
import { TLRoomSocket } from './TLSyncRoom'
import { TLSocketServerSentEvent } from './protocol'

interface ServerSocketAdapterOptions {
	readonly ws: WebSocket | ws.WebSocket
	readonly logSendMessage: (type: string, size: number) => void
}

/** @public */
export class ServerSocketAdapter<R extends UnknownRecord> implements TLRoomSocket<R> {
	constructor(public readonly opts: ServerSocketAdapterOptions) {}
	// eslint-disable-next-line no-restricted-syntax
	get isOpen(): boolean {
		return this.opts.ws.readyState === 1 // ready state open
	}
	// see TLRoomSocket for details on why this accepts a union and not just arrays
	sendMessage(msg: TLSocketServerSentEvent<R>) {
		const message = JSON.stringify(msg)
		this.opts.logSendMessage(msg.type, message.length)
		this.opts.ws.send(message)
	}
	close() {
		this.opts.ws.close()
	}
}
