/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { TLRecord } from '@tldraw/tlschema'
import { RoomSnapshot, TLCloseEventCode, TLSocketRoom } from '@tldraw/tlsync'
import { assert, assertExists, exhaustiveSwitchError } from '@tldraw/utils'
import { IRequest, Router } from 'itty-router'
import Toucan from 'toucan-js'
import { PERSIST_INTERVAL_MS } from './config'
import { getR2KeyForRoom } from './r2'
import { Analytics, Environment } from './types'
import { throttle } from './utils/throttle'

type DBLoadResult =
	| {
			type: 'error'
			error?: Error | undefined
	  }
	| {
			type: 'room_found'
			snapshot: RoomSnapshot
	  }
	| {
			type: 'room_not_found'
	  }

const MAX_CONNECTIONS = 50

// increment this any time you make a change to this type
const CURRENT_DOCUMENT_INFO_VERSION = 0
interface DocumentInfo {
	version: number
	slug: string
}

const ROOM_NOT_FOUND = Symbol('room_not_found')

export class BemoDO {
	// A unique identifier for this instance of the Durable Object
	id: DurableObjectId

	// For TLSyncRoom
	_room: Promise<TLSocketRoom<TLRecord>> | null = null

	getRoom() {
		if (!this._documentInfo) {
			throw new Error('documentInfo must be present when accessing room')
		}
		const slug = this._documentInfo.slug
		if (!this._room) {
			this._room = this.loadFromDatabase(slug).then((result) => {
				switch (result.type) {
					case 'room_found': {
						const room = new TLSocketRoom<TLRecord>({
							initialSnapshot: result.snapshot,
							onSessionRemoved: async (room, args) => {
								if (args.numSessionsRemaining > 0) return
								if (!this._room) return
								try {
									await this.persistToDatabase()
								} catch (err) {
									// already logged
								}
								this._room = null
								room.close()
							},
							onDataChange: () => {
								// when we send a message, we make sure to persist the room
								this.triggerPersistSchedule()
							},
						})
						return room
					}
					case 'room_not_found': {
						throw ROOM_NOT_FOUND
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

	// For analytics
	measure: Analytics | undefined

	// For error tracking
	sentryDSN: string | undefined

	readonly r2: R2Bucket

	_documentInfo: DocumentInfo | null = null

	constructor(
		private state: DurableObjectState,
		private env: Environment
	) {
		this.id = state.id
		this.storage = state.storage
		this.sentryDSN = env.SENTRY_DSN
		this.measure = env.MEASURE

		this.r2 = env.DATA

		state.blockConcurrencyWhile(async () => {
			const existingDocumentInfo = (await this.storage.get('documentInfo')) as DocumentInfo | null
			if (existingDocumentInfo?.version !== CURRENT_DOCUMENT_INFO_VERSION) {
				this._documentInfo = null
			} else {
				this._documentInfo = existingDocumentInfo
			}
		})
	}

	readonly router = Router()
		.get(
			`/connect/:roomId`,
			(req) => this.extractDocumentInfoFromRequest(req),
			(req) => this.onRequest(req)
		)
		.all('*', () => new Response('Not found', { status: 404 }))

	// eslint-disable-next-line no-restricted-syntax
	get documentInfo() {
		return assertExists(this._documentInfo, 'documentInfo must be present')
	}
	extractDocumentInfoFromRequest = async (req: IRequest) => {
		const slug = assertExists(req.params.roomId, 'roomId must be present')
		if (this._documentInfo) {
			assert(this._documentInfo.slug === slug, 'slug must match')
		} else {
			this._documentInfo = {
				version: CURRENT_DOCUMENT_INFO_VERSION,
				slug,
			}
		}
	}

	// Handle a request to the Durable Object.
	async fetch(req: IRequest) {
		const sentry = new Toucan({
			dsn: this.sentryDSN,
			request: req,
			allowedHeaders: ['user-agent'],
			allowedSearchParams: /(.*)/,
		})

		try {
			return await this.router.handle(req).catch((err) => {
				console.error(err)
				sentry.captureException(err)

				return new Response('Something went wrong', {
					status: 500,
					statusText: 'Internal Server Error',
				})
			})
		} catch (err) {
			sentry.captureException(err)
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
		const { sessionKey } = params

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()

		try {
			const room = await this.getRoom()
			// Don't connect if we're already at max connections
			if (room.getNumActiveSessions() >= MAX_CONNECTIONS) {
				// TODO: this is not handled on the client, it just gets stuck in a loading state.
				// With hibernatable sockets it should be fine to send a .close() event here.
				// but we should really handle unknown errors better on the client.
				return new Response('Room is full', {
					status: 403,
				})
			}

			// all good
			room.handleSocketConnect(sessionKey, serverWebSocket)
			return new Response(null, { status: 101, webSocket: clientWebSocket })
		} catch (e) {
			if (e === ROOM_NOT_FOUND) {
				serverWebSocket.close(TLCloseEventCode.NOT_FOUND, 'Room not found')
				return new Response(null, { status: 101, webSocket: clientWebSocket })
			}
			throw e
		}
	}

	triggerPersistSchedule = throttle(() => {
		this.schedulePersist()
	}, 2000)

	// Load the room's drawing data. First we check the R2 bucket, then we fallback to supabase (legacy).
	async loadFromDatabase(persistenceKey: string): Promise<DBLoadResult> {
		try {
			const key = getR2KeyForRoom(persistenceKey)
			// when loading, prefer to fetch documents from the bucket
			const roomFromBucket = await this.r2.get(key)
			if (roomFromBucket) {
				return { type: 'room_found', snapshot: await roomFromBucket.json() }
			}
			return { type: 'room_not_found' }
		} catch (error) {
			console.error('failed to fetch doc', persistenceKey, error)
			return { type: 'error', error: error as Error }
		}
	}

	_persistQueue: Promise<void> | null = null
	_persistAgain = false
	_lastPersistedClock: number | null = null

	// Save the room to supabase
	async persistToDatabase() {
		if (this._persistQueue) {
			this._persistAgain = true
			await this._persistQueue
			return
		}

		const slug = this.documentInfo.slug

		try {
			this._persistQueue = Promise.resolve(
				(async () => {
					this._persistAgain = true
					while (this._persistAgain) {
						this._persistAgain = false
						const room = await this.getRoom()
						const clock = room.getCurrentClock()
						if (this._lastPersistedClock === clock) return

						const snapshot = JSON.stringify(room.getCurrentSnapshot())

						const key = getR2KeyForRoom(slug)
						await Promise.all([this.r2.put(key, snapshot)])
						this._lastPersistedClock = clock
					}
				})()
			)
			await this._persistQueue
		} catch (error) {
			console.error('failed to persist document', slug, error)
			throw error
		} finally {
			this._persistQueue = null
		}
	}

	async schedulePersist() {
		const existing = await this.storage.getAlarm()
		if (!existing) {
			this.storage.setAlarm(PERSIST_INTERVAL_MS)
		}
	}

	// Will be called automatically when the alarm ticks.
	async alarm() {
		this.persistToDatabase()
	}
}
