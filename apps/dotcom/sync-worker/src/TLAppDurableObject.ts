/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import {
	ROOM_PREFIX,
	TldrawAppFile,
	TldrawAppFileId,
	TldrawAppFileRecordType,
	tldrawAppSchema,
	TldrawAppUserId,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import { exhaustiveSwitchError, uniqueId } from '@tldraw/utils'
import { ExecutionQueue } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { getR2KeyForRoom } from './r2'
import { Environment } from './types'
import { throttle } from './utils/throttle'
import { getCurrentSerializedRoomSnapshot } from './utils/tla/getRoomCurrentSnapshot'
import { getTldrawAppFileRecord } from './utils/tla/getTldrawAppFileRecord'

const PERSIST_INTERVAL = 1000

export const APP_ID = 'tldraw'

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
	private _room: Promise<TLSocketRoom<any>> | null = null

	// For storage
	private storage: DurableObjectStorage
	private loadTopic: D1PreparedStatement
	private loadRecords: D1PreparedStatement
	private updateTopic: D1PreparedStatement
	private updateTopicClock: D1PreparedStatement
	private updateRecord: D1PreparedStatement
	private deleteRecord: D1PreparedStatement

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
		this.deleteRecord = env.DB.prepare(`delete from records where id = ?`)
	}

	readonly router = Router()
		.get(`/app/:userId`, (req) => this.onRequest(req))
		.all('*', () => new Response('Not found', { status: 404 }))

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

	// Get (or create) the TLSyncRoom instance
	private getRoom() {
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
								} catch {
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

	// Load the room's drawing data from D1
	private async loadFromDatabase(): Promise<DBLoadResult> {
		try {
			const [
				{
					results: [topic],
				},
				{ results: records },
			] = await this.env.DB.batch([this.loadTopic.bind(APP_ID), this.loadRecords.bind(APP_ID)])
			const snapshot: RoomSnapshot = {
				clock: (topic as any)?.clock ?? 0,
				documents: records.map(({ record, lastModifiedEpoch }: any) => ({
					state: JSON.parse(record),
					lastChangedClock: lastModifiedEpoch,
				})),
				schema: JSON.parse((topic as any)?.schema ?? null) ?? tldrawAppSchema.serialize(),
				tombstones: JSON.parse((topic as any)?.tombstones ?? null) ?? {},
			}
			{
				// little fixup for a legacy bug were we were not loading the clock correctly
				let maxClock = snapshot.documents.reduce(
					(max, { lastChangedClock }) => Math.max(max, lastChangedClock),
					0
				)
				maxClock = Math.max(maxClock, ...Object.values(snapshot.tombstones ?? {}))
				snapshot.clock = Math.max(snapshot.clock, maxClock)
			}
			// when loading, prefer to fetch documents from the bucket
			return { type: 'snapshot_found', snapshot }
		} catch (error) {
			console.error('failed to fetch doc', error)
			return { type: 'error', error: error as Error }
		}
	}

	private _lastPersistedClock: number | null = null
	private executionQueue = new ExecutionQueue()

	private async persistToDatabase() {
		try {
			await this.executionQueue.push(async () => {
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
						APP_ID,
						JSON.stringify(snapshot.schema),
						JSON.stringify(snapshot.tombstones),
						snapshot.clock
					),
					...deletedIds.map((id) => this.deleteRecord.bind(id)),
					...updatedRecords.map((doc) =>
						this.updateRecord.bind(
							doc.state.id,
							APP_ID,
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
						docDurableObject.appFileRecordDidUpdate(file)
					}
				}

				for (const deletedId of deletedIds) {
					if (TldrawAppFileRecordType.isId(deletedId)) {
						const slug = TldrawAppFileRecordType.parseId(deletedId)
						const docDurableObject = this.env.TLDR_DOC.get(
							this.env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${slug}`)
						)
						// no need to await, fire and forget
						docDurableObject.appFileRecordDidDelete(slug)
					}
				}

				this._lastPersistedClock = clock
			})
		} catch (e) {
			console.error('failed to persist', e)
		}
	}

	/**
	 * Create a new file or update in the app durable object.
	 *
	 * @param file - The file to create or update
	 */
	private async createNewFile(file: TldrawAppFile) {
		const room = await this.getRoom()
		return await room.updateStore((store) => {
			store.put(file)
		})
	}

	/* ------------------ Public stuff ------------------ */

	/**
	 * Get the current serialized snapshot of the room.
	 *
	 * @returns The current serialized snapshot of the room
	 */
	async getCurrentSerializedSnapshot() {
		const room = await this.getRoom()
		return room.getCurrentSerializedSnapshot()
	}

	/**
	 * Get whether a file is shared and what type of share it is.
	 *
	 * @param fileId - The file ID to check
	 */
	async getFileShareType(fileId: TldrawAppFileId): Promise<'private' | 'view' | 'edit'> {
		const room = await this.getRoom()
		const file = room.getRecord(fileId) as TldrawAppFile | undefined
		if (!file?.shared) return 'private'
		return file.sharedLinkType
	}

	/**
	 * Create a new file for a given user.
	 *
	 * @param snapshot - The snapshot of the room to create
	 * @param userId - The user ID of the user creating the file
	 *
	 * @returns The new file's slug
	 */
	async createFile(snapshot: RoomSnapshot, userId: TldrawAppUserId) {
		const serializedSnapshot = JSON.stringify(snapshot)

		// Create a new slug for the room
		const newSlug = uniqueId()

		// Bang the snapshot into the database
		await this.env.ROOMS.put(getR2KeyForRoom({ slug: newSlug, isApp: true }), serializedSnapshot)

		// Now create a new file in the app durable object belonging to the user
		await this.createNewFile(
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId(newSlug),
				ownerId: userId,
			})
		)

		return { slug: newSlug }
	}

	/**
	 * Duplicate a file for a given user.
	 *
	 * @params slug - The slug of the file to duplicate
	 * @params userId - The user ID of the user duplicating the file, who will be the new owner of the file
	 *
	 * @returns The new file's slug
	 */
	async duplicateFile(slug: string, userId: TldrawAppUserId) {
		const file = await getTldrawAppFileRecord(slug, this.env)

		if (!file) {
			throw Error('not-found')
		}

		// A user can duplicate other users' files only if they are shared
		if (file.ownerId !== userId) {
			if (!file.shared) {
				throw Error('forbidden')
			}
		}

		// Get the current serialized snapshot of the room (by waking up the worker,
		// if we have to). Why not grab from the database directly? Because the worker
		// only persists every ~30s while users are actively editing the room. If we
		// knew whether the room was active or not (either by checking whether the
		// worker was awake or somehow recording which rooms have active users in them,
		// or when the room was last edited) we could make a better decision.
		const serializedSnapshot = await getCurrentSerializedRoomSnapshot(slug, this.env)

		// Create a new slug for the duplicated room
		const newSlug = uniqueId()

		// Bang the snapshot into the database
		await this.env.ROOMS.put(getR2KeyForRoom({ slug: newSlug, isApp: true }), serializedSnapshot)

		// Now create a new file in the app durable object belonging to the user
		await this.createNewFile(
			TldrawAppFileRecordType.create({
				id: TldrawAppFileRecordType.createId(newSlug),
				ownerId: userId,
			})
		)

		return { slug: newSlug }
	}

	/**
	 * Publish a file. The file must be owned by the user.
	 *
	 * @param slug - The slug of the file to publish
	 * @param userId - The user ID of the user publishing the file
	 *
	 * @returns The published slug
	 */
	async publishFile(slug: string, userId: TldrawAppUserId) {
		const file = await getTldrawAppFileRecord(slug, this.env)

		if (!file) {
			throw Error('not-found')
		}

		// A user can only publish their own files
		if (file.ownerId !== userId) {
			throw Error('forbidden')
		}

		// Get the current snapshot of the room (by waking up the worker, if we have to)
		const serializedSnapshot = await getCurrentSerializedRoomSnapshot(slug, this.env)

		// Create a new slug for the published room
		await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(file.publishedSlug, slug)

		// Bang the snapshot into the database
		await this.env.ROOM_SNAPSHOTS.put(
			getR2KeyForRoom({ slug: `${slug}/${file.publishedSlug}`, isApp: true }),
			serializedSnapshot
		)

		// todo: save the snapshot somewhere else? ie to view history of saved snapshots

		return { slug: file.publishedSlug }
	}

	/**
	 * Unpublish a file. The room must be owned by the user.
	 *
	 * @param slug - The slug of the room to unpublish
	 * @param userId - The user ID of the user unpublishing the room
	 *
	 */
	async unpublishFile(slug: string, userId: TldrawAppUserId) {
		const file = await getTldrawAppFileRecord(slug, this.env)

		if (!file) {
			throw Error('not-found')
		}

		// A user can only publish their own files
		if (file.ownerId !== userId) {
			throw Error('forbidden')
		}

		// Create a new slug for the published room
		await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(file.publishedSlug)

		// Bang the snapshot into the database
		await this.env.ROOM_SNAPSHOTS.delete(
			getR2KeyForRoom({ slug: `${slug}/${file.publishedSlug}`, isApp: true })
		)
	}

	/**
	 * Get a published file by its slug.
	 *
	 * @param publishedSlug - The slug of the published file
	 */
	async getPublishedFile(publishedSlug: string) {
		const slug = await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(publishedSlug)
		if (!slug) throw Error('not found')

		const publishedRoomSnapshot = await this.env.ROOM_SNAPSHOTS.get(
			getR2KeyForRoom({ slug: `${slug}/${publishedSlug}`, isApp: true })
		).then((r) => r?.json())
		if (!publishedRoomSnapshot) throw Error('not found')

		return publishedRoomSnapshot
	}
}
