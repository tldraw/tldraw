/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { ApiError, RefUpdateError, type Repo } from '@pierre/storage'
import { SupabaseClient } from '@supabase/supabase-js'
import {
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
	TLCustomServerEvent,
	TlaFile,
	WELCOME_CREATE_SOURCE,
	can,
	type RoomOpenMode,
} from '@tldraw/dotcom-shared'
import {
	DEFAULT_INITIAL_SNAPSHOT,
	DurableObjectSqliteSyncWrapper,
	RoomSnapshot,
	SQLiteSyncStorage,
	TLSocketRoom,
	TLSyncErrorCloseEventCode,
	TLSyncErrorCloseEventReason,
	TLSyncStorage,
	loadSnapshotIntoStorage,
	type PersistedRoomSnapshotForSupabase,
	type SessionStateSnapshot,
} from '@tldraw/sync-core'
import {
	TLAsset,
	TLAssetId,
	TLDOCUMENT_ID,
	TLDocument,
	TLRecord,
	createTLSchema,
} from '@tldraw/tlschema'
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
import { Kysely, PostgresDialect } from 'kysely'
import PQueue from 'p-queue'
import { PERSIST_INTERVAL_MS } from './config'
import { Logger } from './Logger'
import { TLPostgresPool } from './postgres'
import { getR2KeyForRoom } from './r2'
import { getPublishedRoomSnapshot } from './routes/tla/getPublishedFile'
import { generateSnapshotChunks } from './snapshotUtils'
import { Analytics, DBLoadResult, Environment, TLServerEvent } from './types'
import { EventData, writeDataPoint } from './utils/analytics'
import { createPierreClient, isSlugInPierreRollout } from './utils/createPierreClient'
import { createSupabaseClient } from './utils/createSupabaseClient'
import { getRoomDurableObject } from './utils/durableObjects'
import { reconstructSnapshotFromPierre } from './utils/pierreSnapshot'
import { isRateLimited } from './utils/rateLimit'
import { getSlug } from './utils/roomOpenMode'
import { throttle } from './utils/throttle'
import { getAuth, requireAdminAccess, requireWriteAccessToFile } from './utils/tla/getAuth'
import { getLegacyRoomData } from './utils/tla/getLegacyRoomData'
import { getRole } from './utils/tla/getRole'
import { isTestFile } from './utils/tla/isTestFile'
import { resolveWelcomeSnapshot } from './welcome/resolveWelcomeSnapshot'

const MAX_CONNECTIONS = 50

// Cloudflare allows at most six simultaneous open connections. We funnel every R2 operation the
// durable object makes — asset copies during association passes AND snapshot uploads during
// persistence — through a single queue so they can never collectively exceed that budget. An
// asset copy holds two connections (the R2 get body streaming into the put); a snapshot upload
// holds ~one at a time (multipart parts are uploaded sequentially). With two operations in flight
// the worst case is two copies = four connections, leaving two free for Pierre pushes and Postgres
// queries. Without a shared budget the upload and a concurrent association pass contend for the
// same connections, which surfaces as "Network connection lost" during multipart uploads.
// https://developers.cloudflare.com/workers/platform/limits/#simultaneous-open-connections
const MAX_CONCURRENT_R2_OPERATIONS = 2

// The shared R2 queue normally sits near empty (two operations in flight, nothing waiting). We only
// emit a depth metric once it backs up past this many operations, to keep the common case out of
// analytics — Grafana can then graph how deep the queue gets, in total and broken down by operation
// type.
const R2_QUEUE_DEPTH_METRIC_THRESHOLD = 30
// If the queue ever backs up this far, operations are arriving far faster than the two-at-a-time
// budget can drain them and a pass is likely to outlast the durable object. Surface it to Sentry
// (once per sustained spike) so it can alert.
const R2_QUEUE_DEPTH_ALERT_THRESHOLD = 100

// The kinds of R2 operation that share the connection budget, used to break queue depth down per
// type in metrics.
type R2OperationType = 'asset_copy' | 'snapshot_upload'

// increment this any time you make a change to this type
const CURRENT_DOCUMENT_INFO_VERSION = 3
interface DocumentInfo {
	version: number
	slug: string
	isApp: boolean
	deleted: boolean
}

export const ROOM_NOT_FOUND = Symbol('room_not_found')

interface SessionMeta {
	storeId: string
	userId: string | null
}

interface SocketAttachment {
	sessionId: string
	meta: SessionMeta
	isReadonly: boolean
	snapshot: SessionStateSnapshot | null
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

function pruneUnusedAssetsForTldr(records: TLRecord[]): TLRecord[] {
	const usedAssets = new Set<TLAssetId>()
	for (const record of records) {
		if (record.typeName === 'shape' && 'assetId' in record.props && record.props.assetId) {
			usedAssets.add(record.props.assetId as TLAssetId)
		}
	}
	return records.filter((r) => r.typeName !== 'asset' || usedAssets.has(r.id as TLAssetId))
}

function arrayBufferToBase64(ab: ArrayBuffer): string {
	const bytes = new Uint8Array(ab)
	return bytes.toBase64!()
}

const MB = 1024 * 1024

export class TLFileDurableObject extends DurableObject {
	// A unique identifier for this instance of the Durable Object
	id: DurableObjectId

	private _storage: Promise<TLSyncStorage<TLRecord>> | null = null

	private async loadStorage(slug: string): Promise<TLSyncStorage<TLRecord>> {
		const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage)

		// If SQLite has been initialized, use it directly
		if (SQLiteSyncStorage.hasBeenInitialized(sql)) {
			return new SQLiteSyncStorage<TLRecord>({ sql })
		}

		// SQLite not initialized yet, load from R2 and initialize
		const result = await this.loadFromDatabase(slug)
		const storage = new SQLiteSyncStorage<TLRecord>({ sql, snapshot: result.snapshot })
		// We should not await on setRoomStorageUsedPercentage because it calls
		// getStorage under the hood which will only resolve once this function has returned.
		this.setRoomStorageUsedPercentage(result.roomSizeMB)
		return storage
	}

