/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import {
	ROOM_PREFIX,
	TldrawAppFile,
	TldrawAppFileId,
	TldrawAppFileRecordType,
	tldrawAppSchema,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import { assertExists, exhaustiveSwitchError } from '@tldraw/utils'
import { createPersistQueue } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { AlarmScheduler } from './AlarmScheduler'
import { Environment } from './types'
import { throttle } from './utils/throttle'

const PERSIST_INTERVAL = 1000

export type DBLoadResult =
	| {
			type: 'error'
			error?: Error | undefined
	  }
	| {
			type: 'snapshot_found'
			snapshot: RoomSnapshot
	  }

export class TLAppDurableObject extends DurableObject {
	// A unique identifier for this instance of the Durable Object
	id: DurableObjectId

	// For TLSyncRoom
	_room: Promise<TLSocketRoom<any>> | null = null

	getRoom() {
		if (!this._userId) {
			throw new Error('userId must be present when accessing room')
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
		override env: Environment
	) {
		super(state, env)
		this.id = state.id
		this.storage = state.storage

		this.loadTopic = env.DB.prepare(`select schema, tombstones, clock from topics where id = ?`)
		this.loadRecords = env.DB.prepare(
			`select record, lastModifiedEpoch from records where topicId = ?`
		)
		this.updateTopic = env.DB.prepare(
			`insert into topics (id, schema, tombstones, clock) values (?1, ?2, ?3, ?4) on conflict (id) do update set schema = ?2, tombstones = ?3, clock = ?4`
		)
		this.updateTopicClock = env.DB.prepare(`update topics set clock = ? where id = ?`)
		// TODO(david): check that you can't put records with the same id in different topics
		this.updateRecord = env.DB.prepare(
			`insert into records (id, topicId, record, lastModifiedEpoch) values (?1, ?2, ?3, ?4) on conflict (id, topicId) do update set record = ?3, lastModifiedEpoch = ?4`
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
	override async fetch(req: IRequest) {
		try {
			return await this.router.fetch(req)
		} catch (err) {
			console.error(err)
			return new Response('Something went wrong', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		}
	}

	async onRequest(req: IRequest) {
		// extract query params from request, should include instanceId
		const url = new URL(req.url)
		const sessionId = url.searchParams.get('sessionId')
		if (typeof sessionId !== 'string') {
			throw new Error('sessionId must be present')
		}

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
	}, PERSIST_INTERVAL)

	// Load the room's drawing data from D1
	async loadFromDatabase(): Promise<DBLoadResult> {
		try {
			const [
				{
					results: [topic],
				},
				{ results: records },
			] = await this.env.DB.batch([
				this.loadTopic.bind(this.userId),
				this.loadRecords.bind(this.userId),
			])
			const snapshot: RoomSnapshot = {
				clock: 0,
				documents: records.map(({ record, lastModifiedEpoch }: any) => ({
					state: JSON.parse(record),
					lastChangedClock: lastModifiedEpoch,
				})),
				schema: JSON.parse((topic as any)?.schema ?? null) ?? tldrawAppSchema.serialize(),
				tombstones: JSON.parse((topic as any)?.tombstones ?? null) ?? {},
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
				snapshot.clock
			),
			...deletedIds.map((id) => this.deleteRecord.bind(id)),
			...updatedRecords.map((doc) =>
				this.updateRecord.bind(
					doc.state.id,
					this.userId,
					JSON.stringify(doc.state),
					doc.lastChangedClock
				)
			),
		]).catch(async (e) => {
			console.error(
				'bad ids',
				updatedRecords.map((doc) => doc.state.id)
			)
			// if we failed to persist, we should restart the room and force people to reconnect
			const room = await this.getRoom()
			room.close()
			this._room = null
			throw e
		})

		for (const updatedRecord of updatedRecords) {
			if (TldrawAppFileRecordType.isInstance(updatedRecord.state)) {
				const file = updatedRecord.state
				const slug = TldrawAppFileRecordType.parseId(file.id)
				const docDurableObject = this.env.TLDR_DOC.get(
					this.env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${slug}`)
				)
				// no need to await, fire and forget
				docDurableObject.appFileRecordDidUpdate(file, this.userId)
			}
		}

		this._lastPersistedClock = clock
		// use a shorter timeout for this 'inner' loop than the 'outer' alarm-scheduled loop
		// just in case there's any possibility of setting up a neverending queue
	}, PERSIST_INTERVAL / 2)

	async persistToDatabase() {
		try {
			await this._persistQueue()
		} catch (e) {
			console.error('failed to persist', e)
		}
	}

	async getFileShareType(
		fileId: TldrawAppFileId,
		userId: string
	): Promise<'private' | 'view' | 'edit'> {
		if (!this._userId) {
			this._userId = userId
		} else if (userId !== this._userId) {
			throw new Error('userId mismatch')
		}
		const room = await this.getRoom()
		const file = room.getRecord(fileId) as TldrawAppFile | undefined
		if (!file?.shared) return 'private'
		return file.sharedLinkType
	}
}
