import { RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import {
	TLRecord,
	createTLSchema,
	defaultBindingSchemas,
	defaultShapeSchemas,
} from '@tldraw/tlschema'
import { DurableObject } from 'cloudflare:workers'
import { AutoRouter, IRequest, error } from 'itty-router'
import throttle from 'lodash.throttle'
import { Environment } from './types'

// add custom shapes and bindings here if needed:
const schema = createTLSchema({
	shapes: { ...defaultShapeSchemas },
	bindings: { ...defaultBindingSchemas },
})

// each whiteboard room is hosted in a DurableObject:
// https://developers.cloudflare.com/durable-objects/

// there's only ever one durable object instance per room. it keeps all the room state in memory and
// handles websocket connections. periodically, it persists the room state to the R2 bucket.
export class TldrawDurableObject extends DurableObject<Environment> {
	private r2: R2Bucket
	// the room ID will be missing whilst the room is being initialized
	private roomId: string | null = null
	// when we load the room from the R2 bucket, we keep it here. it's a promise so we only ever
	// load it once.
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
	})
		// when we get a connection request, we stash the room id if needed and handle the connection
		.get('/connect/:roomId', async (request) => {
			if (!this.roomId) {
				await this.ctx.blockConcurrencyWhile(async () => {
					await this.ctx.storage.put('roomId', request.params.roomId)
					this.roomId = request.params.roomId
				})
			}
			return this.handleConnect(request)
		})

	// `fetch` is the entry point for all requests to the Durable Object
	fetch(request: Request): Response | Promise<Response> {
		return this.router.fetch(request)
	}

	// what happens when someone tries to connect to this room?
	async handleConnect(request: IRequest): Promise<Response> {
		// extract query params from request, should include instanceId
		const sessionKey = request.query.sessionKey as string
		if (!sessionKey) return error(400, 'Missing sessionKey')

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()

		// load the room, or retrieve it if it's already loaded
		const room = await this.getRoom()

		// connect the client to the room
		room.handleSocketConnect(sessionKey, serverWebSocket)

		// return the websocket connection to the client
		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}

	getRoom() {
		const roomId = this.roomId
		if (!roomId) throw new Error('Missing roomId')

		if (!this.roomPromise) {
			this.roomPromise = (async () => {
				// fetch the room from R2
				const roomFromBucket = await this.r2.get(`rooms/${roomId}`)

				// if it doesn't exist, we'll just create a new empty room
				const initialSnapshot = roomFromBucket
					? ((await roomFromBucket.json()) as RoomSnapshot)
					: undefined

				// create a new TLSocketRoom. This handles all the sync protocol & websocket connections.
				// it's up to us to persist the room state to R2 when needed though.
				return new TLSocketRoom<TLRecord, void>({
					schema,
					initialSnapshot,
					onSessionRemoved: async (_room, args) => {
						// persist whenever the number of active sessions drops to zero
						if (args.numSessionsRemaining > 0) return
						await this.schedulePersistToR2()
					},
					onDataChange: () => {
						// and persist whenever the data in the room changes
						this.schedulePersistToR2()
					},
				})
			})()
		}

		return this.roomPromise
	}

	// we throttle persistance so it only happens every 10 seconds
	schedulePersistToR2 = throttle(async () => {
		if (!this.roomPromise || !this.roomId) return
		const room = await this.getRoom()

		// only persist the room if it's changed since last time
		const clock = room.getCurrentDocumentClock()
		if (this.lastPersistedClock === clock) return

		// convert the room to JSON and upload it to R2
		const snapshot = JSON.stringify(room.getCurrentSnapshot())
		await this.r2.put(`rooms/${this.roomId}`, snapshot)

		this.lastPersistedClock = clock
	}, 10_000)
	lastPersistedClock = 0
}
