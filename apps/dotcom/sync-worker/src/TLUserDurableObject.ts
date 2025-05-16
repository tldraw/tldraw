import { CustomMutatorImpl } from '@rocicorp/zero'
import type { SchemaCRUD, SchemaQuery, TableCRUD } from '@rocicorp/zero/out/zql/src/mutate/custom'
import {
	DB,
	MAX_NUMBER_OF_FILES,
	MIN_Z_PROTOCOL_VERSION,
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaSchema,
	TlaUser,
	ZClientSentMessage,
	ZErrorCode,
	ZRowUpdate,
	ZServerSentPacket,
	createMutators,
	downgradeZStoreData,
	schema,
} from '@tldraw/dotcom-shared'
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { ExecutionQueue, assert, assertExists, mapObjectMapValues, sleep } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { Kysely, PostgresDialect, Transaction, sql } from 'kysely'
import { Pool, PoolClient } from 'pg'
import { Logger } from './Logger'
import { UserDataSyncer, ZReplicationEvent } from './UserDataSyncer'
import { Query, parseRow } from './postgres'
import { Analytics, Environment, TLUserDurableObjectEvent, getUserDoSnapshotKey } from './types'
import { EventData, writeDataPoint } from './utils/analytics'
import { getRoomDurableObject } from './utils/durableObjects'
import { isRateLimited } from './utils/rateLimit'
import { retryOnConnectionFailure } from './utils/retryOnConnectionFailure'

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

		this.pool = new Pool({
			connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
			application_name: 'user-do',
			idleTimeoutMillis: 3_000,
			max: 1,
		})

		this.db = new Kysely<DB>({
			dialect: new PostgresDialect({ pool: this.pool }),
			log: ['error'],
		})
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

	private maybeStartInterval() {
		if (!this.interval) {
			this.interval = setInterval(() => {
				// do cache persist + cleanup
				this.cache?.onInterval()

				// clean up closed sockets if there are any
				for (const socket of this.sockets.keys()) {
					if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
						this.sockets.delete(socket)
					}
				}

				if (this.sockets.size === 0 && typeof this.interval === 'number') {
					clearInterval(this.interval)
					this.interval = null
				}
			}, 2000)
		}
	}

	private readonly sockets = new Map<WebSocket, { protocolVersion: number; sessionId: string }>()

	private makeCrud(client: PoolClient): SchemaCRUD<TlaSchema> {
		return mapObjectMapValues(schema.tables, (tableName, table) => {
			return {
				insert: async (data: any) => {
					const row = parseRow(data, table)
					await client.query(
						`insert into public."${tableName}" (${row.allKeys()}) values (${row.allValues()})`,
						row.paramValues
					)
				},
				upsert: async (data: any) => {
					const row = parseRow(data, table)
					await client.query(
						`insert into public."${tableName}" (${row.allKeys()}) values (${row.allValues()})
									on conflict (${row.primaryKeys()}) do update set ${row
										.nonPrimaryKeysArray()
										.map((k) => `"${k}" = excluded."${k}"`)
										.join(',')}`,
						row.paramValues
					)
				},
				delete: async (data: any) => {
					const row = parseRow(data, table)
					await client.query(
						`delete from public."${tableName}" where ${row.primaryKeyWhereClause()}`,
						row.paramValues
					)
				},
				update: async (data: any) => {
					const row = parseRow(data, table)
					const res = await client.query(
						`update public.${tableName} set ${row
							.nonPrimaryKeysArray()
							.map((k) => `${JSON.stringify(k)} = ${row.rowValue(k)}`)
							.join(', ')} where ${row.primaryKeyWhereClause()}`,
						row.paramValues
					)
					if (res.rowCount !== 1) {
						// might have been a noop
						const row = parseRow(data, table)
						const res = await client.query(
							`select count(*) from public.${tableName} where ${row.primaryKeyWhereClause()}`,
							row.paramValues
						)
						if (res.rows[0].count === 0) {
							throw new ZMutationError(ZErrorCode.bad_request, `update failed, no matching rows`)
						}
					}
				},
			} satisfies TableCRUD<TlaSchema['tables'][keyof TlaSchema['tables']]>
		})
	}

	private makeQuery(client: PoolClient): SchemaQuery<TlaSchema> {
		return mapObjectMapValues(
			schema.tables,
			(tableName) => new Query(client, true, tableName) as any
		)
	}

	maybeReportColdStartTime(type: ZServerSentPacket['type']) {
		if (type !== 'initial_data' || !this.coldStartStartTime) return
		const time = Date.now() - this.coldStartStartTime
		this.coldStartStartTime = null
		this.logEvent({ type: 'cold_start_time', id: this.userId!, duration: time })
	}

	private outgoingBuffer = null as ZServerSentPacket[] | null
	private flushBuffer() {
		const buffer = this.outgoingBuffer
		this.outgoingBuffer = null
		if (!buffer) return

		for (const [socket, socketMeta] of this.sockets.entries()) {
			if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
				this.sockets.delete(socket)
				continue
			}
			if (socket.readyState !== WebSocket.OPEN) {
				continue
			}
			// maybe downgrade the data for the client
			if (socketMeta.protocolVersion === 1) {
				for (let msg of buffer) {
					if (msg.type === 'initial_data') {
						msg = {
							type: 'initial_data',
							initialData: downgradeZStoreData(msg.initialData) as any,
						}
					}
					socket.send(JSON.stringify(msg))
				}
			}

			socket.send(JSON.stringify(buffer))
		}
	}

	broadcast(message: ZServerSentPacket) {
		this.logEvent({ type: 'broadcast_message', id: this.userId! })
		this.maybeReportColdStartTime(message.type)
		if (!this.outgoingBuffer) {
			this.outgoingBuffer = []
			setTimeout(() => {
				this.flushBuffer()
			})
		}
		this.outgoingBuffer.push(message)
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

		if (protocolVersion < MIN_Z_PROTOCOL_VERSION || this.__test__isForceDowngraded) {
			serverWebSocket.close(TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			return new Response(null, { status: 101, webSocket: clientWebSocket })
		}

		serverWebSocket.addEventListener('message', (e) =>
			this.messageQueue.push(() =>
				this.handleSocketMessage(serverWebSocket, e.data.toString()).catch((e) =>
					this.captureException(e, { source: 'serverWebSocket "message" event' })
				)
			)
		)
		serverWebSocket.addEventListener('close', () => {
			this.sockets.delete(serverWebSocket)
		})
		serverWebSocket.addEventListener('error', (e) => {
			this.captureException(e, { source: 'serverWebSocket "error" event' })
			this.sockets.delete(serverWebSocket)
		})

		this.sockets.set(serverWebSocket, {
			protocolVersion,
			sessionId,
		})
		this.maybeStartInterval()

		const initialData = this.cache.store.getCommittedData()
		if (initialData) {
			this.log.debug('sending initial data on connect', this.userId)
			serverWebSocket.send(
				protocolVersion === 1
					? JSON.stringify({
							type: 'initial_data',
							initialData: downgradeZStoreData(initialData),
						})
					: JSON.stringify([
							{
								type: 'initial_data',
								initialData,
							} satisfies ZServerSentPacket,
						])
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
			case 'mutator':
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
		const socketMeta = assertExists(this.sockets.get(socket), 'Socket not found')
		this.logEvent({ type: 'reject_mutation', id: this.userId! })
		this.cache.store.rejectMutation(mutationId)
		this.cache.mutations = this.cache.mutations.filter((m) => m.mutationId !== mutationId)

		const msg: ZServerSentPacket = {
			type: 'reject',
			mutationId,
			errorCode,
		}

		socket?.send(JSON.stringify(socketMeta.protocolVersion === 1 ? msg : [msg]))
	}

	private async assertValidMutation(update: ZRowUpdate, client: PoolClient) {
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
				if (update.event === 'insert') {
					const res = await client.query<{ count: number }>(
						`select count(*) from public.file where "ownerId" = $1 and "isDeleted" = false`,
						[this.userId]
					)
					if (res.rows[0].count >= MAX_NUMBER_OF_FILES) {
						throw new ZMutationError(
							ZErrorCode.max_files_reached,
							`Cannot create more than ${MAX_NUMBER_OF_FILES} files`
						)
					}
				}
				const nextFile = update.row as TlaFilePartial
				const res = await client.query<TlaFile>('select * from public.file where id = $1', [
					nextFile.id,
				])
				if (!res.rowCount) {
					const isOwner = nextFile.ownerId === this.userId
					if (isOwner) return
					throw new ZMutationError(
						ZErrorCode.forbidden,
						`Cannot create a file for another user. fileId: ${nextFile.id} file owner: ${nextFile.ownerId} current user: ${this.userId}`
					)
				}
				const prevFile = res.rows[0]
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
				const res = await client.query<TlaFile>(`select * from public.file where id = $1`, [
					nextFileState.fileId,
				])
				if (!res.rowCount) {
					throw new ZMutationError(ZErrorCode.bad_request, `File not found ${nextFileState.fileId}`)
				}
				if (nextFileState.userId !== this.userId) {
					throw new ZMutationError(
						ZErrorCode.forbidden,
						`Cannot update file state for another user ${nextFileState.userId}`
					)
				}
				const file = res.rows[0]
				if (file.ownerId === this.userId) return
				if (file.shared) return

				throw new ZMutationError(
					ZErrorCode.forbidden,
					"Cannot update file state of file we don't own and is not shared"
				)
			}
			default:
				// this legacy mutation validation only applies to user, file, and file_state tables
				throw new ZMutationError(
					ZErrorCode.bad_request,
					`Invalid table ${update.table} for mutation ${update.event}`
				)
		}
	}

	private pool: Pool

	private async _doMutate(msg: ZClientSentMessage) {
		this.assertCache()
		const client = await this.pool.connect()

		try {
			const newGuestFiles: TlaFile[] = []
			const insertedFiles: TlaFile[] = []

			await client.query('BEGIN')

			const mutate = this.makeCrud(client)
			if (msg.type === 'mutate') {
				// legacy
				for (const update of msg.updates) {
					await this.assertValidMutation(update, client)
					await mutate[update.table][update.event](update.row as any)
					if (update.table === 'file_state' && update.event === 'insert') {
						const res = await client.query('select * from public.file where id = $1', [
							(update.row as TlaFileState).fileId,
						])
						assert(res.rowCount === 1, 'File not found')
						newGuestFiles.push(res.rows[0])
					} else if (update.table === 'file' && update.event === 'insert') {
						const res = await client.query('select * from public.file where id = $1', [
							(update.row as TlaFile).id,
						])
						assert(res.rowCount === 1, 'File not found')
						insertedFiles.push(res.rows[0])
					}
				}
			} else {
				// new
				const mutators = createMutators(this.userId!)
				const path = msg.mutation[0].split('.')
				assert(path.length <= 2, 'Invalid mutation path')
				const mutator: CustomMutatorImpl<TlaSchema> =
					path.length === 1 ? (mutators as any)[path[0]] : (mutators as any)[path[0]][path[1]]
				assert(mutator, 'Invalid mutator path')
				await mutator(
					{
						clientID: '',
						dbTransaction: {
							wrappedTransaction: null as any,
							async query(sqlString: string, params: unknown[]): Promise<any[]> {
								return client.query(sqlString, params).then((res) => res.rows)
							},
						},
						mutate,
						location: 'server',
						reason: 'authoritative',
						mutationID: 0,
						query: this.makeQuery(client),
					},
					msg.mutation[1]
				)
			}

			// await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE')
			const res = await client.query<{ mutationNumber: number }>(
				`insert into user_mutation_number ("userId", "mutationNumber") values ($1, 1) on conflict ("userId") do update set "mutationNumber" = user_mutation_number."mutationNumber" + 1 returning "mutationNumber"`,
				[this.userId]
			)

			const currentMutationNumber = this.cache.mutations.at(-1)?.mutationNumber ?? 0
			const mutationNumber = res.rows[0].mutationNumber
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

			await client.query('COMMIT')

			for (const file of insertedFiles) {
				getRoomDurableObject(this.env, file.id).appFileRecordCreated(file)
			}
			for (const guestFile of newGuestFiles) {
				this.cache?.addGuestFile(guestFile)
			}
		} catch (e) {
			await client.query('ROLLBACK')
			throw e
		} finally {
			client.release()
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

	private writeEvent(eventData: EventData) {
		writeDataPoint(this.sentry, this.measure, this.env, 'user_durable_object', eventData)
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
		for (const socket of this.sockets.keys()) {
			socket.close()
		}
	}

	async admin_forceHardReboot(userId: string) {
		if (this.cache) {
			await this.cache?.reboot({ hard: true, delay: false, source: 'admin' })
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
