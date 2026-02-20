import type {
	AST,
	Condition,
	CustomMutatorImpl,
	HumanReadable,
	Query,
	RunOptions,
	TableMutator,
	TableSchema,
} from '@rocicorp/zero'
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
import {
	JsonChunkAssembler,
	TLSyncErrorCloseEventCode,
	TLSyncErrorCloseEventReason,
} from '@tldraw/sync-core'
import { ExecutionQueue, IndexKey, assert, mapObjectMapValues, sleep } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { Kysely, PostgresDialect, PostgresPoolClient, Transaction, sql } from 'kysely'
import { Logger } from './Logger'
import { UserDataSyncer, ZReplicationEvent } from './UserDataSyncer'
import { TLPostgresPool } from './postgres'
import { Analytics, Environment, TLUserDurableObjectEvent, getUserDoSnapshotKey } from './types'
import { EventData, writeDataPoint } from './utils/analytics'
import { isRateLimited } from './utils/rateLimit'
import { retryOnConnectionFailure } from './utils/retryOnConnectionFailure'
import { getClerkClient } from './utils/tla/getAuth'
import { ChangeAccumulator, ServerCRUD } from './zero/ServerCrud'
import { ZMutationError } from './zero/ZMutationError'

const ALLOWED_OPS = new Set(['=', '!=', '>', '<', '>=', '<=', 'IS', 'IS NOT'])

function getQueryAstOrThrow(query: unknown): AST {
	if (!query || typeof query !== 'object') {
		throw new Error('Invalid query')
	}
	const ast = Reflect.get(query, 'ast')
	if (!ast || typeof ast !== 'object' || !('table' in ast)) {
		throw new Error('Invalid query')
	}
	return ast as AST
}

interface SocketMetadata {
	protocolVersion: number
	sessionId: string
	userId: string
}

