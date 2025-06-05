// eslint-disable @typescript-eslint/no-deprecated
import { CustomMutatorImpl } from '@rocicorp/zero'
import { SchemaCRUD, SchemaQuery } from '@rocicorp/zero/out/zql/src/mutate/custom'
import {
	DB,
	TlaFile,
	TlaSchema,
	ZClientSentMessage,
	ZErrorCode,
	ZServerSentPacket,
	createMutators,
	downgradeZStoreData,
	schema,
} from '@tldraw/dotcom-shared'
import { ExecutionQueue, assert, assertExists, mapObjectMapValues, sleep } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { Kysely, PostgresDialect, Transaction, sql } from 'kysely'
import { Pool, PoolClient } from 'pg'
import { Logger } from './Logger'
import { UserDataSyncer, ZReplicationEvent } from './UserDataSyncer'
import { Analytics, Environment, TLUserDurableObjectEvent, getUserDoSnapshotKey } from './types'
import { EventData, writeDataPoint } from './utils/analytics'
import { getRoomDurableObject } from './utils/durableObjects'
import { isRateLimited } from './utils/rateLimit'
import { retryOnConnectionFailure } from './utils/retryOnConnectionFailure'
import { PerfHackHooks, ServerCRUD } from './zero/ServerCrud'
import { ServerQuery } from './zero/ServerQuery'
import { ZMutationError } from './zero/ZMutationError'
import { legacy_assertValidMutation } from './zero/legacy_assertValidMutation'

interface SocketMetadata {
	version: number
	protocolVersion: number
	sessionId: string
	userId: string
}

const SOCKET_METADATA_VERSION = 1

export class TLUserDurableObject extends DurableObject<Environment> {
	private readonly db: Kysely<DB>
	private measure: Analytics | undefined

