import {
	DB,
	isColumnMutable,
	ROOM_PREFIX,
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaUser,
	Z_PROTOCOL_VERSION,
	ZClientSentMessage,
	ZErrorCode,
	ZRowUpdate,
	ZServerSentMessage,
} from '@tldraw/dotcom-shared'
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { assert } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { Kysely, sql } from 'kysely'
import { Logger } from './Logger'
import { createPostgresConnectionPool } from './postgres'
import { getR2KeyForRoom } from './r2'
import { type TLPostgresReplicator } from './TLPostgresReplicator'
import { Analytics, Environment, TLUserDurableObjectEvent } from './types'
import { UserDataSyncer, ZReplicationEvent } from './UserDataSyncer'
import { EventData, writeDataPoint } from './utils/analytics'
import { getReplicator, getRoomDurableObject } from './utils/durableObjects'
import { isRateLimited } from './utils/rateLimit'
import { retryOnConnectionFailure } from './utils/retryOnConnectionFailure'

export class TLUserDurableObject extends DurableObject<Environment> {
	private readonly db: Kysely<DB>
	private readonly replicator: TLPostgresReplicator
	private measure: Analytics | undefined

	private readonly sentry
	private captureException(exception: unknown, extras?: Record<string, unknown>) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.sentry?.withScope((scope) => {
			if (extras) scope.setExtras(extras)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			this.sentry?.captureException(exception) as any
		})
		if (!this.sentry) {
			console.error(`[TLUserDurableObject]: `, exception)
		}
	}

	private log

	cache: UserDataSyncer | null = null

	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)

		this.sentry = createSentry(ctx, env)
		this.replicator = getReplicator(env)

		this.db = createPostgresConnectionPool(env, 'TLUserDurableObject')
		this.measure = env.MEASURE

		// debug logging in preview envs by default
		this.log = new Logger(env, 'TLUserDurableObject', this.sentry)
	}

	private userId: string | null = null
	private coldStartStartTime: number | null = null

	readonly router = Router()
		.all('/app/:userId/*', async (req) => {
			if (!this.userId) {
				this.userId = req.params.userId
			}
			const rateLimited = await isRateLimited(this.env, this.userId!)
			if (rateLimited) {
				this.log.debug('rate limited')
				this.logEvent({ type: 'rate_limited', id: this.userId })
				throw new Error('Rate limited')
			}
			if (!this.cache) {
				this.coldStartStartTime = Date.now()
				this.log.debug('creating cache', this.userId)
				this.cache = new UserDataSyncer(
					this.ctx,
					this.env,
					this.db,
					this.userId,
					(message) => this.broadcast(message),
					this.logEvent.bind(this),
					this.log
				)
			}
		})
		.get(`/app/:userId/connect`, (req) => this.onRequest(req))

	// Handle a request to the Durable Object.
	override async fetch(req: IRequest) {
		const sentry = createSentry(this.ctx, this.env, req)
		try {
			// Using storage pins the location of the DO
			this.ctx.storage.get('pin-the-do')
			return await this.router.fetch(req)
		} catch (err) {
			if (sentry) {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				sentry?.captureException(err)
			} else {
				console.error(err)
			}
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}

	private assertCache(): asserts this is { cache: UserDataSyncer } {
		assert(this.cache, 'no cache')
		this.cache.maybeStartInterval()
	}

	private readonly sockets = new Set<WebSocket>()

	maybeReportColdStartTime(type: ZServerSentMessage['type']) {
		if (type !== 'initial_data' || !this.coldStartStartTime) return
		const time = Date.now() - this.coldStartStartTime
		this.coldStartStartTime = null
		this.logEvent({ type: 'cold_start_time', id: this.userId!, duration: time })
	}

	broadcast(message: ZServerSentMessage) {
		this.logEvent({ type: 'broadcast_message', id: this.userId! })
		this.maybeReportColdStartTime(message.type)
		const msg = JSON.stringify(message)
		for (const socket of this.sockets) {
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(msg)
			} else if (
				socket.readyState === WebSocket.CLOSED ||
				socket.readyState === WebSocket.CLOSING
			) {
				this.sockets.delete(socket)
			}
		}
	}

	maybeClose() {
		if (this.sockets.size === 0) {
			this.cache?.stopInterval()
		}
	}

	async onRequest(req: IRequest) {
		assert(this.userId, 'User ID not set')
		// handle legacy param names

		const url = new URL(req.url)
		const params = Object.fromEntries(url.searchParams.entries())
		const { sessionId } = params

		const protocolVersion = params.protocolVersion ? Number(params.protocolVersion) : 1

		assert(sessionId, 'Session ID is required')
		assert(Number.isFinite(protocolVersion), `Invalid protocol version ${params.protocolVersion}`)

		this.assertCache()

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()

		if (Number(protocolVersion) !== Z_PROTOCOL_VERSION || this.__test__isForceDowngraded) {
			serverWebSocket.close(TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			return new Response(null, { status: 101, webSocket: clientWebSocket })
		}

		serverWebSocket.addEventListener('message', (e) =>
			this.handleSocketMessage(serverWebSocket, e.data.toString())
		)
		serverWebSocket.addEventListener('close', () => {
			this.sockets.delete(serverWebSocket)
			this.maybeClose()
		})
		serverWebSocket.addEventListener('error', (e) => {
			this.captureException(e, { source: 'serverWebSocket "error" event' })
			this.sockets.delete(serverWebSocket)
			this.maybeClose()
		})
		const initialData = this.cache.getInitialData()
		if (initialData) {
			this.log.debug('sending initial data')
			serverWebSocket.send(
				JSON.stringify({
					type: 'initial_data',
					initialData,
				} satisfies ZServerSentMessage)
			)
		} else {
			// the cache hasn't received the initial data yet, so we need to wait for it
			// it will broadcast on its own
			this.log.debug('waiting for initial data')
		}

		this.sockets.add(serverWebSocket)

		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}

	private async handleSocketMessage(socket: WebSocket, message: string) {
		const rateLimited = await isRateLimited(this.env, this.userId!)
		this.assertCache()
		await this.cache.waitUntilConnected()

		const msg = JSON.parse(message) as any as ZClientSentMessage
		switch (msg.type) {
			case 'mutate':
				if (rateLimited) {
					this.logEvent({ type: 'rate_limited', id: this.userId! })
					await this.rejectMutation(socket, msg.mutationId, ZErrorCode.rate_limit_exceeded)
				} else {
					this.logEvent({ type: 'mutation', id: this.userId! })
					await this.handleMutate(socket, msg)
				}
				break
			default:
				this.captureException(new Error('Unhandled message'), { message })
		}
	}

	private async rejectMutation(socket: WebSocket, mutationId: string, errorCode: ZErrorCode) {
		this.assertCache()
		this.logEvent({ type: 'reject_mutation', id: this.userId! })
		await this.cache.waitUntilConnected()
		this.cache.store.rejectMutation(mutationId)
		socket?.send(
			JSON.stringify({
				type: 'reject',
				mutationId,
				errorCode,
			} satisfies ZServerSentMessage)
		)
	}

	private async assertValidMutation(update: ZRowUpdate) {
		// s is the entire set of data that the user has access to
		// and is up to date with all committed mutations so far.
		// we commit each mutation one at a time before handling the next.
		const s = this.cache!.store.getFullData()
		if (!s) {
			// This should never happen
			throw new ZMutationError(ZErrorCode.unknown_error, 'Store data not fetched')
		}
		switch (update.table) {
			case 'user': {
				const isUpdatingSelf = (update.row as TlaUser).id === this.userId
				if (!isUpdatingSelf)
					throw new ZMutationError(
						ZErrorCode.forbidden,
						'Cannot update user record that is not our own'
					)
				// todo: prevent user from updating their email?
				return
			}
			case 'file': {
				const nextFile = update.row as TlaFilePartial
				const prevFile = s.files.find((f) => f.id === nextFile.id)
				if (!prevFile) {
					const isOwner = nextFile.ownerId === this.userId
					if (isOwner) return
					throw new ZMutationError(
						ZErrorCode.forbidden,
						`Cannot create a file for another user ${nextFile.id}`
					)
				}
				// Owners are allowed to make changes
				if (prevFile.ownerId === this.userId) return

				// We can make changes to updatedAt field in a shared, editable file
				if (prevFile.shared && prevFile.sharedLinkType === 'edit') {
					const { id: _id, ...rest } = nextFile
					if (Object.keys(rest).length === 1 && nextFile.updatedAt !== undefined) return
					throw new ZMutationError(
						ZErrorCode.forbidden,
						'Cannot update fields other than updatedAt on a shared filed'
					)
				}
				throw new ZMutationError(
					ZErrorCode.forbidden,
					'Cannot update file that is not our own and not shared in edit mode' +
						` user id ${this.userId} ownerId ${prevFile.ownerId}`
				)
			}
			case 'file_state': {
				const nextFileState = update.row as TlaFileState
				let file = s.files.find((f) => f.id === nextFileState.fileId)
				if (!file) {
					// The user might not have access to this file yet, because they just followed a link
					// let's allow them to create a file state for it if it exists and is shared.
					file = (await this.replicator.getFileRecord(nextFileState.fileId)) ?? undefined
				}
				if (!file) {
					throw new ZMutationError(ZErrorCode.bad_request, `File not found ${nextFileState.fileId}`)
				}
				if (file.ownerId === this.userId) return
				if (file.shared) return

				throw new ZMutationError(
					ZErrorCode.forbidden,
					"Cannot update file state of file we don't own and is not shared"
				)
			}
		}
	}

	private async _doMutate(msg: ZClientSentMessage) {
		this.assertCache()
		const insertedFiles = await this.db.transaction().execute(async (tx) => {
			const insertedFiles: TlaFile[] = []
			for (const update of msg.updates) {
				await this.assertValidMutation(update)
				switch (update.event) {
					case 'insert': {
						if (update.table === 'file_state') {
							const { fileId: _fileId, userId: _userId, ...rest } = update.row as any
							await tx
								.insertInto(update.table)
								.values(update.row as TlaFileState)
								.onConflict((oc) => {
									if (Object.keys(rest).length === 0) {
										return oc.columns(['fileId', 'userId']).doNothing()
									} else {
										return oc.columns(['fileId', 'userId']).doUpdateSet(rest)
									}
								})
								.execute()
							break
						} else {
							const { id: _id, ...rest } = update.row as any
							const result = await tx
								.insertInto(update.table)
								.values(update.row as any)
								.onConflict((oc) => oc.column('id').doUpdateSet(rest))
								.returningAll()
								.execute()
							if (update.table === 'file' && result.length > 0) {
								insertedFiles.push(result[0] as any as TlaFile)
							}
							break
						}
					}
					case 'update': {
						const mutableColumns = Object.keys(update.row).filter((k) =>
							isColumnMutable(update.table, k)
						)
						if (mutableColumns.length === 0) continue
						const updates = Object.fromEntries(
							mutableColumns.map((k) => [k, (update.row as any)[k]])
						)
						if (update.table === 'file_state') {
							const { fileId, userId } = update.row as any
							await tx
								.updateTable('file_state')
								.set(updates)
								.where('fileId', '=', fileId)
								.where('userId', '=', userId)
								.execute()
						} else {
							const { id, ...rest } = update.row as any

							await tx.updateTable(update.table).set(updates).where('id', '=', id).execute()
							if (update.table === 'file') {
								const currentFile = this.cache.store.getFullData()?.files.find((f) => f.id === id)
								if (
									currentFile &&
									rest.published !== undefined &&
									currentFile.published !== rest.published
								) {
									if (rest.published) {
										await this.publishSnapshot(currentFile)
									} else {
										await this.unpublishSnapshot(currentFile)
									}
								} else if (
									currentFile &&
									currentFile.published &&
									rest.lastPublished !== undefined &&
									currentFile.lastPublished < rest.lastPublished
								) {
									await this.publishSnapshot(currentFile)
								}
							}
						}
						break
					}
					case 'delete':
						if (update.table === 'file_state') {
							const { fileId, userId } = update.row as any
							await tx
								.deleteFrom('file_state')
								.where('fileId', '=', fileId)
								.where('userId', '=', userId)
								.execute()
						} else {
							const { id } = update.row as any
							await tx.deleteFrom(update.table).where('id', '=', id).execute()
						}
						if (update.table === 'file') {
							const { id } = update.row as TlaFile
							await this.deleteFileStuff(id)
						}
						break
				}
				this.cache.store.updateOptimisticData([update], msg.mutationId)
			}
			return insertedFiles
		})
		for (const file of insertedFiles) {
			getRoomDurableObject(this.env, file.id).appFileRecordCreated(file)
		}
	}

	private async handleMutate(socket: WebSocket, msg: ZClientSentMessage) {
		this.assertCache()
		try {
			// we connect to pg via a pooler, so in the case that the pool is exhausted
			// we need to retry the connection. (also in the case that a neon branch is asleep apparently?)
			await retryOnConnectionFailure(
				() => this._doMutate(msg),
				() => {
					this.logEvent({ type: 'connect_retry', id: this.userId! })
				}
			)
			// TODO: We should probably handle a case where the above operation succeeds but the one below fails
			this.log.debug('mutation success', this.userId)
			await this.db
				.transaction()
				.execute(async (tx) => {
					const result = await tx
						.insertInto('user_mutation_number')
						.values({
							userId: this.userId!,
							mutationNumber: 1,
						})
						.onConflict((oc) =>
							oc.column('userId').doUpdateSet({
								mutationNumber: sql`user_mutation_number."mutationNumber" + 1`,
							})
						)
						.returning('mutationNumber')
						.executeTakeFirstOrThrow()
					this.log.debug('mutation number success', this.userId)
					const mutationNumber = Number(result.mutationNumber)
					const currentMutationNumber = this.cache.mutations.at(-1)?.mutationNumber ?? 0
					assert(
						mutationNumber > currentMutationNumber,
						`mutation number did not increment mutationNumber: ${mutationNumber} current: ${currentMutationNumber}`
					)
					this.log.debug('pushing mutation to cache', this.userId, mutationNumber)
					this.cache.mutations.push({
						mutationNumber,
						mutationId: msg.mutationId,
						timestamp: Date.now(),
					})
				})
				.catch((e) => {
					this.cache.mutations = this.cache.mutations.filter((m) => m.mutationId !== msg.mutationId)
					throw e
				})
		} catch (e: any) {
			const code = e instanceof ZMutationError ? e.errorCode : ZErrorCode.unknown_error
			this.captureException(e, {
				errorCode: code,
				reason: e.cause ?? e.message ?? e.stack ?? JSON.stringify(e),
			})
			await this.rejectMutation(socket, msg.mutationId, code)
		}
	}

	/* ------- RPCs -------  */

	async handleReplicationEvent(event: ZReplicationEvent) {
		this.logEvent({ type: 'replication_event', id: this.userId ?? 'anon' })
		this.log.debug('replication event', event, !!this.cache)
		if (!this.cache) {
			return 'unregister'
		}

		this.cache.handleReplicationEvent(event)

		return 'ok'
	}

	/* --------------  */

	private async deleteFileStuff(id: string) {
		const fileRecord = await this.replicator.getFileRecord(id)
		const room = this.env.TLDR_DOC.get(this.env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${id}`))
		await room.appFileRecordDidDelete()
		if (!fileRecord) {
			throw new Error('file record not found')
		}
		const publishedSlug = fileRecord.publishedSlug

		// Create a new slug for the published room
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
	}

	private async publishSnapshot(file: TlaFile) {
		if (file.ownerId !== this.userId) {
			throw new ZMutationError(ZErrorCode.forbidden, 'Cannot publish file that is not our own')
		}

		try {
			// make sure the room's snapshot is up to date
			await getRoomDurableObject(this.env, file.id).awaitPersist()
			// and that it exists
			const snapshot = await this.env.ROOMS.get(getR2KeyForRoom({ slug: file.id, isApp: true }))

			if (!snapshot) {
				throw new Error('Snapshot not found')
			}
			const blob = await snapshot.blob()

			// Create a new slug for the published room
			await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(file.publishedSlug, file.id)

			// Bang the snapshot into the database
			await this.env.ROOM_SNAPSHOTS.put(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true }),
				blob
			)
			const currentTime = new Date().toISOString()
			await this.env.ROOM_SNAPSHOTS.put(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}|${currentTime}`, isApp: true }),
				blob
			)
		} catch (e) {
			throw new ZMutationError(ZErrorCode.publish_failed, 'Failed to publish snapshot', e)
		}
	}

	private async unpublishSnapshot(file: TlaFile) {
		if (file.ownerId !== this.userId) {
			throw new ZMutationError(ZErrorCode.forbidden, 'Cannot unpublish file that is not our own')
		}

		try {
			await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(file.publishedSlug)
			await this.env.ROOM_SNAPSHOTS.delete(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true })
			)
		} catch (e) {
			throw new ZMutationError(ZErrorCode.unpublish_failed, 'Failed to unpublish snapshot', e)
		}
	}

	private writeEvent(eventData: EventData) {
		writeDataPoint(this.measure, this.env, 'user_durable_object', eventData)
	}

	logEvent(event: TLUserDurableObjectEvent) {
		switch (event.type) {
			case 'reboot_duration':
				this.writeEvent({
					blobs: [event.type, event.id],
					doubles: [event.duration],
				})
				break
			case 'cold_start_time':
				this.writeEvent({
					blobs: [event.type, event.id],
					doubles: [event.duration],
				})
				break

			default:
				this.writeEvent({ blobs: [event.type, event.id] })
		}
	}

	/** sneaky test stuff */
	// this allows us to test the 'your client is out of date please refresh' flow
	private __test__isForceDowngraded = false
	async __test__downgradeClient(isDowngraded: boolean) {
		if (this.env.IS_LOCAL !== 'true') {
			return
		}
		this.__test__isForceDowngraded = isDowngraded
		this.sockets.forEach((socket) => {
			socket.close()
		})
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

class ZMutationError extends Error {
	constructor(
		public errorCode: ZErrorCode,
		message: string,
		public cause?: unknown
	) {
		super(message)
	}
}
