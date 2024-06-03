/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { SupabaseClient } from '@supabase/supabase-js'
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
	type RoomOpenMode,
} from '@tldraw/dotcom-shared'
import {
	DBLoadResultType,
	RoomSnapshot,
	TLCloseEventCode,
	TLServer,
	TLServerEvent,
	TLSyncRoom,
	type DBLoadResult,
	type PersistedRoomSnapshotForSupabase,
	type RoomState,
} from '@tldraw/tlsync'
import { assert, assertExists, exhaustiveSwitchError } from '@tldraw/utils'
import { IRequest, Router } from 'itty-router'
import Toucan from 'toucan-js'
import { AlarmScheduler } from './AlarmScheduler'
import { PERSIST_INTERVAL_MS } from './config'
import { getR2KeyForRoom } from './r2'
import { Analytics, Environment } from './types'
import { createSupabaseClient } from './utils/createSupabaseClient'
import { getSlug } from './utils/roomOpenMode'
import { throttle } from './utils/throttle'

const MAX_CONNECTIONS = 50

// increment this any time you make a change to this type
const CURRENT_DOCUMENT_INFO_VERSION = 0
interface DocumentInfo {
	version: number
	slug: string
}

export class TLDrawDurableObject extends TLServer {
	// A unique identifier for this instance of the Durable Object
	id: DurableObjectId

	// For TLSyncRoom
	_roomState: RoomState | undefined

	// For storage
	storage: DurableObjectStorage

	// For persistence
	supabaseClient: SupabaseClient | void

	// For analytics
	measure: Analytics | undefined

	// For error tracking
	sentryDSN: string | undefined

	readonly supabaseTable: string
	readonly r2: {
		readonly rooms: R2Bucket
		readonly versionCache: R2Bucket
	}

	_documentInfo: DocumentInfo | null = null

	constructor(
		private controller: DurableObjectState,
		private env: Environment
	) {
		super()

		this.id = controller.id
		this.storage = controller.storage
		this.sentryDSN = env.SENTRY_DSN
		this.measure = env.MEASURE
		this.supabaseClient = createSupabaseClient(env)

		this.supabaseTable = env.TLDRAW_ENV === 'production' ? 'drawings' : 'drawings_staging'
		this.r2 = {
			rooms: env.ROOMS,
			versionCache: env.ROOMS_HISTORY_EPHEMERAL,
		}

		controller.blockConcurrencyWhile(async () => {
			const existingDocumentInfo = (await this.storage.get('documentInfo')) as DocumentInfo | null
			if (existingDocumentInfo?.version !== CURRENT_DOCUMENT_INFO_VERSION) {
				this._documentInfo = null
			} else {
				this._documentInfo = existingDocumentInfo
			}
		})
	}

