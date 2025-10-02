/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { SupabaseClient } from '@supabase/supabase-js'
import {
	APP_ASSET_UPLOAD_ENDPOINT,
	DB,
	FILE_PREFIX,
	LOCAL_FILE_PREFIX,
	PUBLISH_PREFIX,
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
	ROOM_SIZE_LIMIT_MB,
	SNAPSHOT_PREFIX,
	TlaFile,
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
import {
	ExecutionQueue,
	assert,
	assertExists,
	exhaustiveSwitchError,
	retry,
	uniqueId,
} from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { Kysely } from 'kysely'
import { PERSIST_INTERVAL_MS } from './config'
import { createPostgresConnectionPool } from './postgres'
import { getR2KeyForRoom } from './r2'
import { getPublishedRoomSnapshot } from './routes/tla/getPublishedFile'
import { generateSnapshotChunks } from './snapshotUtils'
import { Analytics, DBLoadResult, Environment, TLServerEvent } from './types'
import { EventData, writeDataPoint } from './utils/analytics'
import { createSupabaseClient } from './utils/createSupabaseClient'
import { getRoomDurableObject } from './utils/durableObjects'
import { isRateLimited } from './utils/rateLimit'
import { getSlug } from './utils/roomOpenMode'
import { throttle } from './utils/throttle'
import { getAuth, requireAdminAccess, requireWriteAccessToFile } from './utils/tla/getAuth'
import { getLegacyRoomData } from './utils/tla/getLegacyRoomData'
import { isTestFile } from './utils/tla/isTestFile'

const MAX_CONNECTIONS = 50

// increment this any time you make a change to this type
const CURRENT_DOCUMENT_INFO_VERSION = 3
interface DocumentInfo {
	version: number
	slug: string
	isApp: boolean
	deleted: boolean
}

const ROOM_NOT_FOUND = Symbol('room_not_found')

interface SessionMeta {
	storeId: string
	userId: string | null
}

async function canAccessTestProductionFile(
	env: Environment,
	auth: { userId: string } | null
): Promise<boolean> {
	try {
		await requireAdminAccess(env, auth)
		return true
	} catch (_e) {
		return false
	}
}

const MB = 1024 * 1024

export class TLDrawDurableObject extends DurableObject {
	// A unique identifier for this instance of the Durable Object
	id: DurableObjectId

	_room: Promise<TLSocketRoom<TLRecord, SessionMeta>> | null = null

	sentry: ReturnType<typeof createSentry> | null = null

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
								this.triggerPersist()
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
						this.addRoomStorageUsedPercentage(room, result.roomSizeMB, false)

						this.logEvent({ type: 'room', roomId: slug, name: 'room_start' })
						// Also associate file assets after we load the room
						setTimeout(this.maybeAssociateFileAssets.bind(this), PERSIST_INTERVAL_MS)
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

	db: Kysely<DB>

	constructor(
		private state: DurableObjectState,
		override env: Environment
	) {
		super(state, env)
		this.id = state.id
		this.storage = state.storage
		this.sentryDSN = env.SENTRY_DSN
		this.measure = env.MEASURE
		this.sentry = createSentry(this.state, this.env)
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
		this.db = createPostgresConnectionPool(env, 'TLDrawDurableObject')
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
		.post(
			`/app/file/:roomId/restore`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_WRITE),
			(req) => this.onRestore(req)
		)
		.all('*', () => new Response('Not found', { status: 404 }))

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

		if (this._documentInfo) {
			assert(this._documentInfo.slug === slug, 'slug must match')
		} else {
			this.setDocumentInfo({
				version: CURRENT_DOCUMENT_INFO_VERSION,
				slug,
				isApp,
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
			if (this.documentInfo.isApp) {
				await requireWriteAccessToFile(req, this.env, this.documentInfo.slug)
			}
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
			this.maybeAssociateFileAssets()

			return new Response()
		} finally {
			this._isRestoring = false
		}
	}

	// this might return null if the file doesn't exist yet in the backend, or if it was deleted
	_fileRecordCache: TlaFile | null = null
	async getAppFileRecord(): Promise<TlaFile | null> {
		try {
			return await retry(
				async () => {
					if (this._fileRecordCache) {
						return this._fileRecordCache
					}
					const result = await this.db
						.selectFrom('file')
						.where('id', '=', this.documentInfo.slug)
						.selectAll()
						.executeTakeFirst()
					if (!result) {
						throw new Error('File not found')
					}
					this._fileRecordCache = result
					return this._fileRecordCache
				},
				{
					attempts: 10,
					waitDuration: 100,
				}
			)
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
				if (file.isDeleted) {
					return closeSocket(TLSyncErrorCloseEventReason.NOT_FOUND)
				}

				if (isTestFile(file.id) && !(await canAccessTestProductionFile(this.env, auth))) {
					return closeSocket(TLSyncErrorCloseEventReason.NOT_FOUND)
				}

				if (!auth && !file.shared) {
					return closeSocket(TLSyncErrorCloseEventReason.NOT_AUTHENTICATED)
				}
				if (auth?.userId) {
					const rateLimited = await isRateLimited(this.env, auth?.userId)
					if (rateLimited) {
						this.logEvent({
							type: 'client',
							userId: auth.userId,
							localClientId: storeId,
							name: 'rate_limited',
						})
						return closeSocket(TLSyncErrorCloseEventReason.RATE_LIMITED)
					}
				} else {
					const rateLimited = await isRateLimited(this.env, sessionId)
					if (rateLimited) {
						this.logEvent({
							type: 'client',
							userId: auth?.userId,
							localClientId: storeId,
							name: 'rate_limited',
						})
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
			}
		} else {
			// Legacy rooms are now read-only
			openMode = ROOM_OPEN_MODE.READ_ONLY
		}

		try {
			const room = await this.getRoom()
			// Don't connect if we're already at max connections
			if (room.getNumActiveSessions() > MAX_CONNECTIONS) {
				return closeSocket(TLSyncErrorCloseEventReason.ROOM_FULL)
			}

			// all good
			room.handleSocketConnect({
				sessionId: sessionId,
				socket: serverWebSocket,
				meta: {
					storeId,
					userId: auth?.userId ? auth.userId : null,
				},
				isReadonly: openMode === ROOM_OPEN_MODE.READ_ONLY,
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

	triggerPersist = throttle(() => {
		this.persistToDatabase()
	}, PERSIST_INTERVAL_MS)

	private writeEvent(name: string, eventData: EventData) {
		writeDataPoint(this.sentry, this.measure, this.env, name, eventData)
	}

	logEvent(event: TLServerEvent) {
		switch (event.type) {
			case 'room': {
				// we would add user/connection ids here if we could
				this.writeEvent(event.name, { blobs: [event.roomId] })
				break
			}
			case 'client': {
				if (event.name === 'rate_limited') {
					this.writeEvent(event.name, {
						blobs: [event.userId ?? 'anon-user'],
						indexes: [event.localClientId],
					})
				} else {
					// we would add user/connection ids here if we could
					this.writeEvent(event.name, {
						blobs: [event.roomId, 'unused', event.instanceId],
						indexes: [event.localClientId],
					})
				}
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

	async handleFileCreateFromSource() {
		assert(this._fileRecordCache, 'we need to have a file record to create a file from source')
		const split = this._fileRecordCache.createSource?.split('/')
		if (!split || split?.length !== 2) {
			return { type: 'room_not_found' as const }
		}

		let data: RoomSnapshot | string | null | undefined = undefined
		const [prefix, id] = split
		switch (prefix) {
			case FILE_PREFIX: {
				await getRoomDurableObject(this.env, id).awaitPersist()
				data = await this.r2.rooms
					.get(getR2KeyForRoom({ slug: id, isApp: true }))
					.then((r) => r?.text())
				break
			}
			case ROOM_PREFIX:
				data = await getLegacyRoomData(this.env, id, ROOM_OPEN_MODE.READ_WRITE)
				break
			case READ_ONLY_PREFIX:
				data = await getLegacyRoomData(this.env, id, ROOM_OPEN_MODE.READ_ONLY)
				break
			case READ_ONLY_LEGACY_PREFIX:
				data = await getLegacyRoomData(this.env, id, ROOM_OPEN_MODE.READ_ONLY_LEGACY)
				break
			case SNAPSHOT_PREFIX:
				data = await getLegacyRoomData(this.env, id, 'snapshot')
				break
			case PUBLISH_PREFIX:
				data = await getPublishedRoomSnapshot(this.env, id)
				break
			case LOCAL_FILE_PREFIX:
				// create empty room, the client will populate it
				data = new TLSyncRoom({ schema: createTLSchema() }).getSnapshot()
				break
		}

		if (!data) {
			return { type: 'room_not_found' as const }
		}
		const serialized = typeof data === 'string' ? data : JSON.stringify(data)
		const snapshot = typeof data === 'string' ? JSON.parse(data) : data
		const roomObject = await this.r2.rooms.put(this._fileRecordCache.id, serialized)
		return {
			type: 'room_found' as const,
			snapshot,
			roomSizeMB: roomObject ? roomObject.size / MB : 0,
		}
	}

	// Load the room's drawing data. First we check the R2 bucket, then we fallback to supabase (legacy).
	async loadFromDatabase(slug: string): Promise<DBLoadResult> {
		try {
			const key = getR2KeyForRoom({ slug, isApp: this.documentInfo.isApp })
			// when loading, prefer to fetch documents from the bucket
			const roomFromBucket = await this.r2.rooms.get(key)
			if (roomFromBucket) {
				return {
					type: 'room_found',
					snapshot: await roomFromBucket.json(),
					roomSizeMB: roomFromBucket.size / MB,
				}
			}
			if (this._fileRecordCache?.createSource) {
				const res = await this.handleFileCreateFromSource()
				if (res.type === 'room_found') {
					// save it to the bucket so we don't try to create from source again
					await this.r2.rooms.put(key, JSON.stringify(res.snapshot))
				}
				return res
			}

			if (this.documentInfo.isApp) {
				// finally check whether the file exists in the DB but not in R2 yet
				const file = await this.getAppFileRecord()
				if (!file) {
					return { type: 'room_not_found' }
				}
				return {
					type: 'room_found',
					snapshot: new TLSyncRoom({ schema: createTLSchema() }).getSnapshot(),
					roomSizeMB: 0,
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
			return { type: 'room_found', snapshot: roomFromSupabase.drawing, roomSizeMB: 0 }
		} catch (error) {
			this.logEvent({ type: 'room', roomId: slug, name: 'failed_load_from_db' })

			console.error('failed to fetch doc', slug, error)
			return { type: 'error', error: error as Error }
		}
	}

	_lastPersistedClock: number | null = null

	executionQueue = new ExecutionQueue()

	// We use this to make sure that all of the assets in a tldraw app file are associated with that file.
	// This is needed for a few cases like duplicating a file, copy pasting images between files, slurping legacy files.
	async maybeAssociateFileAssets() {
		if (!this.documentInfo.isApp) return

		const slug = this.documentInfo.slug
		const room = await this.getRoom()
		const assetsToUpdate: { objectName: string; fileId: string }[] = []
		await room.updateStore(async (store) => {
			const records = store.getAll()
			for (const record of records) {
				if (record.typeName !== 'asset') continue
				const asset = record as any
				const meta = asset.meta

				if (meta?.fileId === slug) continue
				const src = asset.props.src
				if (!src) continue
				const objectName = src.split('/').pop()
				if (!objectName) continue
				const currentAsset = await this.env.UPLOADS.get(objectName)
				if (!currentAsset) continue

				const split = objectName.split('-')
				const fileType = split.length > 1 ? split.pop() : null
				const id = uniqueId()
				const newObjectName = fileType ? `${id}-${fileType}` : id
				await this.env.UPLOADS.put(newObjectName, currentAsset.body, {
					httpMetadata: currentAsset.httpMetadata,
				})
				asset.props.src = asset.props.src.replace(objectName, newObjectName)
				assert(this.env.MULTIPLAYER_SERVER, 'MULTIPLAYER_SERVER must be present')
				asset.props.src = `${this.env.MULTIPLAYER_SERVER.replace(/^ws/, 'http')}${APP_ASSET_UPLOAD_ENDPOINT}${newObjectName}`

				asset.meta.fileId = slug
				store.put(asset)
				assetsToUpdate.push({ objectName: newObjectName, fileId: slug })
			}
		})

		if (assetsToUpdate.length === 0) return

		await this.db
			.insertInto('asset')
			.values(assetsToUpdate)
			.onConflict((oc) => {
				return oc.column('objectName').doUpdateSet({ fileId: slug })
			})
			.execute()
	}

	private async addRoomStorageUsedPercentage(
		room: TLSocketRoom<TLRecord, SessionMeta>,
		roomSizeMB: number,
		shouldUpdate: boolean
	) {
		await room.updateStore(async (store) => {
			const document = store.get(TLDOCUMENT_ID) as TLDocument
			const meta = document.meta
			// In some cases we don't want to update the document if it already has percentage set.
			// Example for that is when we load the room. If it has a percentage set, we don't want to overwrite it.
			if (!shouldUpdate && meta.storageUsedPercentage !== undefined) return
			meta.storageUsedPercentage = Math.ceil((roomSizeMB / ROOM_SIZE_LIMIT_MB) * 100)
			store.put(document)
		})
	}

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

				const snapshot = room.getCurrentSnapshot()
				this.maybeAssociateFileAssets()

				const key = getR2KeyForRoom({ slug: slug, isApp: this.documentInfo.isApp })
				await this._uploadSnapshotToR2(room, snapshot, key)

				this._lastPersistedClock = clock

				// Update the updatedAt timestamp in the database
				if (this.documentInfo.isApp) {
					// don't await on this because otherwise
					// if this logic is invoked during another db transaction
					// (e.g. when publishing a file)
					// that transaction will deadlock
					this.db
						.updateTable('file')
						.set({ updatedAt: new Date().getTime() })
						.where('id', '=', this.documentInfo.slug)
						.execute()
						.catch((e) => this.reportError(e))
				}
			})
		} catch (e) {
			this.reportError(e)
		}
	}

	private async _uploadSnapshotToR2(
		room: TLSocketRoom<TLRecord, SessionMeta>,
		snapshot: RoomSnapshot,
		key: string
	) {
		// Upload to rooms bucket first
		const roomSizeMB = await this._uploadSnapshotToBucket(this.r2.rooms, snapshot, key)
		// Update storage percentage
		if (roomSizeMB !== null) {
			await this.addRoomStorageUsedPercentage(room, roomSizeMB, true)
		}

		// Then upload to version cache
		const versionKey = `${key}/${new Date().toISOString()}`
		await this._uploadSnapshotToBucket(this.r2.versionCache, snapshot, versionKey)
	}

	private async _uploadSnapshotToBucket(bucket: R2Bucket, snapshot: RoomSnapshot, key: string) {
		try {
			// Try multipart upload first
			return await this._uploadSnapshotToBucketMultipart(bucket, snapshot, key)
		} catch (multipartError) {
			this.reportError(
				new Error(`Multipart upload failed, falling back to simple PUT: ${multipartError}`)
			)
			// Fallback to simple PUT
			return await this._uploadSnapshotToBucketSimple(bucket, snapshot, key)
		}
	}

	private async _uploadSnapshotToBucketMultipart(
		bucket: R2Bucket,
		snapshot: RoomSnapshot,
		key: string
	) {
		const out = await bucket.createMultipartUpload(key)

		try {
			// 5MB buffer
			const fiveMB = 5 * MB
			const buffer = new Uint8Array(fiveMB)
			const parts: R2UploadedPart[] = []
			let partNumber = 1
			let offset = 0

			const uploadBuffer = async (data: Uint8Array) => {
				const part = await out.uploadPart(partNumber, data)
				parts.push(part)
				partNumber++
			}

			for (const chunk of generateSnapshotChunks(snapshot)) {
				let remainingChunk = chunk

				while (remainingChunk.byteLength > 0) {
					const spaceLeft = fiveMB - offset
					const chunkToAdd = remainingChunk.subarray(
						0,
						Math.min(spaceLeft, remainingChunk.byteLength)
					)

					buffer.set(chunkToAdd, offset)
					offset += chunkToAdd.byteLength

					// If buffer is full, upload it
					if (offset >= fiveMB) {
						await uploadBuffer(buffer.subarray(0, offset))
						offset = 0
					}

					remainingChunk = remainingChunk.subarray(chunkToAdd.byteLength)
				}
			}
			if (offset > 0) {
				await uploadBuffer(buffer.subarray(0, offset))
			}

			const result = await out.complete(parts)
			if (result) {
				return result.size / MB
			}
			return null
		} catch (e) {
			await out.abort()
			throw e
		}
	}

	private async _uploadSnapshotToBucketSimple(
		bucket: R2Bucket,
		snapshot: RoomSnapshot,
		key: string
	) {
		const serialized = JSON.stringify(snapshot)
		const result = await bucket.put(key, serialized)
		if (result) {
			return result.size / MB
		}

		return null
	}

	private reportError(e: unknown) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.sentry?.captureException(e)
		console.error(e)
	}

	async appFileRecordCreated(file: TlaFile) {
		if (this._fileRecordCache) return
		this._fileRecordCache = file

		this.setDocumentInfo({
			version: CURRENT_DOCUMENT_INFO_VERSION,
			slug: file.id,
			isApp: true,
			deleted: false,
		})
		await this.getRoom()
	}

	async appFileRecordDidUpdate(file: TlaFile) {
		if (!file) {
			console.error('file record updated but no file found')
			return
		}
		this._fileRecordCache = file
		if (!this._documentInfo) {
			this.setDocumentInfo({
				version: CURRENT_DOCUMENT_INFO_VERSION,
				slug: file.id,
				isApp: true,
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
			if (file.isDeleted) {
				room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.NOT_FOUND)
				continue
			}
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

	async appFileRecordDidDelete({
		id,
		publishedSlug,
	}: Pick<TlaFile, 'id' | 'ownerId' | 'publishedSlug'>) {
		if (this._documentInfo?.deleted) return

		this._fileRecordCache = null

		// prevent new connections while we clean everything up
		this.setDocumentInfo({
			version: CURRENT_DOCUMENT_INFO_VERSION,
			slug: this.documentInfo.slug,
			isApp: true,
			deleted: true,
		})

		await this.executionQueue.push(async () => {
			if (this._room) {
				const room = await this.getRoom()
				for (const session of room.getSessions()) {
					room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.NOT_FOUND)
				}
				room.close()
			}
			// setting _room to null will prevent any further persists from going through
			this._room = null
			// delete should be handled by the delete endpoint now

			// Delete published slug mapping
			await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(publishedSlug)

			// remove published files
			const publishedPrefixKey = getR2KeyForRoom({
				slug: `${id}/${publishedSlug}`,
				isApp: true,
			})

			const publishedHistory = await listAllObjectKeys(this.env.ROOM_SNAPSHOTS, publishedPrefixKey)
			if (publishedHistory.length > 0) {
				await this.env.ROOM_SNAPSHOTS.delete(publishedHistory)
			}

			// remove edit history
			const r2Key = getR2KeyForRoom({ slug: id, isApp: true })
			const editHistory = await listAllObjectKeys(this.env.ROOMS_HISTORY_EPHEMERAL, r2Key)
			if (editHistory.length > 0) {
				await this.env.ROOMS_HISTORY_EPHEMERAL.delete(editHistory)
			}

			// remove main file
			await this.env.ROOMS.delete(r2Key)

			// finally clear storage so we don't keep the data around
			this.ctx.storage.deleteAll()
		})
	}

	/**
	 * @internal
	 */
	async awaitPersist() {
		if (!this._documentInfo) return
		await this.persistToDatabase()
	}

	async __admin__hardDeleteIfLegacy() {
		if (!this._documentInfo || this.documentInfo.deleted || this.documentInfo.isApp) return false
		this.setDocumentInfo({
			version: CURRENT_DOCUMENT_INFO_VERSION,
			slug: this.documentInfo.slug,
			isApp: false,
			deleted: true,
		})
		if (this._room) {
			const room = await this.getRoom()
			room.close()
		}
		const slug = this.documentInfo.slug
		const roomKey = getR2KeyForRoom({ slug, isApp: false })

		// remove edit history
		const editHistory = await listAllObjectKeys(this.env.ROOMS_HISTORY_EPHEMERAL, roomKey)
		if (editHistory.length > 0) {
			await this.env.ROOMS_HISTORY_EPHEMERAL.delete(editHistory)
		}

		// remove main file
		await this.env.ROOMS.delete(roomKey)

		return true
	}

	async __admin__createLegacyRoom(id: string) {
		this.setDocumentInfo({
			version: CURRENT_DOCUMENT_INFO_VERSION,
			slug: id,
			isApp: false,
			deleted: false,
		})
		const key = getR2KeyForRoom({ slug: id, isApp: false })
		await this.r2.rooms.put(
			key,
			JSON.stringify(new TLSyncRoom({ schema: createTLSchema() }).getSnapshot())
		)
		await this.getRoom()
	}
}

async function listAllObjectKeys(bucket: R2Bucket, prefix: string): Promise<string[]> {
	const keys: string[] = []
	let cursor: string | undefined

	do {
		const result = await bucket.list({ prefix, cursor })
		keys.push(...result.objects.map((o) => o.key))
		cursor = result.truncated ? result.cursor : undefined
	} while (cursor)

	return keys
}