// How often to run the alarm for periodic maintenance (LSN updates)
const ALARM_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

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

	private pool: TLPostgresPool

	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.sentry = createSentry(ctx, env)

		this.log = new Logger(env, 'TLUserDurableObject', this.sentry)
		this.pool = new TLPostgresPool(env, this.log)

		this.db = new Kysely<DB>({
			dialect: new PostgresDialect({ pool: this.pool }),
			log: ['error'],
		})
		this.measure = env.MEASURE
	}

	private userId: string | null = null
	private coldStartStartTime: number | null = null

	readonly router = Router()
		.all('/app/:userId/*', async (req) => {
			if (!this.userId) {
				const id = (this.userId = req.params.userId)
				const user = await this.db
					.selectFrom('user')
					.where('id', '=', id)
					.select('id')
					.executeTakeFirst()
				if (!user) {
					// auth is checked in the main worker, before it gets here, so the clerk
					// user definitely exists at this point.
					const clerk = getClerkClient(this.env)
					const clerkUser = await clerk.users.getUser(id)
					assert(clerkUser, 'Clerk user not found')
					await this.env.USER_DO_SNAPSHOTS.delete(getUserDoSnapshotKey(this.env, id))
					await this.db.transaction().execute(async (tx) => {
						// check that user wasn't added by another request in between the auth check and the snapshot deletion
						if (await tx.selectFrom('user').where('id', '=', id).select('id').executeTakeFirst()) {
							return
						}
						const now = Date.now()
						await tx
							.insertInto('user')
							.values({
								id,
								name: clerkUser.fullName ?? '',
								email: clerkUser.emailAddresses[0].emailAddress,
								avatar: clerkUser.imageUrl,
								color: '___INIT___',
								exportFormat: 'png',
								exportTheme: 'light',
								exportBackground: true,
								exportPadding: true,
								createdAt: now,
								updatedAt: now,
								flags: 'groups_backend',
							})
							.execute()
						await tx
							.insertInto('group')
							.values({
								id,
								name: clerkUser.fullName ?? '',
								createdAt: now,
								updatedAt: now,
								isDeleted: false,
								inviteSecret: null,
							})
							.execute()
						await tx
							.insertInto('group_user')
							.values({
								userId: id,
								groupId: id,
								createdAt: now,
								updatedAt: now,
								role: 'owner',
								index: 'a1' as IndexKey,
								userName: clerkUser.fullName ?? '',
								userColor: '',
							})
							.execute()
					})
				}
			}
			const rateLimited = await isRateLimited(this.env, this.userId!)
			if (rateLimited) {
				this.log.debug('rate limited')
				this.logEvent({ type: 'rate_limited', id: this.userId })
				throw new Error('Rate limited')
			}
			await this.ensureCache()
		})
		// User creation is handled by the .all() handler above; this just returns 200.
		.post('/app/:userId/init', () => new Response('ok', { status: 200 }))
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

	// --- Hibernation-aware cache management ---

	private async ensureCache(): Promise<void> {
		if (this.cache) return

		// On hibernation wake-up, userId may be lost — restore from socket metadata
		if (!this.userId) {
			for (const socket of this.ctx.getWebSockets()) {
				const meta = socket.deserializeAttachment() as SocketMetadata | null
				if (meta?.userId) {
					this.userId = meta.userId
					this.log.debug('restored userId from socket metadata', this.userId)
					break
				}
			}
		}

		if (!this.userId) {
			throw new Error('Cannot initialize cache: userId not available')
		}

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

	private assertCache(): asserts this is { cache: UserDataSyncer } {
		assert(this.cache, 'no cache')
	}

	// Per-socket chunk assemblers (not preserved across hibernation, but that's ok —
	// partially-assembled chunks from before hibernation would be stale anyway)
	private readonly assemblers = new Map<WebSocket, JsonChunkAssembler>()

	private makeCrud(
		client: PostgresPoolClient,
		signal: AbortSignal,
		changeAccumulator: ChangeAccumulator
	) {
		return mapObjectMapValues(
			schema.tables,
			(_, table) => new ServerCRUD(client, table, signal, changeAccumulator)
		) as { [K in keyof TlaSchema['tables']]: TableMutator<TlaSchema['tables'][K] & TableSchema> }
	}

	private async executeServerQuery(
		client: PostgresPoolClient,
		ast: AST
	): Promise<unknown[] | unknown> {
		const table = ast.table
		if (!(table in schema.tables)) {
			throw new Error(`Unknown table: ${table}`)
		}
		const params: unknown[] = []
		let paramIndex = 1

		const quoteIdentifier = (s: string) => '"' + s.replace(/"/g, '""') + '"'

		const processCondition = (condition: Condition): string => {
			switch (condition.type) {
				case 'and':
					return `(${condition.conditions.map(processCondition).join(' AND ')})`
				case 'or':
					return `(${condition.conditions.map(processCondition).join(' OR ')})`
				case 'simple': {
					if (condition.left.type !== 'column') {
						throw new Error(`Unsupported left operand type: ${condition.left.type}`)
					}
					if (condition.right.type !== 'literal') {
						throw new Error(`Unsupported right operand type: ${condition.right.type}`)
					}
					const field = quoteIdentifier(condition.left.name)
					if (!ALLOWED_OPS.has(condition.op)) {
						throw new Error(`Unsupported operator in server query executor: ${condition.op}`)
					}
					params.push(condition.right.value)
					return `${field} ${condition.op} $${paramIndex++}`
				}
				case 'correlatedSubquery':
					throw new Error('Correlated subquery conditions are not supported')
				default: {
					const _exhaustive: never = condition
					throw new Error(`Unknown condition type: ${(_exhaustive as any).type}`)
				}
			}
		}

		const whereClause = ast.where ? `WHERE ${processCondition(ast.where)}` : ''
		const sql = `SELECT * FROM ${quoteIdentifier(table)} ${whereClause}`
		const res = await client.query(sql, params)

		// ast.limit === 1 means .one() was called
		if (ast.limit === 1) {
			return res.rows[0]
		}
		return res.rows
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

		for (const socket of this.ctx.getWebSockets()) {
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

		// Use hibernation API — Cloudflare manages the socket lifecycle
		this.ctx.acceptWebSocket(serverWebSocket)

		// Store metadata on the socket so it survives hibernation
		const metadata: SocketMetadata = {
			protocolVersion,
			sessionId,
			userId: this.userId,
		}
		serverWebSocket.serializeAttachment(metadata)

		if (protocolVersion < MIN_Z_PROTOCOL_VERSION || this.__test__isForceDowngraded) {
			serverWebSocket.close(TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			return new Response(null, { status: 101, webSocket: clientWebSocket })
		}

		// Schedule alarm for periodic maintenance (LSN updates)
		await this.maybeScheduleAlarm()

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

	// --- Hibernation lifecycle handlers ---

	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		await this.ensureCache()

		const messageString = typeof message === 'string' ? message : new TextDecoder().decode(message)

		// Get or create assembler for this socket
		let assembler = this.assemblers.get(ws)
		if (!assembler) {
			assembler = new JsonChunkAssembler()
			this.assemblers.set(ws, assembler)
		}

		const res = assembler.handleMessage(messageString)
		if (!res) {
			// not enough chunks yet
			return
		}
		if ('error' in res) {
			this.captureException(res.error, { source: 'webSocketMessage, bad chunk' })
			return
		}

		await this.messageQueue.push(() =>
			this.handleSocketMessage(ws, res.stringified).catch((e) =>
				this.captureException(e, { source: 'webSocketMessage' })
			)
		)
	}

	override async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean) {
		// Must reciprocate the close to complete the handshake, otherwise clients get 1006 errors
		ws.close(code, reason)
		this.assemblers.delete(ws)
	}

	override async webSocketError(ws: WebSocket, error: unknown) {
		this.captureException(error, { source: 'webSocketError' })
		this.assemblers.delete(ws)
	}

	// --- Alarm-based periodic maintenance (replaces setInterval) ---

	override async alarm() {
		try {
			const sockets = this.ctx.getWebSockets()
			if (sockets.length === 0) {
				this.log.debug('no active sockets, skipping alarm')
				return
			}

			await this.ensureCache()
			this.cache?.maybeRequestLsnUpdate()

			// Schedule next alarm
			await this.maybeScheduleAlarm()
		} catch (e) {
			this.captureException(e, { source: 'alarm' })
		}
	}

	private async maybeScheduleAlarm() {
		if (this.ctx.getWebSockets().length > 0) {
			const currentAlarm = await this.ctx.storage.getAlarm()
			if (!currentAlarm) {
				await this.ctx.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS)
			}
		}
	}

	// --- Message handling ---

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

	private async _doMutate(msg: ZClientSentMessage) {
		this.log.debug('doMutate', this.userId, msg)
		assert(msg.type === 'mutator', 'Invalid message type')
		this.assertCache()
		const client = await this.pool.connect()

		try {
			const changeAccumulator: ChangeAccumulator = {
				file: { added: [] },
			}

			await client.query('BEGIN', [])

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
								return client.query(sqlString, params).then((res: any) => res.rows)
							},
							async runQuery() {
								throw new Error('runQuery not implemented')
							},
						},
						mutate,
						location: 'server',
						reason: 'authoritative',
						mutationID: 0,
						query: undefined as any, // deprecated, using run() instead
						run: async <TTable extends keyof TlaSchema['tables'] & string, TReturn>(
							query: Query<TTable, TlaSchema, TReturn>,
							_options?: RunOptions
						): Promise<HumanReadable<TReturn>> => {
							const ast = getQueryAstOrThrow(query)
							return this.executeServerQuery(client, ast) as Promise<HumanReadable<TReturn>>
						},
					},
					msg.props,
					undefined // context
				)
			} finally {
				controller.abort()
			}

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

			await client.query('COMMIT', [])

			// Check mutation status after the commit timeout has elapsed
			setTimeout(() => {
				this.cache?.checkMutationDidCommit(msg.mutationId).catch((e) => this.captureException(e))
			}, 15_000)

			await this.cache?.incorporateUnsyncedChanges(changeAccumulator)
		} catch (e) {
			await client.query('ROLLBACK', [])
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
			const cause = e instanceof ZMutationError ? e.originalCause : e.cause
			this.captureException(e, {
				errorCode: code,
				reason: cause ?? e.message ?? e.stack ?? JSON.stringify(e),
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
		for (const socket of this.ctx.getWebSockets()) {
			socket.close()
		}
	}

	async __test__prepareForTest(userId: string) {
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
			}

			await tx
				.updateTable('user')
				.set({
					flags: 'groups_backend',
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

			// Get all groups the user is a member of and delete them
			// CASCADE will automatically delete group_user, group_file, and owned files
			const userGroups = await tx
				.selectFrom('group_user')
				.where('userId', '=', userId)
				.select('groupId')
				.execute()
			const groupIds = userGroups.map((g) => g.groupId)

			if (groupIds.length > 0) {
				await tx.deleteFrom('group').where('id', 'in', groupIds).execute()
			}

			// Re-create the home group
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
		})

		await this.cache?.reboot({ delay: false, source: 'admin', hard: true })
	}

	async admin_migrateToGroups(userId: string, inviteSecret: string | null = null) {
		console.error('admin_migrateToGroups', userId, inviteSecret)
		this.userId ??= userId

		this.log.debug('migrating to groups', userId, inviteSecret)
		// Call the Postgres migration function
		const result = await sql<{
			files_migrated: number
			pinned_files_migrated: number
			flag_added: boolean
		}>`SELECT * FROM migrate_user_to_groups(${userId}, ${inviteSecret})`.execute(this.db)
		console.error('admin_migrateToGroups result', result.rows)

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
		// Close all websocket connections to force reconnect with fresh data
		for (const socket of this.ctx.getWebSockets()) {
			socket.close()
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
		for (const socket of this.ctx.getWebSockets()) {
			socket.close()
		}

		// Clear the cache/state
		if (this.cache) {
			this.cache = null
		}

		// Delete R2 data snapshot
		await this.env.USER_DO_SNAPSHOTS.delete(getUserDoSnapshotKey(this.env, userId))

		// Clear any scheduled alarms
		await this.ctx.storage.deleteAlarm()

		await this.db.destroy()
	}
}
