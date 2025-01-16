import { AnalyticsEngineDataset } from '@cloudflare/workers-types'
import {
	RoomSnapshot,
	TLSocketRoom,
	TLSyncErrorCloseEventCode,
	TLSyncErrorCloseEventReason,
} from '@tldraw/sync-core'
import { TLRecord } from '@tldraw/tlschema'
import { ExecutionQueue, throttle } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { createSentry, parseRequestQuery } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { makePermissiveSchema } from './makePermissiveSchema'
import { Environment } from './types'

const connectRequestQuery = T.object({
	sessionId: T.string,
	storeId: T.string.optional(),
})

interface AnalyticsEvent {
	type: 'connect' | 'send_message' | 'receive_message'
	origin: string
	sessionId: string
	slug: string
}

export class BemoDO extends DurableObject<Environment> {
	r2: R2Bucket
	_slug: string | null = null

	analytics?: AnalyticsEngineDataset

	writeEvent({ type, origin, sessionId, slug }: AnalyticsEvent) {
		this.analytics?.writeDataPoint({
			blobs: [type, origin, slug, sessionId],
		})
	}

	constructor(
		public state: DurableObjectState,
		env: Environment
	) {
		super(state, env)
		this.r2 = env.BEMO_BUCKET
		this.analytics = env.BEMO_ANALYTICS

		state.blockConcurrencyWhile(async () => {
			this._slug = ((await this.state.storage.get('slug')) ?? null) as string | null
		})
	}

	private reportError(e: unknown, request?: Request) {
		const sentry = createSentry(this.ctx, this.env, request)
		console.error(e)
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		sentry?.captureException(e)
	}

	private readonly router = Router()
		.all('/connect/:slug', async (req) => {
			if (!this._slug) {
				await this.state.blockConcurrencyWhile(async () => {
					await this.state.storage.put('slug', req.params.slug)
					this._slug = req.params.slug
				})
			}
			return this.handleConnect(req)
		})
		.all('*', async () => new Response('Not found', { status: 404 }))

	override async fetch(request: Request): Promise<Response> {
		try {
			return await this.router.fetch(request)
		} catch (error) {
			this.reportError(error, request)
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}

	async handleConnect(req: IRequest) {
		// extract query params from request, should include instanceId
		const { sessionId } = parseRequestQuery(req, connectRequestQuery)

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()

		const origin = req.headers.get('origin') ?? 'unknown'

		try {
			const room = await this.getRoom()
			// Don't connect if we're already at max connections
			if (room.getNumActiveSessions() >= MAX_CONNECTIONS) {
				// TODO: this is not handled on the client, it just gets stuck in a loading state.
				// With hibernatable sockets it should be fine to send a .close() event here.
				// but we should really handle unknown errors better on the client.
				return new Response('Room is full', {
					status: 403,
				})
			}

			// all good
			room.handleSocketConnect({
				sessionId,
				socket: serverWebSocket,
				meta: { origin },
			})
			this.writeEvent({
				type: 'connect',
				origin,
				sessionId,
				slug: this.getSlug(),
			})
			return new Response(null, { status: 101, webSocket: clientWebSocket })
		} catch (e) {
			if (e === ROOM_NOT_FOUND) {
				serverWebSocket.close(TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason.NOT_FOUND)
				return new Response(null, { status: 101, webSocket: clientWebSocket })
			}
			throw e
		}
	}

	// For TLSyncRoom
	_room: Promise<TLSocketRoom<TLRecord, { origin: string }>> | null = null

	getSlug() {
		if (!this._slug) {
			throw new Error('slug must be present')
		}
		return this._slug
	}

	getRoom() {
		const slug = this.getSlug()
		if (!this._room) {
			this._room = this.loadFromDatabase(slug).then((result) => {
				return new TLSocketRoom<TLRecord, { origin: string }>({
					schema: makePermissiveSchema(),
					initialSnapshot: result.type === 'room_found' ? result.snapshot : undefined,
					onAfterReceiveMessage: ({ sessionId, meta }) => {
						this.writeEvent({
							type: 'receive_message',
							origin: meta.origin,
							sessionId,
							slug,
						})
					},
					onBeforeSendMessage: ({ sessionId, meta }) => {
						this.writeEvent({
							type: 'send_message',
							origin: meta.origin,
							sessionId,
							slug,
						})
					},
					onSessionRemoved: async (room, args) => {
						if (args.numSessionsRemaining > 0) return
						if (!this._room) return
						try {
							await this.persistToDatabase()
						} catch {
							// already logged
						}
						this._room = null
						room.close()
					},
					onDataChange: () => {
						// when we send a message, we make sure to persist the room
						this.triggerPersistSchedule()
					},
				})
			})
		}
		return this._room
	}

	triggerPersistSchedule = throttle(() => {
		this.schedulePersist()
	}, 2000)

	async loadFromDatabase(persistenceKey: string): Promise<DBLoadResult> {
		try {
			const key = getR2KeyForSlug(persistenceKey)
			// when loading, prefer to fetch documents from the bucket
			const roomFromBucket = await this.r2.get(key)
			if (roomFromBucket) {
				return { type: 'room_found', snapshot: await roomFromBucket.json() }
			}
			return { type: 'room_not_found' }
		} catch (error) {
			console.error('failed to fetch doc', persistenceKey, error)
			return { type: 'error', error: error as Error }
		}
	}

	_lastPersistedClock: number | null = null
	executionQueue = new ExecutionQueue()

	// Save the room to supabase
	async persistToDatabase() {
		this.executionQueue
			.push(async () => {
				// check whether the worker was woken up to persist after having gone to sleep
				if (!this._room) return
				const slug = this.getSlug()
				const room = await this.getRoom()
				const clock = room.getCurrentDocumentClock()
				if (this._lastPersistedClock === clock) return

				const snapshot = JSON.stringify(room.getCurrentSnapshot())

				const key = getR2KeyForSlug(slug)
				await Promise.all([this.r2.put(key, snapshot)])
				this._lastPersistedClock = clock
				// use a shorter timeout for this 'inner' loop than the 'outer' alarm-scheduled loop
				// just in case there's any possibility of setting up a neverending queue
			})
			.catch((e) => {
				this.reportError(e)
			})
	}

	async schedulePersist() {
		const existing = await this.state.storage.getAlarm()
		if (!existing) {
			this.state.storage.setAlarm(PERSIST_INTERVAL_MS)
		}
	}

	// Will be called automatically when the alarm ticks.
	override async alarm() {
		this.persistToDatabase()
	}
}

function getR2KeyForSlug(persistenceKey: string) {
	return `rooms/${persistenceKey}`
}

const ROOM_NOT_FOUND = new Error('Room not found')
const MAX_CONNECTIONS = 30
const PERSIST_INTERVAL_MS = 5000

type DBLoadResult =
	| {
			type: 'error'
			error?: Error | undefined
	  }
	| {
			type: 'room_found'
			snapshot: RoomSnapshot
	  }
	| {
			type: 'room_not_found'
	  }