	private getStorage(): Promise<TLSyncStorage<TLRecord>> {
		if (!this._documentInfo) {
			throw new Error('documentInfo must be present when accessing room')
		}
		if (!this._storage) {
			this._storage = retry(() => this.loadStorage(this.documentInfo.slug), {
				// Allow ROOM_NOT_FOUND to bubble up since it means the room doesn't exist
				// and there's no point in retrying.
				matchError: (error) => error !== ROOM_NOT_FOUND,
			})
				.then((storage) => {
					storage.onChange(() => {
						this.triggerPersist()
					})
					storage.transaction((txn) => {
						createTLSchema().migrateStorage(txn)
					})
					return storage
				})
				.catch((error) => {
					this.reportError(error)
					throw error
				})
		}
		return this._storage
	}

	_room: Promise<TLSocketRoom<TLRecord, SessionMeta>> | null = null

	sentry: ReturnType<typeof createSentry> | null = null

	getRoom() {
		if (!this._documentInfo) {
			throw new Error('documentInfo must be present when accessing room')
		}
		const slug = this._documentInfo.slug
		if (!this._room) {
			this._room = this.getStorage().then(async (storage) => {
				const room = new TLSocketRoom<TLRecord, SessionMeta>({
					storage,
					clientTimeout: Infinity,
					onSessionSnapshot: (sessionId, snapshot) => {
						const ws = this.sessionIdToWs.get(sessionId)
						if (!ws) return
						const attachment = this.getSocketAttachment(ws)
						if (!attachment) return
						ws.serializeAttachment({ ...attachment, snapshot })
					},
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
						room.close()
						this.logEvent({ type: 'room', roomId: slug, name: 'room_empty' })
						await this._pool?.end()
						this._pool = null
						this._db = null
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
				// Resume any sessions that survived hibernation
				for (const ws of this.state.getWebSockets()) {
					const attachment = ws.deserializeAttachment() as SocketAttachment | null
					if (!attachment?.sessionId) continue
					if (attachment.snapshot) {
						room.handleSocketResume({
							sessionId: attachment.sessionId,
							socket: ws,
							snapshot: attachment.snapshot,
							meta: attachment.meta,
						})
					}
				}
				// Also associate file assets after we load the room
				setTimeout(this.maybeAssociateFileAssets.bind(this), PERSIST_INTERVAL_MS)
				return room
			})
		}
		return this._room
	}

	// For storage
	storage: DurableObjectStorage

	// For persistence
	supabaseClient: SupabaseClient | void
	pierreClient: ReturnType<typeof createPierreClient>
	pierreState: PierreState | null = null

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

	_db: Kysely<DB> | null = null
	_pool: TLPostgresPool | null = null
	private readonly log: Logger
	/** Map sessionId → ws so onSessionSnapshot can serialize to the right socket. */
	private readonly sessionIdToWs = new Map<string, WebSocket>()

	// eslint-disable-next-line tldraw/no-setter-getter
	get db() {
		if (!this._db) {
			this._pool = new TLPostgresPool(this.env, this.log)
			this._db = new Kysely<DB>({
				dialect: new PostgresDialect({ pool: this._pool }),
				log: ['error'],
			})
		}
		return this._db
	}

	private readonly changeSource = 'TLFileDurableObject'

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
		this.log = new Logger(env, 'TLDrawDurableObject', this.sentry)
		this.supabaseClient = createSupabaseClient(env)
		this.pierreClient = createPierreClient(env)

		this.supabaseTable = env.TLDRAW_ENV === 'production' ? 'drawings' : 'drawings_staging'
		this.r2 = {
			rooms: env.ROOMS,
			versionCache: env.ROOMS_HISTORY_EPHEMERAL,
		}

		// Respond to ping at the platform layer so the DO can hibernate
		this.state.setWebSocketAutoResponse(
			new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}')
		)

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
		.get(
			`/app/file/:roomId/download`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_WRITE),
			(req) => this.onDownloadTldr(req)
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
		.post(
			`/app/file/:roomId/pierre-restore`,
			(req) => this.extractDocumentInfoFromRequest(req, ROOM_OPEN_MODE.READ_WRITE),
			(req) => this.onRestore(req, true)
		)
		.all('*', () => new Response('Not found', { status: 404 }))

	// eslint-disable-next-line tldraw/no-setter-getter
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

	// --- WebSocket hibernation API handlers ---

	private getSocketAttachment(ws: WebSocket): SocketAttachment | null {
		return ws.deserializeAttachment() as SocketAttachment | null
	}

	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		const attachment = this.getSocketAttachment(ws)
		if (!attachment?.sessionId) return
		if (!this._documentInfo) return

		this.sessionIdToWs.set(attachment.sessionId, ws)
		const room = await this.getRoom()
		room.handleSocketMessage(attachment.sessionId, message)
	}

	override async webSocketClose(ws: WebSocket) {
		this.handleWebSocketEnd(ws, 'handleSocketClose')
	}

	override async webSocketError(ws: WebSocket) {
		this.handleWebSocketEnd(ws, 'handleSocketError')
	}

	private async handleWebSocketEnd(
		ws: WebSocket,
		method: 'handleSocketClose' | 'handleSocketError'
	) {
		const attachment = this.getSocketAttachment(ws)
		if (!attachment?.sessionId) return

		this.sessionIdToWs.delete(attachment.sessionId)
		if (!this._documentInfo) return

		const room = await this.getRoom()

		// If the DO was hibernating, this session was never re-added to the room.
		// Resume it briefly so the room can broadcast presence removal to other clients.
		if (attachment.snapshot && !room.getSessionSnapshot(attachment.sessionId)) {
			room.handleSocketResume({
				sessionId: attachment.sessionId,
				socket: ws,
				snapshot: attachment.snapshot,
				meta: attachment.meta,
			})
		}

		room[method](attachment.sessionId)
	}

