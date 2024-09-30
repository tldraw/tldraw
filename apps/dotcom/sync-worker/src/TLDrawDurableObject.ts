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
	RoomSnapshot,
	TLCloseEventCode,
	TLSocketRoom,
	TLSyncRoom,
	type PersistedRoomSnapshotForSupabase,
} from '@tldraw/sync-core'
import { TLRecord, createTLSchema } from '@tldraw/tlschema'
import { assert, assertExists, exhaustiveSwitchError } from '@tldraw/utils'
import { createPersistQueue, createSentry } from '@tldraw/worker-shared'
import { IRequest, Router } from 'itty-router'
import { AlarmScheduler } from './AlarmScheduler'
import { PERSIST_INTERVAL_MS } from './config'
import { getR2KeyForRoom } from './r2'
import { Analytics, DBLoadResult, Environment, TLServerEvent } from './types'
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

const ROOM_NOT_FOUND = Symbol('room_not_found')

export class TLDrawDurableObject {
	// A unique identifier for this instance of the Durable Object
	id: DurableObjectId

	// For TLSyncRoom
	_room: Promise<TLSocketRoom<TLRecord, { storeId: string }>> | null = null

	getRoom() {
		if (!this._documentInfo) {
			throw new Error('documentInfo must be present when accessing room')
		}
		const slug = this._documentInfo.slug
		if (!this._room) {
			this._room = this.loadFromDatabase(slug).then((result) => {
				switch (result.type) {
					case 'room_found': {
						const room = new TLSocketRoom<TLRecord, { storeId: string }>({
							initialSnapshot: result.snapshot,
							onSessionRemoved: async (room, args) => {
								this.logEvent({
									type: 'client',
									roomId: slug,
									name: 'leave',
									instanceId: args.sessionId,
									localClientId: args.meta.storeId,
								})

								if (args.numSessionsRemaining > 0) return
								if (!this._room) return
								this.logEvent({
									type: 'client',
									roomId: slug,
									name: 'last_out',
									instanceId: args.sessionId,
									localClientId: args.meta.storeId,
								})
								try {
									await this.persistToDatabase()
								} catch (err) {
									// already logged
								}
								// make sure nobody joined the room while we were persisting
								if (room.getNumActiveSessions() > 0) return
								this._room = null
								this.logEvent({ type: 'room', roomId: slug, name: 'room_empty' })
								room.close()
							},
							onDataChange: () => {
								this.triggerPersistSchedule()
							},
							onBeforeSendMessage: ({ message, stringified }) => {
								this.logEvent({
									type: 'send_message',
									roomId: slug,
									messageType: message.type,
									messageLength: stringified.length,
								})
							},
						})
						this.logEvent({ type: 'room', roomId: slug, name: 'room_start' })
						return room
					}
					case 'room_not_found': {
						throw ROOM_NOT_FOUND
					}
					case 'error': {
						throw result.error
					}
					default: {
						exhaustiveSwitchError(result)
					}
				}
			})
		}
		return this._room
	}

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
		private state: DurableObjectState,
		private env: Environment
	) {
		this.id = state.id
		this.storage = state.storage
		this.sentryDSN = env.SENTRY_DSN
		this.measure = env.MEASURE
		this.supabaseClient = createSupabaseClient(env)

		this.supabaseTable = env.TLDRAW_ENV === 'production' ? 'drawings' : 'drawings_staging'
		this.r2 = {
			rooms: env.ROOMS,
			versionCache: env.ROOMS_HISTORY_EPHEMERAL,
		}

		state.blockConcurrencyWhile(async () => {
			const existingDocumentInfo = (await this.storage.get('documentInfo')) as DocumentInfo | null
			if (existingDocumentInfo?.version !== CURRENT_DOCUMENT_INFO_VERSION) {
				this._documentInfo = null
			} else {
				this._documentInfo = existingDocumentInfo
			}
		})
	}

	_isApp: boolean | null = null

	_setIsApp(isApp: boolean) {
		if (this._isApp === null) {
			this._isApp = isApp
		} else if (this._isApp !== isApp) {
			throw new Error('Cannot change app status')
		}
	}

	readonly router = Router()
		.all('*', (req) => {
			const pathname = new URL(req.url).pathname
			const isApp = pathname.startsWith('/app/')
			this._setIsApp(isApp)
		})
		.get(
			`/${ROOM_PREFIX}/:roomId`,
			this._setIsApp.bind(this, false),
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
		.get(
			`/app/file/:roomId`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_WRITE),
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
				this.persistToDatabase()
			},
		},
	})

	// eslint-disable-next-line no-restricted-syntax
	get documentInfo() {
		return assertExists(this._documentInfo, 'documentInfo must be present')
	}
	async extractDocumentInfoFromRequest(req: IRequest, roomOpenMode: RoomOpenMode) {
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
		const sentry = createSentry(this.state, this.env, req)

		try {
			return await this.router.fetch(req)
		} catch (err) {
			console.error(err)
			// eslint-disable-next-line deprecation/deprecation
			sentry?.captureException(err)
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}

	// eslint-disable-next-line no-restricted-syntax
	get isApp(): boolean {
		return assertExists(this._isApp, 'isApp must be present')
	}

	_isRestoring = false
	async onRestore(req: IRequest) {
		this._isRestoring = true
		try {
			const roomId = this.documentInfo.slug
			const roomKey = getR2KeyForRoom({ slug: roomId, isApp: this.isApp })
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
			const room = await this.getRoom()

			const snapshot: RoomSnapshot = JSON.parse(dataText)
			room.loadSnapshot(snapshot)

			return new Response()
		} finally {
			this._isRestoring = false
		}
	}

	async onRequest(req: IRequest) {
		// extract query params from request, should include instanceId
		const url = new URL(req.url)
		const params = Object.fromEntries(url.searchParams.entries())
		let { sessionId, storeId } = params

		// handle legacy param names
		sessionId ??= params.sessionKey ?? params.instanceId
		storeId ??= params.localClientId
		const isNewSession = !this._room

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()

		try {
			const room = await this.getRoom()
			// Don't connect if we're already at max connections
			if (room.getNumActiveSessions() >= MAX_CONNECTIONS) {
				return new Response('Room is full', { status: 403 })
			}

			// all good
			room.handleSocketConnect({
				sessionId: sessionId,
				socket: serverWebSocket,
				meta: { storeId },
			})
			if (isNewSession) {
				this.logEvent({
					type: 'client',
					roomId: this.documentInfo.slug,
					name: 'room_reopen',
					instanceId: sessionId,
					localClientId: storeId,
				})
			}
			this.logEvent({
				type: 'client',
				roomId: this.documentInfo.slug,
				name: 'enter',
				instanceId: sessionId,
				localClientId: storeId,
			})
			return new Response(null, { status: 101, webSocket: clientWebSocket })
		} catch (e) {
			if (e === ROOM_NOT_FOUND) {
				serverWebSocket.close(TLCloseEventCode.NOT_FOUND, 'Room not found')
				return new Response(null, { status: 101, webSocket: clientWebSocket })
			}
			throw e
		}
	}

	triggerPersistSchedule = throttle(() => {
		this.schedulePersist()
	}, 2000)

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
					blobs: [event.roomId, 'unused', event.instanceId],
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

	// Load the room's drawing data. First we check the R2 bucket, then we fallback to supabase (legacy).
	async loadFromDatabase(slug: string): Promise<DBLoadResult> {
		try {
			const key = getR2KeyForRoom({ slug, isApp: this.isApp })
			// when loading, prefer to fetch documents from the bucket
			const roomFromBucket = await this.r2.rooms.get(key)
			if (roomFromBucket) {
				return { type: 'room_found', snapshot: await roomFromBucket.json() }
			}

			if (this.isApp) {
				return {
					type: 'room_found',
					snapshot: new TLSyncRoom({
						schema: createTLSchema(),
					}).getSnapshot(),
				}
			}

			// if we don't have a room in the bucket, try to load from supabase
			if (!this.supabaseClient) return { type: 'room_not_found' }
			const { data, error } = await this.supabaseClient
				.from(this.supabaseTable)
				.select('*')
				.eq('slug', slug)

			if (error) {
				this.logEvent({ type: 'room', roomId: slug, name: 'failed_load_from_db' })

				console.error('failed to retrieve document', slug, error)
				return { type: 'error', error: new Error(error.message) }
			}
			// if it didn't find a document, data will be an empty array
			if (data.length === 0) {
				return { type: 'room_not_found' }
			}

			const roomFromSupabase = data[0] as PersistedRoomSnapshotForSupabase
			return { type: 'room_found', snapshot: roomFromSupabase.drawing }
		} catch (error) {
			this.logEvent({ type: 'room', roomId: slug, name: 'failed_load_from_db' })

			console.error('failed to fetch doc', slug, error)
			return { type: 'error', error: error as Error }
		}
	}

	_lastPersistedClock: number | null = null
	_persistQueue = createPersistQueue(async () => {
		// check whether the worker was woken up to persist after having gone to sleep
		if (!this._room) return
		const slug = this.documentInfo.slug
		const room = await this.getRoom()
		const clock = room.getCurrentDocumentClock()
		if (this._lastPersistedClock === clock) return
		if (this._isRestoring) return

		const snapshot = JSON.stringify(room.getCurrentSnapshot())

		const key = getR2KeyForRoom({ slug: slug, isApp: this.isApp })
		await Promise.all([
			this.r2.rooms.put(key, snapshot),
			this.r2.versionCache.put(key + `/` + new Date().toISOString(), snapshot),
		])
		this._lastPersistedClock = clock
		// use a shorter timeout for this 'inner' loop than the 'outer' alarm-scheduled loop
		// just in case there's any possibility of setting up a neverending queue
	}, PERSIST_INTERVAL_MS / 2)

	// Save the room to supabase
	async persistToDatabase() {
		await this._persistQueue()
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
