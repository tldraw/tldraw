/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { tldrawAppSchema } from '@tldraw/dotcom-shared'
import { RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import { assertExists, exhaustiveSwitchError } from '@tldraw/utils'
import { createPersistQueue } from '@tldraw/worker-shared'
import { IRequest, Router } from 'itty-router'
import { AlarmScheduler } from './AlarmScheduler'
import { Environment } from './types'
import { throttle } from './utils/throttle'

export type DBLoadResult =
	| {
			type: 'error'
			error?: Error | undefined
	  }
	| {
			type: 'snapshot_found'
			snapshot: RoomSnapshot
	  }

const loadSql = `
  SELECT 
    t.schema AS schema, 
    t.tombstones AS tombstones, 
    t.clock AS clock,
    null as recordId,
    null as record,
    null as lastModifiedEpoch
  FROM 
    topics t
  WHERE t.id = ?
  UNION SELECT
    null AS schema, 
    null AS tombstones, 
    null AS clock,
    r.id as recordId,
    r.record as record,
    r.lastModifiedEpoch as lastModifiedEpoch
  FROM
    records r
  WHERE
    r.topicId = ?
	`

export class TLAppDurableObject {
	// A unique identifier for this instance of the Durable Object
	id: DurableObjectId

	// For TLSyncRoom
	_room: Promise<TLSocketRoom<any>> | null = null

	getRoom() {
		if (!this._userId) {
			throw new Error('documentInfo must be present when accessing room')
		}
		if (!this._room) {
			this._room = this.loadFromDatabase().then((result) => {
				switch (result.type) {
					case 'snapshot_found': {
						this._lastPersistedClock = result.snapshot.clock
						const room = new TLSocketRoom<any>({
							initialSnapshot: result.snapshot,
							schema: tldrawAppSchema,
							onSessionRemoved: async (room, args) => {
								if (args.numSessionsRemaining > 0) return
								if (!this._room) return
								try {
									await this.persistToDatabase()
								} catch (err) {
									// already logged
								}
								// make sure nobody joined the room while we were persisting
								if (room.getNumActiveSessions() > 0) return
								this._room = null
								room.close()
							},
							onDataChange: () => {
								this.triggerPersistSchedule()
							},
						})
						return room
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

	_userId: string | null = null

	loadTopic: D1PreparedStatement
	loadRecords: D1PreparedStatement
	updateTopic: D1PreparedStatement
	updateTopicClock: D1PreparedStatement
	updateRecord: D1PreparedStatement
	deleteRecord: D1PreparedStatement
	constructor(
		private state: DurableObjectState,
		private env: Environment
	) {
		this.id = state.id
		this.storage = state.storage

		this.loadTopic = env.DB.prepare(`select schema, tombstones, clock from topics where id = ?`)
		this.loadRecords = env.DB.prepare(
			`select record, lastModifiedEpoch from records where topicId = ?`
		)
		this.updateTopic = env.DB.prepare(
			`insert into topics (id, schema, tombstones, clock) values (?, ?, ?, ?) on conflict (id) do update set schema = ?, tombstones = ?, clock = ?`
		)
		this.updateTopicClock = env.DB.prepare(`update topics set clock = ? where id = ?`)
		// TODO(david): check that you can't put records with the same id in different topics
		this.updateRecord = env.DB.prepare(
			`insert into records (id, topicId, record, lastModifiedEpoch) values (?, ?, ?, ?) on conflict (id, topicId) do update set record = ?, lastModifiedEpoch = ?`
		)
		this.deleteRecord = env.DB.prepare(`delete from records where topicId = ?`)
	}

	readonly router = Router()
		.get(
			`/app/:userId`,
			(req) => this.extractUserId(req),
			(req) => this.onRequest(req)
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
	get userId() {
		return assertExists(this._userId, 'userId must be present')
	}
	async extractUserId(req: IRequest) {
		if (!this._userId) {
			this._userId = assertExists(req.params.userId, 'userId must be present')
		}
	}

	// Handle a request to the Durable Object.
	async fetch(req: IRequest) {
		try {
			return await this.router.fetch(req)
		} catch (err) {
			console.error(err)
			// eslint-disable-next-line deprecation/deprecation
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}

	async onRequest(req: IRequest) {
		// extract query params from request, should include instanceId
		const url = new URL(req.url)
		const params = Object.fromEntries(url.searchParams.entries())
		let { sessionId } = params

		// handle legacy param names
		sessionId ??= params.sessionKey ?? params.instanceId

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()

		const room = await this.getRoom()

		// all good
		room.handleSocketConnect({
			sessionId: sessionId,
			socket: serverWebSocket,
		})
		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}

	triggerPersistSchedule = throttle(() => {
		this.persistToDatabase()
	}, 2000)

	// Load the room's drawing data. First we check the R2 bucket, then we fallback to supabase (legacy).
	async loadFromDatabase(): Promise<DBLoadResult> {
		try {
			const { results } = await this.env.DB.prepare(loadSql).bind(this.userId, this.userId).all()
			const snapshot: RoomSnapshot = {
				clock: 0,
				documents: [],
				schema: tldrawAppSchema.serialize(),
				tombstones: {},
			}
			for (const row of results) {
				if (row.schema) {
					snapshot.schema = JSON.parse(row.schema as string)
					snapshot.tombstones = JSON.parse(row.tombstones as string)
					snapshot.clock = row.clock as number
				} else {
					snapshot.documents.push({
						state: JSON.parse(row.record as string),
						lastChangedClock: row.lastModifiedEpoch as number,
					})
				}
			}
			// when loading, prefer to fetch documents from the bucket
			return { type: 'snapshot_found', snapshot }
		} catch (error) {
			console.error('failed to fetch doc', error)
			return { type: 'error', error: error as Error }
		}
	}

	_lastPersistedClock: number | null = null
	_persistQueue = createPersistQueue(async () => {
		// check whether the worker was woken up to persist after having gone to sleep
		if (!this._room) return
		const room = await this.getRoom()
		const clock = room.getCurrentDocumentClock()
		if (this._lastPersistedClock === clock) return
		const snapshot = room.getCurrentSnapshot()

		let deletedIds = [] as string[]
		let updatedRecords = [] as { state: any; lastChangedClock: number }[]
		if (typeof this._lastPersistedClock === 'number') {
			deletedIds = Object.entries(snapshot.tombstones ?? {})
				.filter(([_id, clock]) => clock > this._lastPersistedClock!)
				.map(([id]) => id)

			updatedRecords = snapshot.documents.filter(
				(doc) => doc.lastChangedClock > this._lastPersistedClock!
			)
		}

		await this.env.DB.batch([
			this.updateTopic.bind(
				this.userId,
				JSON.stringify(snapshot.schema),
				JSON.stringify(snapshot.tombstones),
				snapshot.clock,
				JSON.stringify(snapshot.schema),
				JSON.stringify(snapshot.tombstones),
				snapshot.clock
			),
			...deletedIds.map((id) => this.deleteRecord.bind(id)),
			...updatedRecords.map((doc) =>
				this.updateRecord.bind(
					doc.state.id,
					this.userId,
					JSON.stringify(doc.state),
					doc.lastChangedClock,
					JSON.stringify(doc.state),
					doc.lastChangedClock
				)
			),
		])

		this._lastPersistedClock = clock
		// use a shorter timeout for this 'inner' loop than the 'outer' alarm-scheduled loop
		// just in case there's any possibility of setting up a neverending queue
	}, 1000)

	// Save the room to supabase
	async persistToDatabase() {
		try {
			await this._persistQueue()
		} catch (e) {
			console.error('failed to persist', e)
		}
	}
}
