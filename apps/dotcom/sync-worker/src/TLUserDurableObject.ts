import { CustomMutatorImpl } from '@rocicorp/zero'
import type { SchemaCRUD, SchemaQuery } from '@rocicorp/zero/out/zql/src/mutate/custom'
import {
	DB,
	MIN_Z_PROTOCOL_VERSION,
	TlaSchema,
	TlaUserPartial,
	ZClientSentMessage,
	ZErrorCode,
	ZServerSentPacket,
	createMutators,
	schema,
} from '@tldraw/dotcom-shared'
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from '@tldraw/sync-core'
import { ExecutionQueue, IndexKey, assert, mapObjectMapValues, sleep } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { Kysely, PostgresDialect, Transaction, sql } from 'kysely'
import { Pool, PoolClient } from 'pg'
import { Logger } from './Logger'
import { UserDataSyncer, ZReplicationEvent } from './UserDataSyncer'
import { Analytics, Environment, TLUserDurableObjectEvent, getUserDoSnapshotKey } from './types'
import { EventData, writeDataPoint } from './utils/analytics'
import { isRateLimited } from './utils/rateLimit'
import { retryOnConnectionFailure } from './utils/retryOnConnectionFailure'
import { ChangeAccumulator, ServerCRUD } from './zero/ServerCrud'
import { ServerQuery } from './zero/ServerQuery'
import { ZMutationError } from './zero/ZMutationError'

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

	private makeCrud(
		client: PoolClient,
		signal: AbortSignal,
		changeAccumulator: ChangeAccumulator
	): SchemaCRUD<TlaSchema> {
		return mapObjectMapValues(
			schema.tables,
			(_, table) => new ServerCRUD(client, table, signal, changeAccumulator)
		)
	}

	private makeQuery(client: PoolClient, signal: AbortSignal): SchemaQuery<TlaSchema> {
		return mapObjectMapValues(
			schema.tables,
			(tableName) => new ServerQuery(signal, client, false, tableName) as any
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

		for (const [socket] of this.sockets.entries()) {
			if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
				this.sockets.delete(socket)
				continue
			}
			if (socket.readyState !== WebSocket.OPEN) {
				continue
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

		// before we sent the protocolVersion param, the protocol was the same as v1
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
				JSON.stringify([
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
		this.logEvent({ type: 'reject_mutation', id: this.userId! })
		this.cache.store.rejectMutation(mutationId)
		this.cache.mutations = this.cache.mutations.filter((m) => m.mutationId !== mutationId)

		const msg: ZServerSentPacket = {
			type: 'reject',
			mutationId,
			errorCode,
		}

		socket?.send(JSON.stringify([msg]))
	}

	private pool: Pool

	private async _doMutate(msg: ZClientSentMessage) {
		this.log.debug('doMutate', this.userId, msg)
		assert(msg.type === 'mutator', 'Invalid message type')
		this.assertCache()
		const client = await this.pool.connect()

		try {
			const changeAccumulator: ChangeAccumulator = {
				file: { added: [] },
				user_fairies: { added: [], updated: [], removed: [] },
				file_fairies: { added: [], updated: [], removed: [] },
			}

			await client.query('BEGIN')

			// Acquire shared advisory lock to coordinate with migration
			// This will wait if migrate_user_to_groups is running (which uses exclusive lock)
			// but won't block other mutations (which also use shared locks)
			// Lock will be automatically released when transaction ends
			await client.query('SELECT pg_advisory_xact_lock_shared(hashtext($1))', [this.userId])

			const controller = new AbortController()
			const mutate = this.makeCrud(client, controller.signal, changeAccumulator)
			try {
				// new
				const mutators = createMutators(this.userId!)
				const path = msg.name.split('.')
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
						query: this.makeQuery(client, controller.signal),
					},
					msg.props
				)
			} finally {
				controller.abort()
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

			await this.cache?.incorporateUnsyncedChanges(changeAccumulator)
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
			assert(msg.type === 'mutator', 'Invalid message type')
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
		if (!this.cache) {
			this.logEvent({ type: 'woken_up_by_replication_event', id: this.userId ?? 'anon' })
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

	async __test__prepareForTest(userId: string, legacy: boolean) {
		if (this.env.IS_LOCAL !== 'true') {
			return
		}
		this.userId ??= userId

		await this.db.transaction().execute(async (tx) => {
			const user = await tx
				.selectFrom('user')
				.where('id', '=', userId)
				.selectAll()
				.executeTakeFirst()
			if (!user) {
				console.error('User not found', userId)
				return
			} else {
				await tx
					.updateTable('user')
					.set({
						flags: legacy ? '' : 'groups_backend',
						allowAnalyticsCookie: null,
						enhancedA11yMode: null,
						colorScheme: null,
						locale: null,
						exportBackground: true,
						exportPadding: true,
						exportFormat: 'png',
						inputMode: null,
					} satisfies Omit<TlaUserPartial, 'id'>)
					.where('id', '=', userId)
					.execute()
			}
			await tx.deleteFrom('file_state').where('userId', '=', userId).execute()
			await tx.deleteFrom('file').where('ownerId', '=', userId).execute()
			await tx.deleteFrom('file').where('owningGroupId', '=', userId).execute()
			await tx.deleteFrom('group').where('id', '=', userId).execute()
			if (!legacy) {
				await tx
					.insertInto('group')
					.values({
						id: userId,
						name: '',
						createdAt: Date.now(),
						updatedAt: Date.now(),
						isDeleted: false,
						inviteSecret: null,
					})
					.onConflict((oc) => oc.doNothing())
					.execute()
				await tx
					.insertInto('group_user')
					.values({
						userId: userId,
						groupId: userId,
						createdAt: Date.now(),
						updatedAt: Date.now(),
						role: 'owner',
						index: 'a1' as IndexKey,
						userColor: '',
						userName: '',
					})
					.onConflict((oc) => oc.doNothing())
					.execute()
			}
		})

		await this.cache?.reboot({ delay: false, source: 'admin', hard: true })
	}

	async admin_migrateToGroups(userId: string, inviteSecret: string | null = null) {
		this.userId ??= userId

		this.log.debug('migrating to groups', userId, inviteSecret)
		// Call the Postgres migration function
		const result = await sql<{
			files_migrated: number
			pinned_files_migrated: number
			flag_added: boolean
		}>`SELECT * FROM migrate_user_to_groups(${userId}, ${inviteSecret})`.execute(this.db)

		this.log.debug('migration result', result.rows[0])

		await this.env.USER_DO_SNAPSHOTS.delete(getUserDoSnapshotKey(this.env, userId))
		await this.cache?.reboot({ delay: false, source: 'admin', hard: true })

		this.log.debug('migration complete, user rebooted')

		return result.rows[0]
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

	async admin_delete(userId: string) {
		// Close all websocket connections
		for (const socket of this.sockets.keys()) {
			socket.close()
		}
		this.sockets.clear()

		// Clear the cache/state
		if (this.cache) {
			this.cache = null
		}

		// Delete R2 data snapshot
		await this.env.USER_DO_SNAPSHOTS.delete(getUserDoSnapshotKey(this.env, userId))

		// Clear any intervals
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = null
		}

		await this.db.destroy()
	}
}
