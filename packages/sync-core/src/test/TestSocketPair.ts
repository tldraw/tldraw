import { UnknownRecord } from '@tldraw/store'
import { structuredClone } from '@tldraw/utils'
import {
	TLPersistentClientSocket,
	TLSocketStatusListener,
	TLSyncErrorCloseEventCode,
	TLSyncErrorCloseEventReason,
} from '../lib/TLSyncClient'
import { TLRoomSocket } from '../lib/TLSyncRoom'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../lib/protocol'
import { TestServer } from './TestServer'

export class TestSocketPair<R extends UnknownRecord> {
	clientSentEventQueue: TLSocketClientSentEvent<R>[] = []
	serverSentEventQueue: TLSocketServerSentEvent<R>[] = []
	flushServerSentEvents() {
		const queue = this.serverSentEventQueue
		this.serverSentEventQueue = []
		queue.forEach((msg) => {
			this.callbacks.onReceiveMessage?.(msg)
		})
	}
	flushClientSentEvents() {
		const queue = this.clientSentEventQueue
		this.clientSentEventQueue = []
		queue.forEach((msg) => {
			this.didReceiveFromClient?.(msg)
		})
	}

	getNeedsFlushing() {
		return this.serverSentEventQueue.length > 0 || this.clientSentEventQueue.length > 0
	}

	roomSocket: TLRoomSocket<R> = {
		close: (code?: number, reason?: string) => {
			this.flushServerSentEvents()
			this.disconnect(code, reason)
		},
		get isOpen() {
			return true
		},
		sendMessage: (msg: TLSocketServerSentEvent<R>) => {
			if (!this.callbacks.onReceiveMessage) {
				throw new Error('Socket is closed')
			}
			if (this.clientSocket.connectionStatus !== 'online') {
				// client was closed, drop the packet
				return
			}
			// cloning because callers might reuse the same message object
			this.serverSentEventQueue.push(structuredClone(msg))
		},
	}
	didReceiveFromClient?: (msg: TLSocketClientSentEvent<R>) => void = undefined
	clientDisconnected?: () => void = undefined
	clientSocket: TLPersistentClientSocket<R> = {
		connectionStatus: 'offline',
		onStatusChange: (cb) => {
			this.callbacks.onStatusChange = cb
			return () => {
				this.callbacks.onStatusChange = null
			}
		},
		onReceiveMessage: (cb) => {
			this.callbacks.onReceiveMessage = cb
			return () => {
				this.callbacks.onReceiveMessage = null
			}
		},
		sendMessage: (msg: TLSocketClientSentEvent<R>) => {
			if (this.clientSocket.connectionStatus !== 'online') {
				throw new Error('trying to send before open')
			}
			// cloning because callers might reuse the same message object
			this.clientSentEventQueue.push(structuredClone(msg))
		},
		restart: () => {
			this.disconnect()
			this.connect()
		},
	}

	callbacks = {
		onReceiveMessage: null as null | ((msg: TLSocketServerSentEvent<R>) => void),
		onStatusChange: null as null | TLSocketStatusListener,
	}

	// eslint-disable-next-line no-restricted-syntax
	get isConnected() {
		return this.clientSocket.connectionStatus === 'online'
	}

	connect() {
		this.server.connect(this)
	}

	disconnect(code?: number, reason?: string) {
		this.clientSocket.connectionStatus = 'offline'
		this.serverSentEventQueue = []
		this.clientSentEventQueue = []
		if (code === TLSyncErrorCloseEventCode) {
			this.callbacks.onStatusChange?.({
				status: 'error',
				reason: reason ?? TLSyncErrorCloseEventReason.UNKNOWN_ERROR,
			})
		} else {
			this.callbacks.onStatusChange?.({ status: 'offline' })
		}
		this.clientDisconnected?.()
	}

	constructor(
		public readonly id: string,
		public readonly server: TestServer<R>
	) {}
}
