import ws from 'ws'
import { TLRoomSocket } from './TLSyncRoom'
import { TLSocketServerSentEvent } from './protocol'

/** @public */
export class ServerSocketAdapter implements TLRoomSocket {
	constructor(public readonly ws: WebSocket | ws.WebSocket) {}
	// eslint-disable-next-line no-restricted-syntax
	get isOpen(): boolean {
		return this.ws.readyState === 1 // ready state open
	}
	// see TLRoomSocket for details on why this accepts a union and not just arrays
	sendMessage(msg: TLSocketServerSentEvent) {
		this.ws.send(JSON.stringify(msg))
	}
	close() {
		this.ws.close()
	}
}