	private readonly sentry
	private captureException(exception: unknown, extras?: Record<string, unknown>) {
		this.sentry?.withScope((scope) => {
			if (extras) scope.setExtras(extras)
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

			const rateLimited = await isRateLimited(this.env, this.userId)
			if (rateLimited) {
				this.log.debug('rate limited')
				this.logEvent({ type: 'rate_limited', id: this.userId })
				throw new Error('Rate limited')
			}

			await this.ensureCache()
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

	private async ensureCache(): Promise<void> {
		if (this.cache) return

		// This could be called from hibernation wake-up, so we need to ensure userId is set
		if (!this.userId) {
			// Try to get userId from any connected hibernated socket metadata
			const hibernatedSockets = this.ctx.getWebSockets()
			for (const socket of hibernatedSockets) {
				const metadata = this.deserializeSocketMetadata(socket)
				if (metadata?.userId) {
					this.userId = metadata.userId
					this.log.debug('hibernation: restored userId from socket metadata', this.userId)
					break
				}
			}

			// If we still don't have userId, we can't proceed
			if (!this.userId) {
				throw new Error('Cannot initialize cache: userId not available during hibernation wake-up')
			}
		}

		this.coldStartStartTime = Date.now()
		this.log.debug('hibernation: creating cache during wake-up', this.userId)
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

	private async assertCache(): Promise<void> {
		await this.ensureCache()
		assert(this.cache, 'cache should exist after ensureCache')
	}

	interval: NodeJS.Timeout | null = null

	private maybeStartInterval() {
		if (!this.interval) {
			this.interval = setInterval(() => {
				// do cache persist + cleanup
				this.cache?.onInterval()

				// clean up closed sockets if there are any - use hibernation-compatible method
				const hibernatedSockets = this.ctx.getWebSockets()

				// Stop the interval if no sockets are connected
				if (hibernatedSockets.length === 0 && typeof this.interval === 'number') {
					clearInterval(this.interval)
					this.interval = null
				}
			}, 2000)
		}
	}

	private makeCrud(
		client: PoolClient,
		signal: AbortSignal,
		perfHackHooks: PerfHackHooks
	): SchemaCRUD<TlaSchema> {
		return mapObjectMapValues(
			schema.tables,
			(_, table) => new ServerCRUD(client, table, signal, perfHackHooks)
		)
	}

	private makeQuery(client: PoolClient, signal: AbortSignal): SchemaQuery<TlaSchema> {
		return mapObjectMapValues(
			schema.tables,
			(tableName) => new ServerQuery(signal, client, true, tableName) as any
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

		// Use ctx.getWebSockets() for hibernation-compatible socket access
		const hibernatedSockets = this.ctx.getWebSockets()

		for (const socket of hibernatedSockets) {
			if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
				continue
			}
			if (socket.readyState !== WebSocket.OPEN) {
				continue
			}

			// Get socket metadata from hibernation attachment
			const socketMeta = socket.deserializeAttachment() as SocketMetadata
			if (!socketMeta) {
				this.captureException(new Error('Socket metadata not found'), {
					source: 'flushBuffer',
					userId: this.userId,
					socketReadyState: socket.readyState,
				})
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
				return
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

	async onRequest(req: IRequest): Promise<Response> {
		const url = new URL(req.url)
		const params = Object.fromEntries(url.searchParams)
		const protocolVersion = parseInt(params.protocolVersion)
		assert(Number.isFinite(protocolVersion), `Invalid protocol version ${params.protocolVersion}`)

		// Get sessionId from query params - it's required
		const sessionId = params.sessionId
		assert(sessionId, 'sessionId is required')

		await this.assertCache()
		assert(this.cache, 'cache should exist after assertCache')
		assert(this.userId, 'userId should be set after cache initialization')

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()

		// Use hibernation API instead of legacy WebSocket API
		this.ctx.acceptWebSocket(serverWebSocket)

		// Set up socket metadata for hibernation with versioning
		const metadata: SocketMetadata = {
			version: SOCKET_METADATA_VERSION,
			protocolVersion,
			sessionId,
			userId: this.userId,
		}
		serverWebSocket.serializeAttachment(metadata)

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

	// Hibernation handler for incoming WebSocket messages
	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		// Handle both string and ArrayBuffer message types
		const messageString = typeof message === 'string' ? message : new TextDecoder().decode(message)

		await this.messageQueue.push(() =>
			this.handleSocketMessage(ws, messageString).catch((e) =>
				this.captureException(e, { source: 'hibernation webSocketMessage handler' })
			)
		)
	}

	// Hibernation handler for WebSocket close events
	override async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
		this.log.debug('hibernation: webSocketClose', this.userId, {
			code,
			reason,
			wasClean,
			meta: ws.deserializeAttachment(),
		})
	}

	// Hibernation handler for WebSocket errors
	override async webSocketError(_ws: WebSocket, error: unknown) {
		this.log.debug('hibernation: webSocketError', this.userId, error)
		this.captureException(error, { source: 'hibernation webSocketError handler' })
		// No need to manually clean up - hibernation handles socket lifecycle
	}

	private async handleSocketMessage(socket: WebSocket, message: string) {
		const rateLimited = await isRateLimited(this.env, this.userId!)
		await this.assertCache() // Now async and hibernation-aware

		// Log hibernation wake-up and metadata restoration
		const socketMeta = this.deserializeSocketMetadata(socket)
		if (socketMeta) {
			this.log.debug('hibernation: handling message with restored metadata', this.userId, {
				sessionId: socketMeta.sessionId,
				protocolVersion: socketMeta.protocolVersion,
				metadataVersion: socketMeta.version,
			})
		}

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
		await this.assertCache()
		assert(this.cache, 'cache should exist after assertCache')

		const socketMeta = assertExists(
			socket.deserializeAttachment(),
			'Socket metadata not found'
		) as SocketMetadata
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

	private pool: Pool

	private async _doMutate(msg: ZClientSentMessage) {
		await this.assertCache()
		assert(this.cache, 'cache should exist after assertCache')

		const client = await this.pool.connect()

		try {
			const newFiles = [] as TlaFile[]

			await client.query('BEGIN')

			const controller = new AbortController()
			const mutate = this.makeCrud(client, controller.signal, { newFiles })
			try {
				if (msg.type === 'mutate') {
					// legacy
					for (const update of msg.updates) {
						await legacy_assertValidMutation(this.userId!, client, update)
						await mutate[update.table][update.event](update.row as any)
					}
				} else {
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
				}
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

			for (const file of newFiles) {
				if (file.ownerId !== this.userId) {
					this.cache.addGuestFile(file)
				} else {
					getRoomDurableObject(this.env, file.id).appFileRecordCreated(file)
				}
			}
		} catch (e) {
			await client.query('ROLLBACK')
			throw e
		} finally {
			client.release()
		}
	}

	private async handleMutate(socket: WebSocket, msg: ZClientSentMessage) {
		await this.assertCache()
		assert(this.cache, 'cache should exist after assertCache')

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
		for (const socket of this.ctx.getWebSockets()) {
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

	private deserializeSocketMetadata(socket: WebSocket): SocketMetadata | null {
		const metadata = socket.deserializeAttachment() as SocketMetadata
		if (metadata && metadata.version === SOCKET_METADATA_VERSION) {
			return metadata
		}
		return null
	}
}