	_isRestoring = false
	async onRestore(req: IRequest, isPierre: boolean = false) {
		this._isRestoring = true
		try {
			if (isPierre && !this.documentInfo.isApp) {
				return new Response('Pierre restore must be for an app file', { status: 400 })
			}
			if (this.documentInfo.isApp) {
				await requireWriteAccessToFile(req, this.env, this.documentInfo.slug)
			}
			let dataText = ''
			const roomId = this.documentInfo.slug
			const roomKey = getR2KeyForRoom({ slug: roomId, isApp: this.documentInfo.isApp })
			if (isPierre) {
				const commitHash = ((await req.json()) as any).commitHash
				if (!commitHash) {
					return new Response('Missing commit hash', { status: 400 })
				}
				const repo = await this.getPierreRepo()
				if (!repo) {
					return new Response('Pierre not available', { status: 503 })
				}
				const snapshot = await reconstructSnapshotFromPierre(repo, commitHash)
				dataText = JSON.stringify(snapshot)
				this.pierreState = null
			} else {
				const timestamp = ((await req.json()) as any).timestamp
				if (!timestamp) {
					return new Response('Missing timestamp', { status: 400 })
				}
				const data = await this.r2.versionCache.get(`${roomKey}/${timestamp}`)
				if (!data) {
					return new Response('Version not found', { status: 400 })
				}
				dataText = await data.text()
			}

			await this.r2.rooms.put(roomKey, dataText)
			const storage = await this.getStorage()
			storage.transaction((txn) => {
				loadSnapshotIntoStorage(txn, createTLSchema(), JSON.parse(dataText))
			})

			this.maybeAssociateFileAssets()

			return new Response()
		} finally {
			this._isRestoring = false
		}
	}

