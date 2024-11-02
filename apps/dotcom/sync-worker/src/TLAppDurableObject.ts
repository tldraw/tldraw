/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import {
	ROOM_PREFIX,
	TldrawAppFile,
	TldrawAppFileId,
	TldrawAppFileRecordType,
	TldrawAppRecord,
	tldrawAppSchema,
	TldrawAppUserId,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import { exhaustiveSwitchError } from '@tldraw/utils'
import { ExecutionQueue } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import { Environment } from './types'
import { throttle } from './utils/throttle'

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
			try {
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
			} catch (e: any) {
				console.log(e.message)
				throw Error('failed to load room')
			}
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

	/* ------------------ Public stuff ------------------ */

	/**
	 * Create a new file or update in the app durable object.
	 *
	 * @param file - The file to create or update
	 */
	async createNewFile(file: TldrawAppFile) {
		const room = await this.getRoom()
		return await room.updateStore((store) => {
			store.put(file)
		})
	}

	/**
	 * Delete a file and all associated states.
	 *
	 * @param file - The file to create or update
	 */
	async deleteFileAndStates(file: TldrawAppFile) {
		const room = await this.getRoom()
		return await room.updateStore((store) => {
			store.delete(file)
			store
				.getAll()
				.filter((s: TldrawAppRecord) => s.typeName === 'file-state' && s.fileId === file.id)
				.forEach((file) => store.delete(file))
		})
	}

	/**
	 * Delete a user's associated file states for a room.
	 *
	 * @param file - The file to create or update
	 * @param userId - The user ID of the user deleting the file
	 */
	async forgetFile(file: TldrawAppFile, userId: TldrawAppUserId) {
		const room = await this.getRoom()
		return await room.updateStore((store) => {
			store
				.getAll()
				.filter(
					(s: TldrawAppRecord) =>
						s.typeName === 'file-state' && s.fileId === file.id && s.ownerId === userId
				)
				.forEach((file) => store.delete(file))
		})
	}

	/**
	 * Get the current serialized snapshot of the room.
	 *
	 * @returns The current serialized snapshot of the room
	 * @internal
	 */
	async getCurrentSerializedSnapshot() {
		const room = await this.getRoom()
		return room.getCurrentSerializedSnapshot()
	}

	/**
	 * Get a file by its id.
	 *
	 * @param fileId - The id of the file to get.
	 * @returns The file with the given ID, or undefined if it doesn't exist
	 */
	async getFile(fileId: TldrawAppFileId) {
		const room = await this.getRoom()
		const file = room.getRecord(fileId)
		return file as TldrawAppFile | undefined
	}

	/**
	 * Get a file by its slug.
	 *
	 * @param slug - The slug of the file to get.
	 * @returns The file with the given slug, or undefined if it doesn't exist
	 */
	async getFileBySlug(slug: string) {
		return this.getFile(TldrawAppFileRecordType.createId(slug))
	}

	/**
	 * Get whether a file is shared and what type of share it is.
	 *
	 * @param fileId - The file ID to check
	 */
	async getFileShareType(fileId: TldrawAppFileId): Promise<'private' | 'view' | 'edit'> {
		const file = await this.getFile(fileId)
		if (!file?.shared) return 'private'
		return file.sharedLinkType
	}
}