	readonly router = Router()
		.get(
			`/${ROOM_PREFIX}/:roomId`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_WRITE),
			(req) => this.onRequest(req)
		)
		.get(
			`/${READ_ONLY_LEGACY_PREFIX}/:roomId`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_ONLY_LEGACY),
			(req) => this.onRequest(req)
		)
		.get(
			`/${READ_ONLY_PREFIX}/:roomId`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_ONLY),
			(req) => this.onRequest(req)
		)
		.post(
			`/${ROOM_PREFIX}/:roomId/restore`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_WRITE),
			(req) => this.onRestore(req)
		)
		.all('*', () => new Response('Not found', { status: 404 }))

	readonly scheduler = new AlarmScheduler({
		storage: () => this.storage,
		alarms: {
			persist: async () => {
				const room = this.getRoomForPersistenceKey(this.documentInfo.slug)
				if (!room) return
				this.persistToDatabase(room.persistenceKey)
			},
		},
	})

	// eslint-disable-next-line no-restricted-syntax
	get documentInfo() {
		return assertExists(this._documentInfo, 'documentInfo must be present')
	}
	extractDocumentInfoFromRequest = async (req: IRequest, roomOpenMode: RoomOpenMode) => {
		const slug = assertExists(
			await getSlug(this.env, req.params.roomId, roomOpenMode),
			'roomId must be present'
		)
		if (this._documentInfo) {
			assert(this._documentInfo.slug === slug, 'slug must match')
		} else {
			this._documentInfo = {
				version: CURRENT_DOCUMENT_INFO_VERSION,
				slug,
			}
		}
	}

	// Handle a request to the Durable Object.
	async fetch(req: IRequest) {
		const sentry = new Toucan({
			dsn: this.sentryDSN,
			request: req,
			allowedHeaders: ['user-agent'],
			allowedSearchParams: /(.*)/,
		})

		try {
			return await this.router.handle(req).catch((err) => {
				console.error(err)
				sentry.captureException(err)

				return new Response('Something went wrong', {
					status: 500,
					statusText: 'Internal Server Error',
				})
			})
		} catch (err) {
			sentry.captureException(err)
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}

	async onRestore(req: IRequest) {
		const roomId = this.documentInfo.slug
		const roomKey = getR2KeyForRoom(roomId)
		const timestamp = ((await req.json()) as any).timestamp
		if (!timestamp) {
			return new Response('Missing timestamp', { status: 400 })
		}
		const data = await this.r2.versionCache.get(`${roomKey}/${timestamp}`)
		if (!data) {
			return new Response('Version not found', { status: 400 })
		}
		const dataText = await data.text()
		await this.r2.rooms.put(roomKey, dataText)
		const roomState = this.getRoomForPersistenceKey(roomId)
		if (!roomState) {
			// nothing else to do because the room is not currently in use
			return new Response()
		}
		const snapshot: RoomSnapshot = JSON.parse(dataText)
		const oldRoom = roomState.room
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

		const newRoom = new TLSyncRoom(roomState.room.schema, {
			clock: oldRoom.clock + 1,
			documents: snapshot.documents.map((d) => ({
				lastChangedClock: oldRoom.clock + 1,
				state: d.state,
			})),
			schema: snapshot.schema,
			tombstones,
		})

		// replace room with new one and kick out all the clients
		this.setRoomState(this.documentInfo.slug, { ...roomState, room: newRoom })
		oldRoom.close()

		return new Response()
	}

	async onRequest(req: IRequest) {
		// extract query params from request, should include instanceId
		const url = new URL(req.url)
		const params = Object.fromEntries(url.searchParams.entries())
		let { sessionKey, storeId } = params

		// handle legacy param names
		sessionKey ??= params.instanceId
		storeId ??= params.localClientId

		// Don't connect if we're already at max connections
		const roomState = this.getRoomForPersistenceKey(this.documentInfo.slug)
		if (roomState !== undefined) {
			if (roomState.room.sessions.size >= MAX_CONNECTIONS) {
				return new Response('Room is full', {
					status: 403,
				})
			}
		}

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()

		// Handle the connection (see TLServer)
		let connectionResult: DBLoadResultType
		try {
			// block concurrency while initializing the room if that needs to happen
			connectionResult = await this.controller.blockConcurrencyWhile(() =>
				this.handleConnection({
					socket: serverWebSocket as any,
					persistenceKey: this.documentInfo.slug!,
					sessionKey,
					storeId,
				})
			)
		} catch (e: any) {
			console.error(e)
			return new Response(e.message, { status: 500 })
		}

		// Accept the websocket connection
		serverWebSocket.accept()
		serverWebSocket.addEventListener(
			'message',
			throttle(() => {
				this.schedulePersist()
			}, 2000)
		)
		serverWebSocket.addEventListener('close', () => {
			this.schedulePersist()
		})

		if (connectionResult === 'room_not_found') {
			// If the room is not found, we need to accept and then immediately close the connection
			// with our custom close code.
			serverWebSocket.close(TLCloseEventCode.NOT_FOUND, 'Room not found')
		}

		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}

	private writeEvent(
		name: string,
		{ blobs, indexes, doubles }: { blobs?: string[]; indexes?: [string]; doubles?: number[] }
	) {
		this.measure?.writeDataPoint({
			blobs: [name, this.env.WORKER_NAME ?? 'development-tldraw-multiplayer', ...(blobs ?? [])],
			doubles,
			indexes,
		})
	}

	logEvent(event: TLServerEvent) {
		switch (event.type) {
			case 'room': {
				// we would add user/connection ids here if we could
				this.writeEvent(event.name, { blobs: [event.roomId] })
				break
			}
			case 'client': {
				// we would add user/connection ids here if we could
				this.writeEvent(event.name, {
					blobs: [event.roomId, event.clientId, event.instanceId],
					indexes: [event.localClientId],
				})
				break
			}
			case 'send_message': {
				this.writeEvent(event.type, {
					blobs: [event.roomId, event.messageType],
					doubles: [event.messageLength],
				})
				break
			}
			default: {
				exhaustiveSwitchError(event)
			}
		}
	}

	getRoomForPersistenceKey(_persistenceKey: string): RoomState | undefined {
		return this._roomState // only one room per worker
	}

	setRoomState(_persistenceKey: string, roomState: RoomState): void {
		this.deleteRoomState()
		this._roomState = roomState
	}

	deleteRoomState(): void {
		this._roomState = undefined
	}

	// Load the room's drawing data. First we check the R2 bucket, then we fallback to supabase (legacy).
	override async loadFromDatabase(persistenceKey: string): Promise<DBLoadResult> {
		try {
			const key = getR2KeyForRoom(persistenceKey)
			// when loading, prefer to fetch documents from the bucket
			const roomFromBucket = await this.r2.rooms.get(key)
			if (roomFromBucket) {
				return { type: 'room_found', snapshot: await roomFromBucket.json() }
			}

			// if we don't have a room in the bucket, try to load from supabase
			if (!this.supabaseClient) return { type: 'room_not_found' }
			const { data, error } = await this.supabaseClient
				.from(this.supabaseTable)
				.select('*')
				.eq('slug', persistenceKey)

			if (error) {
				this.logEvent({ type: 'room', roomId: persistenceKey, name: 'failed_load_from_db' })

				console.error('failed to retrieve document', persistenceKey, error)
				return { type: 'error', error: new Error(error.message) }
			}
			// if it didn't find a document, data will be an empty array
			if (data.length === 0) {
				return { type: 'room_not_found' }
			}

			const roomFromSupabase = data[0] as PersistedRoomSnapshotForSupabase
			return { type: 'room_found', snapshot: roomFromSupabase.drawing }
		} catch (error) {
			this.logEvent({ type: 'room', roomId: persistenceKey, name: 'failed_load_from_db' })

			console.error('failed to fetch doc', persistenceKey, error)
			return { type: 'error', error: error as Error }
		}
	}

	_isPersisting = false
	_lastPersistedClock: number | null = null

	// Save the room to supabase
	async persistToDatabase(persistenceKey: string) {
		if (this._isPersisting) {
			setTimeout(() => {
				this.schedulePersist()
			}, 5000)
			return
		}

		try {
			this._isPersisting = true

			const roomState = this.getRoomForPersistenceKey(persistenceKey)
			if (!roomState) {
				// room was closed
				return
			}

			const { room } = roomState
			const { clock } = room
			if (this._lastPersistedClock === clock) return

			try {
				const snapshot = JSON.stringify(room.getSnapshot())

				const key = getR2KeyForRoom(persistenceKey)
				await Promise.all([
					this.r2.rooms.put(key, snapshot),
					this.r2.versionCache.put(key + `/` + new Date().toISOString(), snapshot),
				])
				this._lastPersistedClock = clock
			} catch (error) {
				this.logEvent({ type: 'room', roomId: persistenceKey, name: 'failed_persist_to_db' })
				console.error('failed to persist document', persistenceKey, error)
				throw error
			}
		} finally {
			this._isPersisting = false
		}
	}

	async schedulePersist() {
		await this.scheduler.scheduleAlarmAfter('persist', PERSIST_INTERVAL_MS, {
			overwrite: 'if-sooner',
		})
	}

	// Will be called automatically when the alarm ticks.
	async alarm() {
		await this.scheduler.onAlarm()
	}
}
