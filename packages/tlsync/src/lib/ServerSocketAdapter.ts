import { UnknownRecord } from '@tldraw/store'
import ws from 'ws'
import { TLRoomSocket } from './TLSyncRoom'
import { TLSocketServerSentEvent } from './protocol'
import { serializeMessage } from './serializeMessage'

/** @public */
export class ServerSocketAdapter<R extends UnknownRecord> implements TLRoomSocket<R> {
	constructor(public readonly ws: WebSocket | ws.WebSocket) {}
	// eslint-disable-next-line no-restricted-syntax
	get isOpen(): boolean {
		return this.ws.readyState === 1 // ready state open
	}
	sendMessage(msg: TLSocketServerSentEvent<R>) {
		this.ws.send(serializeMessage(msg))
	}
	close() {
		this.ws.close()
	}
}
