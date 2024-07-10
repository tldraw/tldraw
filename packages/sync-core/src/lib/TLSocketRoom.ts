import type { StoreSchema, UnknownRecord } from '@tldraw/store'
import { createTLSchema } from '@tldraw/tlschema'
import { ServerSocketAdapter } from './ServerSocketAdapter'
import { RoomSnapshot, TLSyncRoom } from './TLSyncRoom'
import { JsonChunkAssembler } from './chunk'
import { TLSocketServerSentEvent } from './protocol'

// TODO: structured logging support
interface TLSyncLog {
	info?: (...args: any[]) => void
	warn?: (...args: any[]) => void
	error?: (...args: any[]) => void
}

export class TLSocketRoom<R extends UnknownRecord, SessionMeta> {
	private room: TLSyncRoom<R, SessionMeta>
	private readonly sessions = new Map<
		string,
		{ assembler: JsonChunkAssembler; socket: WebSocket; unlisten: () => void }
	>()
	readonly log: TLSyncLog
	constructor(
		public readonly opts: {
			initialSnapshot?: RoomSnapshot
			schema?: StoreSchema<R>
			// how long to wait for a client to communicate before disconnecting them
			clientTimeout?: number
			log?: TLSyncLog
			// a callback that is called when a client is disconnected
			onSessionRemoved?: (
				room: TLSocketRoom<R, SessionMeta>,
				args: { sessionKey: string; numSessionsRemaining: number; meta: SessionMeta }
			) => void
			// a callback that is called whenever a message is sent
			onBeforeSendMessage?: (args: {
				sessionId: string
				message: TLSocketServerSentEvent<R>
				stringified: string
			}) => void
			onDataChange?: () => void
		}
	) {
		const initialClock = opts.initialSnapshot?.clock ?? 0
		this.room = new TLSyncRoom<R, SessionMeta>(
			opts.schema ?? (createTLSchema() as any),
			opts.initialSnapshot
		)
		if (this.room.clock !== initialClock) {
			this.opts?.onDataChange?.()
		}
		this.room.events.on('session_removed', (args) => {
			this.sessions.delete(args.sessionKey)
			if (this.opts.onSessionRemoved) {
				this.opts.onSessionRemoved(this, {
					sessionKey: args.sessionKey,
					numSessionsRemaining: this.room.sessions.size,
					meta: args.meta,
				})
			}
		})
		this.log = opts.log ?? console
	}
	getNumActiveSessions() {
		return this.room.sessions.size
	}

	handleSocketConnect(sessionId: string, socket: WebSocket, meta: SessionMeta) {
		const handleSocketMessage = (event: MessageEvent) =>
			this.handleSocketMessage(sessionId, event.data)
		const handleSocketError = this.handleSocketError.bind(this, sessionId)
		const handleSocketClose = this.handleSocketClose.bind(this, sessionId)

		this.sessions.set(sessionId, {
			assembler: new JsonChunkAssembler(),
			socket,
			unlisten: () => {
				socket.removeEventListener('message', handleSocketMessage)
				socket.removeEventListener('close', handleSocketClose)
				socket.removeEventListener('error', handleSocketError)
			},
		})

		this.room.handleNewSession(
			sessionId,
			new ServerSocketAdapter({
				ws: socket,
				onBeforeSendMessage: this.opts.onBeforeSendMessage
					? (message, stringified) =>
							this.opts.onBeforeSendMessage!({
								sessionId,
								message,
								stringified,
							})
					: undefined,
			}),
			meta
		)

		socket.addEventListener('message', handleSocketMessage)
		socket.addEventListener('close', handleSocketClose)
		socket.addEventListener('error', handleSocketError)
	}

	handleSocketMessage(sessionId: string, message: string | ArrayBuffer) {
		const documentClockAtStart = this.room.documentClock
		const assembler = this.sessions.get(sessionId)?.assembler
		if (!assembler) {
			this.log.warn?.('Received message from unknown session', sessionId)
			return
		}

		try {
			const messageString =
				typeof message === 'string' ? message : new TextDecoder().decode(message)
			const res = assembler.handleMessage(messageString)
			if (res?.data) {
				this.room.handleMessage(sessionId, res.data as any)
			}
			if (res?.error) {
				this.log.warn?.('Error assembling message', res.error)
			}
		} catch (e) {
			this.log.error?.(e)
			const socket = this.sessions.get(sessionId)?.socket
			if (socket) {
				socket.send(
					JSON.stringify({
						type: 'error',
						error: typeof e?.toString === 'function' ? e.toString() : e,
					} satisfies TLSocketServerSentEvent<R>)
				)
				socket.close()
			}
		} finally {
			if (this.room.documentClock !== documentClockAtStart) {
				this.opts.onDataChange?.()
			}
		}
	}

	handleSocketError(sessionId: string) {
		this.room.handleClose(sessionId)
	}

	handleSocketClose(sessionId: string) {
		this.room.handleClose(sessionId)
	}

	getCurrentDocumentClock() {
		return this.room.documentClock
	}
	getCurrentSnapshot() {
		return this.room.getSnapshot()
	}

	loadSnapshot(snapshot: RoomSnapshot) {
		const oldRoom = this.room
		const oldIds = oldRoom.getSnapshot().documents.map((d) => d.state.id)
		const newIds = new Set(snapshot.documents.map((d) => d.state.id))
		const removedIds = oldIds.filter((id) => !newIds.has(id))

		const tombstones = { ...snapshot.tombstones }
		removedIds.forEach((id) => {
			tombstones[id] = oldRoom.clock + 1
		})
		newIds.forEach((id) => {
			delete tombstones[id]
		})

		const newRoom = new TLSyncRoom<R, SessionMeta>(oldRoom.schema, {
			clock: oldRoom.clock + 1,
			documents: snapshot.documents.map((d) => ({
				lastChangedClock: oldRoom.clock + 1,
				state: d.state,
			})),
			schema: snapshot.schema,
			tombstones,
		})

		// replace room with new one and kick out all the clients
		this.room = newRoom
		oldRoom.close()
	}

	close() {
		this.room.close()
	}
}
