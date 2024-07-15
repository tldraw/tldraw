import { RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import { TLRecord, createTLSchema } from '@tldraw/tlschema'
import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, IRequest, error } from 'itty-router'
import throttle from 'lodash.throttle'
import { Environment } from './types'

const schema = createTLSchema()

export class TldrawDurableObject extends DurableObject<Environment> {
	private r2: R2Bucket
	private roomId: string | null = null
	private roomPromise: Promise<TLSocketRoom<TLRecord, void>> | null = null

	constructor(state: DurableObjectState, env: Environment) {
		super(state, env)
		this.r2 = env.TLDRAW_BUCKET

		state.blockConcurrencyWhile(async () => {
			this.roomId = ((await this.ctx.storage.get('roomId')) ?? null) as string | null
		})
	}

	private readonly router = AutoRouter({
		catch: (e) => {
			console.log(e)
			return error(e)
		},
	}).get('/connect/:roomId', async (request) => {
		if (!this.roomId) {
			await this.ctx.blockConcurrencyWhile(async () => {
				await this.ctx.storage.put('roomId', request.params.roomId)
				this.roomId = request.params.roomId
			})
		}
		return this.handleConnect(request)
	})

	fetch(request: Request): Response | Promise<Response> {
		return this.router.fetch(request)
	}

	async handleConnect(request: IRequest): Promise<Response> {
		// extract query params from request, should include instanceId
		const sessionKey = request.query.sessionKey as string
		if (!sessionKey) return error(400, 'Missing sessionKey')

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()

		const room = await this.getRoom()

		// all good
		room.handleSocketConnect(sessionKey, serverWebSocket)
		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}

	getRoom() {
		const roomId = this.roomId
		if (!roomId) throw new Error('Missing roomId')

		if (!this.roomPromise) {
			this.roomPromise = (async () => {
				const roomFromBucket = await this.r2.get(`rooms/${roomId}`)
				const initialSnapshot = roomFromBucket
					? ((await roomFromBucket.json()) as RoomSnapshot)
					: undefined

				return new TLSocketRoom<TLRecord, void>({
					schema,
					initialSnapshot,
					onSessionRemoved: async (_room, args) => {
						if (args.numSessionsRemaining > 0) return
						await this.persistToR2()
					},
					onDataChange: () => {
						// when we send a message, we make sure to persist the room
						this.persistToR2()
					},
				})
			})()
		}
		return this.roomPromise
	}

	lastPersistedClock = 0
	persistToR2 = throttle(async () => {
		if (!this.roomPromise || !this.roomId) return
		const room = await this.getRoom()
		const clock = room.getCurrentDocumentClock()
		if (this.lastPersistedClock === clock) return

		const snapshot = JSON.stringify(room.getCurrentSnapshot())

		await this.r2.put(`rooms/${this.roomId}`, snapshot)
		this.lastPersistedClock = clock
	}, 10_000)
}