	// this might return null if the file doesn't exist yet in the backend, or if it was deleted
	_fileRecordCache: TlaFile | null = null
	async getAppFileRecord(): Promise<TlaFile | null> {
		const timer = this.timer()
		try {
			const result = await retry(
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
					attempts: 20,
					waitDuration: 100,
				}
			)

			timer.report('get_file_record')
			return result
		} catch (_e) {
			timer.report('get_file_record_error')
			return null
		}
	}

	async onRequest(req: IRequest, openMode: RoomOpenMode) {
		const requestTimer = this.timer()

		// extract query params from request, should include instanceId
		const url = new URL(req.url)
		const params = Object.fromEntries(url.searchParams.entries())
		let { sessionId, storeId } = params

		// handle legacy param names
		sessionId ??= params.sessionKey ?? params.instanceId
		storeId ??= params.localClientId
		const isNewSession = !this._room

		// Create the websocket pair for the client; use hibernation API
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		this.state.acceptWebSocket(serverWebSocket)

		const closeSocket = (reason: TLSyncErrorCloseEventReason) => {
			serverWebSocket.close(TLSyncErrorCloseEventCode, reason)
			return new Response(null, { status: 101, webSocket: clientWebSocket })
		}

		if (this.documentInfo.deleted) {
			return closeSocket(TLSyncErrorCloseEventReason.NOT_FOUND)
		}

		const authTimer = this.timer()
		const auth = await getAuth(req, this.env)
		authTimer.report('on_request_auth')

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

				const rateLimitTimer = this.timer()
				if (auth?.userId) {
					const rateLimited = await isRateLimited(this.env, auth.userId)
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
				rateLimitTimer.report('on_request_rate_limit')

				// Check if user has owner access (directly or via group membership)
				let hasOwnerAccess = false
				if (file.ownerId && file.ownerId === auth?.userId) {
					hasOwnerAccess = true
				} else if (file.owningGroupId && auth?.userId) {
					// Check the user can access the owning group's files
					const groupCheckTimer = this.timer()
					const role = await getRole(this.db, auth.userId, file.owningGroupId)
					if (can(role, 'accessFiles')) {
						hasOwnerAccess = true
					}
					groupCheckTimer.report('on_request_group_check')
				}

				if (!hasOwnerAccess) {
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
			const meta: SessionMeta = {
				storeId: storeId ?? sessionId,
				userId: auth?.userId ? auth.userId : null,
			}
			const isReadonly = openMode === ROOM_OPEN_MODE.READ_ONLY
			const attachment: SocketAttachment = {
				sessionId,
				meta,
				isReadonly,
				snapshot: null,
			}
			serverWebSocket.serializeAttachment(attachment)

			const getRoomTimer = this.timer()
			const room = await this.getRoom()
			getRoomTimer.report('on_request_get_room')

			// Don't connect if we're already at max connections
			if (room.getNumActiveSessions() > MAX_CONNECTIONS) {
				return closeSocket(TLSyncErrorCloseEventReason.ROOM_FULL)
			}

			// all good
			room.handleSocketConnect({
				sessionId,
				socket: serverWebSocket,
				meta,
				isReadonly,
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

			requestTimer.report('on_request_total')

			return new Response(null, { status: 101, webSocket: clientWebSocket })
		} catch (e) {
			if (e === ROOM_NOT_FOUND) {
				return closeSocket(TLSyncErrorCloseEventReason.NOT_FOUND)
			}
			throw e
		}
	}

	/** Stream .tldr download (schema + records, R2 assets inlined as base64). Same access as joining the file. */
	async onDownloadTldr(req: IRequest): Promise<Response> {
		const TLDRAW_FILE_MIMETYPE = 'application/vnd.tldraw+json'
		const TLDRAW_FILE_FORMAT_VERSION = 1

		if (!this.documentInfo.isApp) {
			return new Response('Not found', { status: 404 })
		}

		const auth = await getAuth(req, this.env)
		const file = await this.getAppFileRecord()
		if (!file || file.isDeleted) {
			return new Response('Not found', { status: 404 })
		}

		if (isTestFile(file.id) && !(await canAccessTestProductionFile(this.env, auth))) {
			return new Response('Not found', { status: 404 })
		}
		if (!auth && !file.shared) {
			return new Response('Unauthorized', { status: 401 })
		}

		const url = new URL(req.url)
		const sessionId =
			url.searchParams.get('instanceId') ?? url.searchParams.get('sessionId') ?? 'anon-download'
		const rateLimitKey = auth?.userId ?? sessionId
		if (await isRateLimited(this.env, rateLimitKey)) {
			return new Response('Rate limited', { status: 429 })
		}

		let hasOwnerAccess = false
		if (file.ownerId && file.ownerId === auth?.userId) {
			hasOwnerAccess = true
		} else if (file.owningGroupId && auth?.userId) {
			const role = await getRole(this.db, auth.userId, file.owningGroupId)
			if (can(role, 'accessFiles')) {
				hasOwnerAccess = true
			}
		}
		if (!hasOwnerAccess && !file.shared) {
			return new Response('Forbidden', { status: 403 })
		}

		const storage = await this.getStorage()
		assert(storage instanceof SQLiteSyncStorage, 'storage must be a SQLiteSyncStorage')
		const snapshot = storage.getSnapshot()
		const records = pruneUnusedAssetsForTldr(snapshot.documents.map((d) => d.state) as TLRecord[])

		const assetRows = await this.db
			.selectFrom('asset')
			.where('fileId', '=', this.documentInfo.slug)
			.select('objectName')
			.execute()
		const assetObjectNames = new Set(assetRows.map((r) => r.objectName))

		const documentRecord = records.find((r) => r.typeName === 'document') as TLDocument | undefined
		// Prefer the TlaFile.name (kept in sync by the app layer) over the TLDocument.name
		// (which is only updated when the document is open in an editor).
		const rawName = file.name?.trim() || documentRecord?.name?.trim()
		const sanitized =
			rawName?.replace(/[^ \w-]/g, '_').slice(0, 200) || `${this.documentInfo.slug}.tldr`
		const filename = sanitized.endsWith('.tldr') ? sanitized : `${sanitized}.tldr`

		const env = this.env
		const stream = new ReadableStream({
			async start(controller) {
				try {
					const encoder = new TextEncoder()
					controller.enqueue(
						encoder.encode(
							`{"tldrawFileFormatVersion":${TLDRAW_FILE_FORMAT_VERSION},"schema":${JSON.stringify(snapshot.schema)},"records":[`
						)
					)
					for (let i = 0; i < records.length; i++) {
						let record = records[i] as TLRecord
						const assetSrc = record.typeName === 'asset' ? (record as TLAsset).props.src : null
						if (
							record.typeName === 'asset' &&
							(record as TLAsset).type !== 'bookmark' &&
							assetSrc &&
							!assetSrc.startsWith('data:')
						) {
							const objectName = new URL(assetSrc).pathname.split('/').pop()
							if (objectName && assetObjectNames.has(objectName)) {
								const blob = await env.UPLOADS.get(objectName)
								if (blob) {
									const ab = await blob.arrayBuffer()
									const base64 = arrayBufferToBase64(ab)
									const assetRecord = record as TLAsset
									const mimeType =
										assetRecord.type !== 'bookmark' &&
										'mimeType' in assetRecord.props &&
										assetRecord.props.mimeType
											? assetRecord.props.mimeType
											: 'application/octet-stream'
									record = {
										...record,
										props: {
											...(record as TLAsset).props,
											src: `data:${mimeType};base64,${base64}`,
										},
									} as TLRecord
								}
							}
						}
						controller.enqueue(encoder.encode((i > 0 ? ',' : '') + JSON.stringify(record)))
					}
					controller.enqueue(encoder.encode(']}'))
					controller.close()
				} catch (e) {
					controller.error(e)
				}
			},
		})

		return new Response(stream, {
			headers: {
				'Content-Type': TLDRAW_FILE_MIMETYPE,
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		})
	}

	triggerPersist = throttle(() => {
		this.persistToDatabase()
	}, PERSIST_INTERVAL_MS)

	private writeEvent(name: string, eventData: EventData) {
		writeDataPoint(this.sentry, this.measure, this.env, name, eventData)
	}

	logEvent(event: TLServerEvent) {
		switch (event.type) {
			case 'persist_success': {
				this.writeEvent(event.type, { doubles: [event.attempts] })
				break
			}
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

	async handleFileCreateFromSource(): Promise<DBLoadResult> {
		assert(this._fileRecordCache, 'we need to have a file record to create a file from source')

		const fetchTimer = this.timer()
		const data = await this.loadCreateSourceData(this._fileRecordCache.createSource)
		fetchTimer.report('create_from_source_fetch_total')

		if (!data) {
			throw ROOM_NOT_FOUND
		}

		const serialized = typeof data === 'string' ? data : JSON.stringify(data)
		const snapshot = typeof data === 'string' ? JSON.parse(data) : data

		const putTimer = this.timer()
		const key = getR2KeyForRoom({ slug: this._fileRecordCache.id, isApp: true })
		const roomObject = await this.r2.rooms.put(key, serialized)
		putTimer.report('create_from_source_r2_put')

		return {
			snapshot,
			roomSizeMB: roomObject ? roomObject.size / MB : 0,
		}
	}

	/**
	 * Resolve the seed content for a file's `createSource`, as a RoomSnapshot or its serialized
	 * string. Returns undefined for an unknown source, which the caller turns into ROOM_NOT_FOUND.
	 */
	private async loadCreateSourceData(
		createSource: string | null | undefined
	): Promise<RoomSnapshot | string | null | undefined> {
		// A new workspace's first file: a fixed marker (no prefix/id) the worker resolves to the
		// welcome template's content, or a committed default — see resolveWelcomeSnapshot.
		if (createSource === WELCOME_CREATE_SOURCE) {
			return await resolveWelcomeSnapshot(this.env, (e) => this.reportError(e))
		}

		const split = createSource?.split('/')
		if (!split || split.length !== 2) {
			throw ROOM_NOT_FOUND
		}
		const [prefix, id] = split
		switch (prefix) {
			case FILE_PREFIX: {
				// The source file's content is copied verbatim into this (user-owned) room. Read
				// access to the source `id` is authorized upstream when the file record is created
				// (see the `createFile` mutator), since that is where the user's identity is known.
				const awaitPersistTimer = this.timer()
				await getRoomDurableObject(this.env, id).awaitPersist()
				awaitPersistTimer.report('create_from_source_await_persist')

				const r2FetchTimer = this.timer()
				const text = await this.r2.rooms
					.get(getR2KeyForRoom({ slug: id, isApp: true }))
					.then((r) => r?.text())
				r2FetchTimer.report('create_from_source_r2_fetch')
				return text
			}
			case ROOM_PREFIX:
				return await getLegacyRoomData(this.env, id, ROOM_OPEN_MODE.READ_WRITE)
			case READ_ONLY_PREFIX:
				return await getLegacyRoomData(this.env, id, ROOM_OPEN_MODE.READ_ONLY)
			case READ_ONLY_LEGACY_PREFIX:
				return await getLegacyRoomData(this.env, id, ROOM_OPEN_MODE.READ_ONLY_LEGACY)
			case SNAPSHOT_PREFIX:
				return await getLegacyRoomData(this.env, id, 'snapshot')
			case PUBLISH_PREFIX:
				return await getPublishedRoomSnapshot(this.env, id)
			case LOCAL_FILE_PREFIX:
				// create empty room, the client will populate it
				return DEFAULT_INITIAL_SNAPSHOT
			default:
				return undefined
		}
	}

	// Load the room's drawing data. First we check the R2 bucket, then we fallback to supabase (legacy).
	async loadFromDatabase(slug: string): Promise<DBLoadResult> {
		const loadTimer = this.timer()
		try {
			const key = getR2KeyForRoom({ slug, isApp: this.documentInfo.isApp })

			// when loading, prefer to fetch documents from the bucket
			const r2FetchTimer = this.timer()
			const roomFromBucket = await this.r2.rooms.get(key)
			r2FetchTimer.report('db_load_r2_fetch')

			if (roomFromBucket) {
				const snapshot = (await roomFromBucket.json()) as RoomSnapshot
				loadTimer.report('db_load_total')

				return {
					snapshot,
					roomSizeMB: roomFromBucket.size / MB,
				}
			}

			if (this._fileRecordCache?.createSource) {
				const createFromSourceTimer = this.timer()
				const res = await this.handleFileCreateFromSource()
				createFromSourceTimer.report('db_load_create_from_source')

				loadTimer.report('db_load_total')

				return res
			}

			if (this.documentInfo.isApp) {
				// finally check whether the file exists in the DB but not in R2 yet
				const file = await this.getAppFileRecord()

				loadTimer.report('db_load_total')
				if (!file) {
					throw ROOM_NOT_FOUND
				}

				return {
					snapshot: DEFAULT_INITIAL_SNAPSHOT,
					roomSizeMB: 0,
				}
			}

			// if we don't have a room in the bucket, try to load from supabase
			if (!this.supabaseClient) {
				throw ROOM_NOT_FOUND
			}

			const supabaseFetchTimer = this.timer()
			const { data, error } = await this.supabaseClient
				.from(this.supabaseTable)
				.select('*')
				.eq('slug', slug)

			supabaseFetchTimer.report('db_load_supabase_fetch')

			if (error) {
				this.logEvent({ type: 'room', roomId: slug, name: 'failed_load_from_db' })

				loadTimer.report('db_load_total')

				console.error('failed to retrieve document', slug, error)
				throw new Error(error.message)
			}
			// if it didn't find a document, data will be an empty array
			if (data.length === 0) {
				loadTimer.report('db_load_total')
				throw ROOM_NOT_FOUND
			}

			const roomFromSupabase = data[0] as PersistedRoomSnapshotForSupabase
			loadTimer.report('db_load_total')

			return {
				snapshot: roomFromSupabase.drawing,
				roomSizeMB: 0,
			}
		} catch (error) {
			this.logEvent({ type: 'room', roomId: slug, name: 'failed_load_from_db' })

			loadTimer.report('db_load_total_error')

			console.error('failed to fetch doc', slug, error)
			throw error
		}
	}

	timer() {
		const start = Date.now()
		return {
			report: (name: string) => {
				this.writeEvent(name, {
					doubles: [Date.now() - start],
				})
			},
		}
	}

	_lastPersistedClock: number | null = null

	executionQueue = new ExecutionQueue()

	private getUserContentUrl(): string {
		return assertExists(this.env.USER_CONTENT_URL, 'USER_CONTENT_URL is required')
	}

	private readonly associateAssetsQueue = new ExecutionQueue()

	// Shared connection budget for every R2 operation this durable object makes. Both asset copies and
	// snapshot uploads draw from this queue so together they can't exceed Cloudflare's simultaneous-
	// connection limit (see MAX_CONCURRENT_R2_OPERATIONS).
	private readonly r2Queue = new PQueue({ concurrency: MAX_CONCURRENT_R2_OPERATIONS })

	// Wraps a queued R2 task so the queue's depth is counted against `type` from submit until the task
	// settles. While the queue is backed up it writes a per-type depth metric for Grafana, and a
	// runaway backlog reports to Sentry once per spike (re-arming after the queue drains). Depth and
	// the alert flag live in this closure rather than on the durable object.
	private readonly trackQueuedTask = (() => {
		const depthByType = new Map<R2OperationType, number>()
		let alerted = false
		return <T>(type: R2OperationType, task: () => Promise<T>): (() => Promise<T>) => {
			const typeDepth = (depthByType.get(type) ?? 0) + 1
			depthByType.set(type, typeDepth)
			let total = 0
			for (const depth of depthByType.values()) total += depth
			if (total < R2_QUEUE_DEPTH_METRIC_THRESHOLD) {
				alerted = false
			} else {
				this.writeEvent('r2_queue_depth', { blobs: [type], doubles: [total, typeDepth] })
				if (total >= R2_QUEUE_DEPTH_ALERT_THRESHOLD && !alerted) {
					alerted = true
					this.reportError(
						new Error(
							`R2 connection queue depth reached ${total} (>= ${R2_QUEUE_DEPTH_ALERT_THRESHOLD}) for file ${this.documentInfo.slug}`
						)
					)
				}
			}
			return async () => {
				try {
					return await task()
				} finally {
					const depth = (depthByType.get(type) ?? 1) - 1
					if (depth <= 0) depthByType.delete(type)
					else depthByType.set(type, depth)
				}
			}
		}
	})()

	// Associates every asset in this (app) file with the file. Needed for cases like duplicating a
	// file, copy-pasting images between files, and slurping legacy files; also migrates old-format
	// asset URLs to tldrawusercontent.com. Only one pass runs at a time; concurrent calls are dropped
	// because the running pass already drains the whole store (see associateFileAssets).
	async maybeAssociateFileAssets() {
		if (!this.documentInfo.isApp) return
		if (!this.associateAssetsQueue.isEmpty()) return
		await this.associateAssetsQueue.push(() => this.associateFileAssets())
	}

	private async associateFileAssets() {
		// Keep going until there's nothing left to associate. Copying takes a while and more assets can
		// arrive in the meantime, so the running pass keeps draining rather than relying on a later
		// trigger to pick up the stragglers.
		while (true) {
			const associated = await this.associatePendingAssets()
			if (!associated) return
		}
	}

	// Associates every asset that isn't linked to this file yet: copies it to a new object owned by the
	// file and repoints the asset at it (and migrates old-format URLs in place). Returns how many
	// assets it associated — 0 means there's nothing left to do, or nothing it can make progress on
	// (e.g. an asset whose source object is missing), which is what stops the loop above.
	private async associatePendingAssets(): Promise<number> {
		const slug = this.documentInfo.slug
		const storage = await this.getStorage()
		const userContentUrl = this.getUserContentUrl()

		const {
			result: { assetsToReplace, assetsToMigrate },
		} = storage.transaction((txn) => {
			const assetsToReplace: Array<{
				objectName: string
				newObjectName: string
				newSrc: string
				assetId: string
			}> = []
			const assetsToMigrate: Array<{
				assetId: string
				newSrc: string
			}> = []
			for (const record of txn.values()) {
				if (record.typeName !== 'asset') continue
				const asset = record as any
				const meta = asset.meta
				const src = asset.props.src
				if (!src) continue

				// Migrate old-format HTTP URLs to tldrawusercontent.com (same R2 bucket, no copy needed)
				if (meta?.fileId === slug && src.startsWith('http') && !src.startsWith(userContentUrl)) {
					const objectName = src.split('/').pop()
					if (objectName) {
						assetsToMigrate.push({
							assetId: asset.id,
							newSrc: `${userContentUrl}/${objectName}`,
						})
					}
					continue
				}

				if (meta?.fileId === slug) continue
				const objectName = src.split('/').pop()
				if (!objectName) continue

				const split = objectName.split('-')
				const fileType = split.length > 1 ? split.pop() : null
				const id = uniqueId()
				const newObjectName = fileType ? `${id}-${fileType}` : id
				assetsToReplace.push({
					objectName,
					newObjectName,
					assetId: asset.id,
					newSrc: `${userContentUrl}/${newObjectName}`,
				})
			}
			return { assetsToReplace, assetsToMigrate }
		})

		// Apply URL migrations (no R2 copy needed — same bucket, same object)
		if (assetsToMigrate.length > 0) {
			storage.transaction((txn) => {
				for (const migration of assetsToMigrate) {
					const assetRecord = txn.get(migration.assetId) as TLAsset | undefined
					if (!assetRecord) continue
					assetRecord.props.src = migration.newSrc
					txn.set(migration.assetId, assetRecord)
				}
			})
		}

		if (assetsToReplace.length === 0) return 0

		const rows: { objectName: string; fileId: string }[] = []
		await Promise.allSettled(
			assetsToReplace.map((asset) =>
				this.r2Queue.add(
					this.trackQueuedTask('asset_copy', async () => {
						try {
							const currentAsset = await this.env.UPLOADS.get(asset.objectName)
							if (!currentAsset) return
							await this.env.UPLOADS.put(asset.newObjectName, currentAsset.body, {
								httpMetadata: currentAsset.httpMetadata,
							})

							storage.transaction((txn) => {
								const assetRecord = txn.get(asset.assetId) as TLAsset | undefined
								if (!assetRecord) return // extremely unlikely, not sure why this would happen
								assetRecord.props.src = asset.newSrc
								assetRecord.meta.fileId = slug
								txn.set(asset.assetId, assetRecord)
							})

							rows.push({
								objectName: asset.newObjectName,
								fileId: slug,
							})
						} catch (e) {
							this.reportError(e)
						}
					})
				)
			)
		)

		// Nothing copied, so there's no progress to be made.
		if (rows.length === 0) return 0

		await this.db
			.insertInto('asset')
			.values(rows)
			.onConflict((oc) => {
				return oc.column('objectName').doUpdateSet({ fileId: slug })
			})
			.execute()

		return rows.length
	}

	protected async setRoomStorageUsedPercentage(roomSizeMB: number) {
		const storage = await this.getStorage()
		const percentage = Math.ceil((roomSizeMB / ROOM_SIZE_LIMIT_MB) * 100)
		storage.transaction((txn) => {
			const document = txn.get(TLDOCUMENT_ID) as TLDocument
			const meta = document.meta
			if (meta.storageUsedPercentage === percentage) return
			// In some cases we don't want to update the document if it already has percentage set.
			// Example for that is when we load the room. If it has a percentage set, we don't want to overwrite it.
			txn.set(TLDOCUMENT_ID, { ...document, meta: { ...meta, storageUsedPercentage: percentage } })
		})
	}

	broadcastPersistenceEvent(event: TLCustomServerEvent) {
		this._room?.then((r) => {
			for (const session of r.getSessions()) {
				r.sendCustomMessage(session.sessionId, event)
			}
		})
	}
	persistenceBad = false

	// Save the room to r2
	async persistToDatabase() {
		await this.executionQueue
			.push(async () => {
				await retry(
					async ({ attempt }) => {
						if (attempt === PERSIST_RETRIES_NOTIFY_THRESHOLD && !this.persistenceBad) {
							this.broadcastPersistenceEvent({ type: 'persistence_bad' })
							this.persistenceBad = true
						}
						// check whether the worker was woken up to persist after having gone to sleep
						if (!this._room) return
						const slug = this.documentInfo.slug
						const storage = await this.getStorage()
						assert(storage instanceof SQLiteSyncStorage, 'storage must be a SQLiteSyncStorage')
						if (this._lastPersistedClock === storage.getClock()) return
						if (this._isRestoring) return

						const snapshot = storage.getSnapshot()
						assert(snapshot.documentClock !== undefined, 'documentClock must be present')
						this.maybeAssociateFileAssets()

						const key = getR2KeyForRoom({ slug: slug, isApp: this.documentInfo.isApp })
						await this._uploadSnapshotToR2(snapshot, key)
						await this.persistToPierre(storage, snapshot)

						this.logEvent({ type: 'persist_success', attempts: attempt })
						this._lastPersistedClock = snapshot.documentClock
						// Store the clock in DO storage so we can compare against SQLite on next load.
						if (this.persistenceBad) {
							this.broadcastPersistenceEvent({ type: 'persistence_good' })
							this.persistenceBad = false
						}

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
								.catch((e) => {
									this.logEvent({
										type: 'room',
										roomId: this.documentInfo.slug,
										name: 'failed_persist_to_db',
									})
									this.reportError(e)
								})
						}
					},
					{ attempts: PERSIST_RETRIES_MAX, waitDuration: 2000 }
				)
			})
			.catch((e) => {
				this.logEvent({ type: 'room', roomId: this.documentInfo.slug, name: 'fail_persist' })
				this.reportError(e)
			})
	}

	private async _uploadSnapshotToR2(snapshot: RoomSnapshot, key: string) {
		// Upload to rooms bucket first
		const roomSizeMB = await this._uploadSnapshotToBucket(this.r2.rooms, snapshot, key)
		// Update storage percentage
		if (roomSizeMB !== null) {
			await this.setRoomStorageUsedPercentage(roomSizeMB)
		}

		// Then upload to version cache
		const versionKey = `${key}/${new Date().toISOString()}`
		await this._uploadSnapshotToBucket(this.r2.versionCache, snapshot, versionKey)
	}

	private async _uploadSnapshotToBucket(
		bucket: R2Bucket,
		snapshot: RoomSnapshot,
		key: string
	): Promise<number | null> {
		// Funnel through the shared connection budget so the upload can't contend with a concurrent
		// asset-association pass (or the version-cache upload) and exhaust Cloudflare's connections.
		const result = await this.r2Queue.add(
			this.trackQueuedTask('snapshot_upload', async () => {
				try {
					// Try multipart upload first, retrying transient connection drops before falling back.
					return await retry(() => this._uploadSnapshotToBucketMultipart(bucket, snapshot, key), {
						attempts: 3,
						waitDuration: 500,
					})
				} catch (multipartError) {
					// Falling back to a simple PUT is the designed recovery path, so it's a breadcrumb
					// rather than a captured exception — only a failure of the fallback itself is reported.
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					this.sentry?.addBreadcrumb({
						message: `Multipart upload failed, falling back to simple PUT: ${multipartError}`,
					})
					try {
						return await this._uploadSnapshotToBucketSimple(bucket, snapshot, key)
					} catch (putError) {
						this.reportError(putError)
						throw putError
					}
				}
			})
		)
		return result ?? null
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

	private async getPierreRepo() {
		if (
			!this.pierreClient ||
			!this.documentInfo.isApp ||
			!this.env.TLDRAW_ENV ||
			!isSlugInPierreRollout(this.env, this.documentInfo.slug)
		) {
			return null
		}
		const repoId = `${this.env.TLDRAW_ENV}/files/${this.documentInfo.slug}`
		return (
			(await this.pierreClient.findOne({ id: repoId })) ??
			(await this.pierreClient.createRepo({ id: repoId }))
		)
	}

	/**
	 * Sync local Pierre tracking state from the remote repo. Fetches HEAD sha
	 * and meta.json (for documentClock). For empty repos, sets documentClock
	 * to -1 so getChangesSince returns all records.
	 */
	private async syncPierreState(repo: Repo) {
		let headCommit: { sha: string } | undefined
		try {
			const { commits } = await repo.listCommits({ limit: 1 })
			headCommit = commits[0]
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) {
				this.pierreState = { headSha: undefined, documentClock: -1 }
				return
			}
			throw error
		}

		if (!headCommit) {
			this.pierreState = { headSha: undefined, documentClock: -1 }
			return
		}

		const metaResp = await repo.getFileStream({ path: 'meta.json', ref: headCommit.sha })
		const meta = (await metaResp.json()) as PierreMeta

		this.pierreState = {
			headSha: headCommit.sha,
			documentClock: meta.documentClock ?? 0,
		}
	}

	private async persistToPierre(storage: TLSyncStorage<TLRecord>, snapshot: RoomSnapshot) {
		try {
			const repo = await this.getPierreRepo()
			if (!repo) return

			const MAX_CAS_RETRIES = 3
			for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt++) {
				if (!this.pierreState) {
					await this.syncPierreState(repo)
				}

				const { headSha, documentClock: pierreDocClock } = this.pierreState!

				const { result: changes, documentClock } = storage.transaction((txn) =>
					txn.getChangesSince(pierreDocClock)
				)

				if (!changes) return

				const { diff } = changes
				const hasPuts = Object.keys(diff.puts).length > 0
				const hasDeletes = diff.deletes.length > 0

				if (!hasPuts && !hasDeletes && pierreDocClock === documentClock) {
					return
				}

				const timestamp = new Date().toISOString()
				const commitBuilder = repo.createCommit({
					targetBranch: 'main',
					commitMessage: `Snapshot at ${timestamp}`,
					author: PIERRE_AUTHOR,
					expectedHeadSha: headSha,
				})

				const meta: PierreMeta = {
					documentClock,
					schema: snapshot.schema,
				}
				const metaJson = JSON.stringify(meta)
				let incrementalCommitPayloadLength = metaJson.length
				commitBuilder.addFileFromString('meta.json', metaJson)

				for (const [id, put] of Object.entries(diff.puts)) {
					const state = Array.isArray(put) ? put[1] : put
					const recordJson = JSON.stringify(state)
					incrementalCommitPayloadLength += recordJson.length
					commitBuilder.addFileFromString(`records/${id}.json`, recordJson)
				}

				// Only apply diff.deletes when we have a parent commit and we're not in wipeAll.
				// - Empty repo (no headSha): those paths don't exist in Pierre; deletePath would fail.
				// - wipeAll with existing repo: the cleanup loop below already deletes any file not in
				//   putIds, so applying diff.deletes here would duplicate deletePath for the same file.
				if (headSha && !changes.wipeAll) {
					for (const id of diff.deletes) {
						commitBuilder.deletePath(`records/${id}.json`)
					}
				}

				// On wipeAll with an existing repo, pruned tombstones may not appear in diff.deletes,
				// so scan Pierre for stale record files and remove them.
				if (changes.wipeAll && headSha) {
					const putIds = new Set(Object.keys(diff.puts))
					const { paths } = await repo.listFiles({ ref: headSha })
					for (const path of paths) {
						if (!path.startsWith('records/')) continue
						const id = path.slice('records/'.length, -'.json'.length)
						if (!putIds.has(id)) {
							commitBuilder.deletePath(path)
						}
					}
				}

				try {
					const result = await commitBuilder.send().catch((e) => {
						if (e instanceof RefUpdateError && e.message.match('no changes to commit')) {
							return null
						}
						throw e
					})

					this.pierreState = {
						headSha: result ? result.refUpdate.newSha : headSha,
						documentClock,
					}
					// Incremental commits only (not the first commit to an empty repo); combined JSON string lengths (meta + record payloads).
					if (headSha && result) {
						this.writeEvent('pierre_incremental_write_chars', {
							doubles: [incrementalCommitPayloadLength],
						})
					}
					return
				} catch (error) {
					if (error instanceof RefUpdateError) {
						console.warn('Pierre CAS conflict, retrying:', error.message)
						this.pierreState = null
						continue
					}
					throw error
				}
			}
			console.error('Pierre: exhausted CAS retries')
		} catch (error) {
			console.error('Failed to persist to Pierre:', error)
			this.reportError(error)
		}
	}

	protected reportError(e: unknown) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.sentry?.captureException(e)
		console.error(e)
	}

	async appFileRecordCreated(file: TlaFile) {
		if (this._fileRecordCache) return
		this._fileRecordCache = file

		if (!this._documentInfo) {
			this.setDocumentInfo({
				version: CURRENT_DOCUMENT_INFO_VERSION,
				slug: file.id,
				isApp: true,
				deleted: false,
			})
		}
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

		const storage = await this.getStorage()
		// if the app file record updated, it might mean that the file name changed
		storage.transaction((txn) => {
			const documentRecord = txn.get(TLDOCUMENT_ID) as TLDocument
			if (documentRecord.name !== file.name) {
				txn.set(TLDOCUMENT_ID, { ...documentRecord, name: file.name })
			}
		})

		const room = await this.getRoom()

		// if the app file record updated, it might mean that the sharing state was updated
		// in which case we should kick people out or change their permissions
		const roomIsReadOnlyForGuests = file.shared && file.sharedLinkType === 'view'

		for (const session of room.getSessions()) {
			if (file.isDeleted) {
				room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.NOT_FOUND)
				continue
			}
			// allow the owner to stay connected
			// Check if user owns the file directly
			if (file.ownerId && session.meta.userId === file.ownerId) continue

			const canAccessFiles = async () => {
				const role = await getRole(this.db, session.meta.userId, file.owningGroupId)
				return can(role, 'accessFiles')
			}

			if (!file.shared) {
				if (!(await canAccessFiles())) {
					room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.FORBIDDEN)
				}
			} else if (
				// if the file is still shared but the readonly state changed, make them reconnect
				(session.isReadonly && !roomIsReadOnlyForGuests) ||
				(!session.isReadonly && roomIsReadOnlyForGuests)
			) {
				if (!(await canAccessFiles())) {
					// not passing a reason means they will try to reconnect
					room.closeSession(session.sessionId)
				}
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
		await this.r2.rooms.put(key, JSON.stringify(DEFAULT_INITIAL_SNAPSHOT))
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

const PERSIST_RETRIES_NOTIFY_THRESHOLD = 10
const PERSIST_RETRIES_MAX = 100

const PIERRE_AUTHOR = { email: 'huppy@tldraw.com', name: 'huppy [bot]' }

interface PierreState {
	headSha: string | undefined
	documentClock: number
}

/** Shape of meta.json stored in Pierre archives. */
export interface PierreMeta {
	documentClock: number
	schema: RoomSnapshot['schema']
}
