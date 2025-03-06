import {
	DB,
	isColumnMutable,
	MAX_NUMBER_OF_FILES,
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaUser,
	Z_PROTOCOL_VERSION,
	ZClientSentMessage,
	ZErrorCode,
	ZRowUpdate,
	ZServerSentMessage,
} from '@tldraw/dotcom-shared'
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { assert, ExecutionQueue, sleep } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { Kysely, sql, Transaction } from 'kysely'
import { Logger } from './Logger'
import { createPostgresConnectionPool } from './postgres'
import { getR2KeyForRoom } from './r2'
import { Analytics, Environment, getUserDoSnapshotKey, TLUserDurableObjectEvent } from './types'
import { UserDataSyncer, ZReplicationEvent } from './UserDataSyncer'
import { EventData, writeDataPoint } from './utils/analytics'
import { getRoomDurableObject } from './utils/durableObjects'
import { isRateLimited } from './utils/rateLimit'
import { retryOnConnectionFailure } from './utils/retryOnConnectionFailure'

const ONE_MINUTE = 60 * 1000
export class TLUserDurableObject extends DurableObject<Environment> {
	private readonly db: Kysely<DB>
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
	}

	interval: NodeJS.Timeout | null = null
	nextMutationTimestamp = Date.now() + 2 * ONE_MINUTE + 5 * ONE_MINUTE * Math.random()

	private maybeStartInterval() {
		if (!this.interval) {
			this.interval = setInterval(() => {
				// do cache persist + cleanup
				this.cache?.onInterval()
				// do a noop mutation every 5 minutes
				if (Date.now() > this.nextMutationTimestamp) {
					this.bumpMutationNumber(this.db)
						.then(() => {
							this.nextMutationTimestamp = Date.now() + 5 * ONE_MINUTE
						})
						.catch((e) => this.captureException(e, { source: 'noop mutation' }))
				}

				// clean up closed sockets if there are any
				for (const socket of this.sockets) {
					if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
						this.sockets.delete(socket)
					}
				}

				if (this.sockets.size === 0 && typeof this.interval === 'number') {
					clearInterval(this.interval)
					this.interval = null
				}
			}, 1000)
		}
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
	private readonly messageQueue = new ExecutionQueue()

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
			this.messageQueue.push(() => this.handleSocketMessage(serverWebSocket, e.data.toString()))
		)
		serverWebSocket.addEventListener('close', () => {
			this.sockets.delete(serverWebSocket)
		})
		serverWebSocket.addEventListener('error', (e) => {
			this.captureException(e, { source: 'serverWebSocket "error" event' })
			this.sockets.delete(serverWebSocket)
		})

		this.sockets.add(serverWebSocket)
		this.maybeStartInterval()

		const initialData = this.cache.store.getCommittedData()
		if (initialData) {
			this.log.debug('sending initial data on connect', this.userId)
			serverWebSocket.send(
				JSON.stringify({
					type: 'initial_data',
					initialData,
				} satisfies ZServerSentMessage)
			)
		} else {
			this.log.debug('no initial data to send, waiting for boot to finish', this.userId)
		}

		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}

	private async handleSocketMessage(socket: WebSocket, message: string) {
		const rateLimited = await isRateLimited(this.env, this.userId!)
		this.assertCache()

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

	async bumpMutationNumber(db: Kysely<DB> | Transaction<DB>) {
		return db
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
	}

	private async rejectMutation(socket: WebSocket, mutationId: string, errorCode: ZErrorCode) {
		this.assertCache()
		this.logEvent({ type: 'reject_mutation', id: this.userId! })
		this.cache.store.rejectMutation(mutationId)
		this.cache.mutations = this.cache.mutations.filter((m) => m.mutationId !== mutationId)
		socket?.send(
			JSON.stringify({
				type: 'reject',
				mutationId,
				errorCode,
			} satisfies ZServerSentMessage)
		)
	}

	private async assertValidMutation(update: ZRowUpdate, tx: Transaction<DB>) {
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
						'Cannot update user record that is not our own: ' + (update.row as TlaUser).id
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
						`Cannot create a file for another user. fileId: ${nextFile.id} file owner: ${nextFile.ownerId} current user: ${this.userId}`
					)
				}
				if (prevFile.isDeleted)
					throw new ZMutationError(ZErrorCode.forbidden, 'Cannot update a deleted file')
				// Owners are allowed to make changes
				if (prevFile.ownerId === this.userId) return

				// We can make changes to updatedAt field in a shared, editable file
				if (prevFile.shared && prevFile.sharedLinkType === 'edit') {
					const { id: _id, ...rest } = nextFile
					if (Object.keys(rest).length === 1 && rest.updatedAt !== undefined) return
					throw new ZMutationError(
						ZErrorCode.forbidden,
						'Cannot update fields other than updatedAt on a shared file'
					)
				}
				throw new ZMutationError(
					ZErrorCode.forbidden,
					'Cannot update file that is not our own and not shared in edit mode' +
						` user id ${this.userId} ownerId ${prevFile.ownerId}`
				)
			}
			case 'file_state': {
				const nextFileState = update.row as TlaFileStatePartial
				let file = s.files.find((f) => f.id === nextFileState.fileId)
				if (!file) {
					// The user might not have access to this file yet, because they just followed a link
					// let's allow them to create a file state for it if it exists and is shared.
					file = await tx
						.selectFrom('file')
						.selectAll()
						.where('id', '=', nextFileState.fileId)
						.executeTakeFirst()
				}
				if (!file) {
					throw new ZMutationError(ZErrorCode.bad_request, `File not found ${nextFileState.fileId}`)
				}
				if (nextFileState.userId !== this.userId) {
					throw new ZMutationError(
						ZErrorCode.forbidden,
						`Cannot update file state for another user ${nextFileState.userId}`
					)
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
		const { insertedFiles, newGuestFiles } = await this.db.transaction().execute(async (tx) => {
			const insertedFiles: TlaFile[] = []
			const newGuestFiles: TlaFile[] = []
			for (const update of msg.updates) {
				await this.assertValidMutation(update, tx)
				switch (update.event) {
					case 'insert': {
						if (update.table === 'file_state') {
							const { fileId, userId, ...rest } = update.row as any
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
							const guestFile = await tx
								.selectFrom('file')
								.where('id', '=', fileId)
								.where('ownerId', '!=', userId)
								.selectAll()
								.executeTakeFirst()
							if (guestFile) {
								newGuestFiles.push(guestFile as any as TlaFile)
							}
							break
						} else {
							const { id: _id, ...rest } = update.row as any
							if (update.table === 'file') {
								const count =
									this.cache.store
										.getFullData()
										?.files.filter((f) => f.ownerId === this.userId && !f.isDeleted).length ?? 0
								if (count >= MAX_NUMBER_OF_FILES) {
									throw new ZMutationError(
										ZErrorCode.max_files_reached,
										`Cannot create more than ${MAX_NUMBER_OF_FILES} files.`
									)
								}
							}
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
						break
				}
				this.cache.store.updateOptimisticData([update], msg.mutationId)
			}
			const result = await this.bumpMutationNumber(tx)

			this.nextMutationTimestamp = Date.now() + 5 * ONE_MINUTE

			const currentMutationNumber = this.cache.mutations.at(-1)?.mutationNumber ?? 0
			const mutationNumber = result.mutationNumber
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
			return { insertedFiles, newGuestFiles }
		})

		for (const file of insertedFiles) {
			getRoomDurableObject(this.env, file.id).appFileRecordCreated(file)
		}
		for (const file of newGuestFiles) {
			this.cache.addGuestFile(file)
		}
	}

	private async handleMutate(socket: WebSocket, msg: ZClientSentMessage) {
		this.assertCache()
		while (!this.cache.store.getCommittedData()) {
			// this could happen if the cache was cleared due to a full db reboot
			await sleep(100)
		}
		this.log.debug('mutation', this.userId, msg)
		try {
			// we connect to pg via a pooler, so in the case that the pool is exhausted
			// we need to retry the connection. (also in the case that a neon branch is asleep apparently?)
			await retryOnConnectionFailure(
				() => this._doMutate(msg),
				() => {
					this.logEvent({ type: 'connect_retry', id: this.userId! })
				}
			)
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
		if (await this.notActive()) {
			this.log.debug('requesting to unregister')
			return 'unregister'
		}

		try {
			this.cache?.handleReplicationEvent(event)
		} catch (e) {
			this.captureException(e)
		}

		return 'ok'
	}

	async notActive() {
		return !this.cache
	}

	/* --------------  */

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

	async admin_forceHardReboot(userId: string) {
		if (this.cache) {
			await this.cache?.reboot({ hard: true, delay: false })
		} else {
			await this.env.USER_DO_SNAPSHOTS.delete(getUserDoSnapshotKey(this.env, userId))
		}
	}

	async admin_getData(userId: string) {
		const cache =
			this.cache ??
			new UserDataSyncer(
				this.ctx,
				this.env,
				this.db,
				userId,
				() => {},
				() => {},
				this.log
			)
		while (!cache.store.getCommittedData()) {
			await sleep(100)
		}
		return cache.store.getCommittedData()
	}
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
