/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { SupabaseClient } from '@supabase/supabase-js'
import {
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
	TlaFile,
	TlaFileOpenMode,
	type RoomOpenMode,
} from '@tldraw/dotcom-shared'
import {
	RoomSnapshot,
	TLSocketRoom,
	TLSyncErrorCloseEventCode,
	TLSyncErrorCloseEventReason,
	TLSyncRoom,
	type PersistedRoomSnapshotForSupabase,
} from '@tldraw/sync-core'
import { TLDOCUMENT_ID, TLDocument, TLRecord, createTLSchema } from '@tldraw/tlschema'
import { assert, assertExists, exhaustiveSwitchError } from '@tldraw/utils'
import { ExecutionQueue, createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { AlarmScheduler } from './AlarmScheduler'
import { PERSIST_INTERVAL_MS } from './config'
import { getPostgres } from './getPostgres'
import { getR2KeyForRoom } from './r2'
import { Analytics, DBLoadResult, Environment, TLServerEvent } from './types'
import { createSupabaseClient } from './utils/createSupabaseClient'
import { getReplicator } from './utils/durableObjects'
import { isRateLimited } from './utils/rateLimit'
import { getSlug } from './utils/roomOpenMode'
import { throttle } from './utils/throttle'
import { getAuth } from './utils/tla/getAuth'

const MAX_CONNECTIONS = 50

// increment this any time you make a change to this type
const CURRENT_DOCUMENT_INFO_VERSION = 3
interface DocumentInfo {
	version: number
	slug: string
	isApp: boolean
	// Create mode is used by the app to bypass the 'room not found' check.
	// i.e. if this is a new file it creates the file, even if it wasn't
	// added to the user's app database yet.
	appMode: TlaFileOpenMode
	duplicateId: string | null
	deleted: boolean
}

const ROOM_NOT_FOUND = Symbol('room_not_found')

interface SessionMeta {
	storeId: string
	userId: string | null
}

export class TLDrawDurableObject extends DurableObject {
	// A unique identifier for this instance of the Durable Object
	id: DurableObjectId

	_room: Promise<TLSocketRoom<TLRecord, SessionMeta>> | null = null

	getRoom() {
		if (!this._documentInfo) {
			throw new Error('documentInfo must be present when accessing room')
		}
		const slug = this._documentInfo.slug
		if (!this._room) {
			this._room = this.loadFromDatabase(slug).then(async (result) => {
				switch (result.type) {
					case 'room_found': {
						const room = new TLSocketRoom<TLRecord, SessionMeta>({
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
								} catch {
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
		override env: Environment
	) {
		super(state, env)
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

	readonly router = Router()
		.get(
			`/${ROOM_PREFIX}/:roomId`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_WRITE),
			(req) => this.onRequest(req, ROOM_OPEN_MODE.READ_WRITE)
		)
		.get(
			`/${READ_ONLY_LEGACY_PREFIX}/:roomId`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_ONLY_LEGACY),
			(req) => this.onRequest(req, ROOM_OPEN_MODE.READ_ONLY_LEGACY)
		)
		.get(
			`/${READ_ONLY_PREFIX}/:roomId`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_ONLY),
			(req) => this.onRequest(req, ROOM_OPEN_MODE.READ_ONLY)
		)
		.get(
			`/app/file/:roomId`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_WRITE),
			(req) => this.onRequest(req, ROOM_OPEN_MODE.READ_WRITE)
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
	setDocumentInfo(info: DocumentInfo) {
		this._documentInfo = info
		this.storage.put('documentInfo', info)
	}
	async extractDocumentInfoFromRequest(req: IRequest, roomOpenMode: RoomOpenMode) {
		const slug = assertExists(
			await getSlug(this.env, req.params.roomId, roomOpenMode),
			'roomId must be present'
		)
		const isApp = new URL(req.url).pathname.startsWith('/app/')
		const appMode = isApp
			? (new URL(req.url).searchParams.get('mode') as TlaFileOpenMode) ?? null
			: null

		const duplicateId = isApp ? new URL(req.url).searchParams.get('duplicateId') : null

		if (this._documentInfo) {
			assert(this._documentInfo.slug === slug, 'slug must match')
		} else {
			this.setDocumentInfo({
				version: CURRENT_DOCUMENT_INFO_VERSION,
				slug,
				isApp,
				appMode,
				duplicateId,
				deleted: false,
			})
		}
	}

	// Handle a request to the Durable Object.
	override async fetch(req: IRequest) {
		const sentry = createSentry(this.state, this.env, req)

		try {
			return await this.router.fetch(req)
		} catch (err) {
			console.error(err)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			sentry?.captureException(err)
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}

	_isRestoring = false
	async onRestore(req: IRequest) {
		this._isRestoring = true
		try {
			const roomId = this.documentInfo.slug
			const roomKey = getR2KeyForRoom({ slug: roomId, isApp: this.documentInfo.isApp })
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

	// this might return null if the file doesn't exist yet in the backend, or if it was deleted
	async getAppFileRecord(): Promise<TlaFile | null> {
		const stub = getReplicator(this.env)
		try {
			return await stub.getFileRecord(this.documentInfo.slug)
		} catch (_e) {
			return null
		}
	}

	async onRequest(req: IRequest, openMode: RoomOpenMode) {
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

		const closeSocket = (reason: TLSyncErrorCloseEventReason) => {
			serverWebSocket.close(TLSyncErrorCloseEventCode, reason)
			return new Response(null, { status: 101, webSocket: clientWebSocket })
		}

		if (this.documentInfo.deleted) {
			return closeSocket(TLSyncErrorCloseEventReason.NOT_FOUND)
		}

		const auth = await getAuth(req, this.env)
		if (this.documentInfo.isApp) {
			openMode = ROOM_OPEN_MODE.READ_WRITE
			const file = await this.getAppFileRecord()

			if (file) {
				if (!auth && !file.shared) {
					return closeSocket(TLSyncErrorCloseEventReason.NOT_AUTHENTICATED)
				}
				if (auth?.userId) {
					const rateLimited = await isRateLimited(this.env, auth?.userId)
					if (rateLimited) {
						return closeSocket(TLSyncErrorCloseEventReason.RATE_LIMITED)
					}
				} else {
					const rateLimited = await isRateLimited(this.env, sessionId)
					if (rateLimited) {
						return closeSocket(TLSyncErrorCloseEventReason.RATE_LIMITED)
					}
				}
				if (file.ownerId !== auth?.userId) {
					if (!file.shared) {
						return closeSocket(TLSyncErrorCloseEventReason.FORBIDDEN)
					}
					if (file.sharedLinkType === 'view') {
						openMode = ROOM_OPEN_MODE.READ_ONLY
					}
				}
			} else if (!this.documentInfo.appMode) {
				// If there is no owner that means it's a temporary room, but if they didn't add the create
				// flag don't let them in.
				// This prevents people from just creating rooms by typing extra chars in the URL because we only
				// add that flag in temporary rooms.
				return closeSocket(TLSyncErrorCloseEventReason.NOT_FOUND)
			}
			// otherwise, it's a temporary room and we let them in
		}

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
				meta: {
					storeId,
					userId: auth?.userId ? auth.userId : null,
				},
				isReadonly:
					openMode === ROOM_OPEN_MODE.READ_ONLY || openMode === ROOM_OPEN_MODE.READ_ONLY_LEGACY,
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
				return closeSocket(TLSyncErrorCloseEventReason.NOT_FOUND)
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
			const key = getR2KeyForRoom({ slug, isApp: this.documentInfo.isApp })
			// when loading, prefer to fetch documents from the bucket
			const roomFromBucket = await this.r2.rooms.get(key)
			if (roomFromBucket) {
				return { type: 'room_found', snapshot: await roomFromBucket.json() }
			}

			if (this.documentInfo.appMode === 'create') {
				return {
					type: 'room_found',
					snapshot: new TLSyncRoom({
						schema: createTLSchema(),
					}).getSnapshot(),
				}
			}

			if (this.documentInfo.appMode === 'duplicate') {
				assert(this.documentInfo.duplicateId, 'duplicateId must be present')
				// load the duplicate id
				let data: string | undefined = undefined
				try {
					const otherRoom = this.env.TLDR_DOC.get(
						this.env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${this.documentInfo.duplicateId}`)
					) as any as TLDrawDurableObject
					data = await otherRoom.getCurrentSerializedSnapshot()
				} catch (_e) {
					data = await this.r2.rooms
						.get(getR2KeyForRoom({ slug: this.documentInfo.duplicateId, isApp: true }))
						.then((r) => r?.text())
				}

				if (!data) {
					return { type: 'room_not_found' }
				}
				// otherwise copy the snapshot
				await this.r2.rooms.put(key, data)
				return { type: 'room_found', snapshot: JSON.parse(data) }
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

	executionQueue = new ExecutionQueue()

	// Save the room to r2
	async persistToDatabase() {
		try {
			await this.executionQueue.push(async () => {
				// check whether the worker was woken up to persist after having gone to sleep
				if (!this._room) return
				const slug = this.documentInfo.slug
				const room = await this.getRoom()
				const clock = room.getCurrentDocumentClock()
				if (this._lastPersistedClock === clock) return
				if (this._isRestoring) return

				const snapshot = JSON.stringify(room.getCurrentSnapshot())

				const key = getR2KeyForRoom({ slug: slug, isApp: this.documentInfo.isApp })
				await Promise.all([
					this.r2.rooms.put(key, snapshot),
					this.r2.versionCache.put(key + `/` + new Date().toISOString(), snapshot),
				])
				this._lastPersistedClock = clock

				// Update the updatedAt timestamp in the database
				if (this.documentInfo.isApp) {
					const pg = getPostgres(this.env)
					await pg`UPDATE public.file SET "updatedAt" = ${new Date().getTime()} WHERE id = ${this.documentInfo.slug}`
				}
			})
		} catch (e) {
			this.reportError(e)
		}
	}
	private reportError(e: unknown) {
		const sentryDSN = this.sentryDSN
		if (sentryDSN) {
			const sentry = createSentry(this.state, this.env)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			sentry?.captureException(e)
		}
	}

	async schedulePersist() {
		await this.scheduler.scheduleAlarmAfter('persist', PERSIST_INTERVAL_MS, {
			overwrite: 'if-sooner',
		})
	}

	// Will be called automatically when the alarm ticks.
	override async alarm() {
		await this.scheduler.onAlarm()
	}

	async appFileRecordDidUpdate(file: TlaFile) {
		if (!file) {
			console.error('file record updated but no file found')
			return
		}
		if (!this._documentInfo) {
			this.setDocumentInfo({
				version: CURRENT_DOCUMENT_INFO_VERSION,
				slug: file.id,
				isApp: true,
				appMode: null,
				duplicateId: null,
				deleted: false,
			})
		}
		const room = await this.getRoom()

		// if the app file record updated, it might mean that the file name changed
		const documentRecord = room.getRecord(TLDOCUMENT_ID) as TLDocument
		if (documentRecord.name !== file.name) {
			room.updateStore((store) => {
				store.put({ ...documentRecord, name: file.name })
			})
		}

		// if the app file record updated, it might mean that the sharing state was updated
		// in which case we should kick people out or change their permissions
		const roomIsReadOnlyForGuests = file.shared && file.sharedLinkType === 'view'

		for (const session of room.getSessions()) {
			// allow the owner to stay connected
			if (session.meta.userId === file.ownerId) continue

			if (!file.shared) {
				room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.FORBIDDEN)
			} else if (
				// if the file is still shared but the readonly state changed, make them reconnect
				(session.isReadonly && !roomIsReadOnlyForGuests) ||
				(!session.isReadonly && roomIsReadOnlyForGuests)
			) {
				// not passing a reason means they will try to reconnect
				room.closeSession(session.sessionId)
			}
		}
	}

	async appFileRecordDidDelete() {
		// force isOrWasCreateMode to be false so next open will check the database
		if (this._documentInfo?.deleted) return

		this.setDocumentInfo({
			version: CURRENT_DOCUMENT_INFO_VERSION,
			slug: this.documentInfo.slug,
			isApp: true,
			appMode: null,
			duplicateId: null,
			deleted: true,
		})

		await this.executionQueue.push(async () => {
			const room = await this.getRoom()
			for (const session of room.getSessions()) {
				room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.NOT_FOUND)
			}
			room.close()
			// setting _room to null will prevent any further persists from going through
			this._room = null
			// delete should be handled by the delete endpoint now
		})
	}

	/**
	 * @internal
	 */
	async getCurrentSerializedSnapshot() {
		const room = await this.getRoom()
		return room.getCurrentSerializedSnapshot()
	}
}
