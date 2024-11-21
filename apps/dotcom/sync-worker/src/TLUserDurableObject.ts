import {
	isColumnMutable,
	ROOM_PREFIX,
	TlaFile,
	TlaFileState,
	TlaUser,
	ZClientSentMessage,
	ZErrorCode,
	ZRowUpdate,
	ZServerSentMessage,
} from '@tldraw/dotcom-shared'
import { assert } from '@tldraw/utils'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { IRequest, Router } from 'itty-router'
import postgres from 'postgres'
import type { EventHint } from 'toucan-js/node_modules/@sentry/types'
import { getPostgres } from './getPostgres'
import { getR2KeyForRoom } from './r2'
import { type TLPostgresReplicator } from './TLPostgresReplicator'
import { Environment } from './types'
import { UserDataSyncer, ZReplicationEvent } from './UserDataSyncer'
import { getReplicator } from './utils/durableObjects'
import { isRateLimited } from './utils/rateLimit'
import { getCurrentSerializedRoomSnapshot } from './utils/tla/getCurrentSerializedRoomSnapshot'

export class TLUserDurableObject extends DurableObject<Environment> {
	private readonly db: ReturnType<typeof postgres>
	private readonly replicator: TLPostgresReplicator

	private readonly sentry
	private captureException(exception: unknown, eventHint?: EventHint) {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.sentry?.captureException(exception, eventHint) as any
		if (!this.sentry) {
			console.error(`[TLUserDurableObject]: `, exception)
		}
	}

	cache: UserDataSyncer | null = null

	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)

		this.sentry = createSentry(ctx, env)
		this.replicator = getReplicator(env)

		this.db = getPostgres(env)
		this.debug('created')
	}

	private userId: string | null = null

	readonly router = Router()
		.all('/app/:userId/*', async (req) => {
			if (!this.userId) {
				this.userId = req.params.userId
			}
			const rateLimited = await isRateLimited(this.env, this.userId!)
			if (rateLimited) {
				throw new Error('Rate limited')
			}
			if (this.cache === null) {
				await this.init()
			} else {
				await this.cache.waitUntilConnected()
			}
		})
		.get(`/app/:userId/connect`, (req) => this.onRequest(req))

	private async init() {
		assert(this.userId, 'User ID not set')
		this.debug('init')
		this.cache = new UserDataSyncer(this.ctx, this.env, this.userId, (message) =>
			this.broadcast(message)
		)
		this.debug('cache', !!this.cache)
		await this.cache.waitUntilConnected()
	}

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

	private readonly sockets = new Set<WebSocket>()

	broadcast(message: ZServerSentMessage) {
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

	async onRequest(req: IRequest) {
		assert(this.userId, 'User ID not set')
		// handle legacy param names

		const url = new URL(req.url)
		const params = Object.fromEntries(url.searchParams.entries())
		const { sessionId } = params

		assert(sessionId, 'Session ID is required')

		this.assertCache()

		// Create the websocket pair for the client
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
		serverWebSocket.accept()
		serverWebSocket.addEventListener('message', (e) => this.handleSocketMessage(e.data.toString()))
		serverWebSocket.addEventListener('close', () => {
			this.sockets.delete(serverWebSocket)
		})
		serverWebSocket.addEventListener('error', (e) => {
			this.captureException(e)
			this.sockets.delete(serverWebSocket)
		})
		const initialData = this.cache.store.getCommittedData()
		assert(initialData, 'Initial data not fetched')

		serverWebSocket.send(
			JSON.stringify({
				type: 'initial_data',
				initialData,
			} satisfies ZServerSentMessage)
		)

		this.sockets.add(serverWebSocket)

		return new Response(null, { status: 101, webSocket: clientWebSocket })
	}

	private debug(...args: any[]) {
		// uncomment for dev time debugging
		// console.log('[TLUserDurableObject]: ', ...args)
		if (this.sentry) {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			this.sentry.addBreadcrumb({
				message: `[TLUserDurableObject]: ${args.join(' ')}`,
			})
		}
	}

	private async handleSocketMessage(message: string) {
		const rateLimited = await isRateLimited(this.env, this.userId!)
		this.assertCache()
		await this.cache.waitUntilConnected()

		const msg = JSON.parse(message) as any as ZClientSentMessage
		switch (msg.type) {
			case 'mutate':
				if (rateLimited) {
					await this.rejectMutation(msg.mutationId, ZErrorCode.rate_limit_exceeded)
				} else {
					await this.handleMutate(msg)
				}
				break
			default:
				this.captureException(new Error('Unhandled message'), { data: { message } })
		}
	}

	private async rejectMutation(mutationId: string, errorCode: ZErrorCode) {
		this.assertCache()
		await this.cache.waitUntilConnected()
		this.cache.store.rejectMutation(mutationId)
		this.broadcast({
			type: 'reject',
			mutationId,
			errorCode,
		} satisfies ZServerSentMessage)
	}

	private async assertValidMutation(update: ZRowUpdate) {
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
						'Cannot update user record that is not our own'
					)
				// todo: prevent user from updating their email?
				return
			}
			case 'file': {
				const nextFile = update.row as TlaFile
				const prevFile = s.files.find((f) => f.id === (update.row as any).id)
				if (!prevFile) {
					const isOwner = nextFile.ownerId === this.userId
					if (isOwner) return
					throw new ZMutationError(
						ZErrorCode.forbidden,
						`Cannot create a file for another user ${nextFile.id}`
					)
				}
				if (prevFile.ownerId === this.userId) return
				if (prevFile.shared && prevFile.sharedLinkType === 'edit') return
				throw new ZMutationError(
					ZErrorCode.forbidden,
					'Cannot update file that is not our own and not shared in edit mode' +
						` user id ${this.userId} ownerId ${prevFile.ownerId}`
				)
			}
			case 'file_state': {
				const nextFileState = update.row as TlaFileState
				let file = s.files.find((f) => f.id === nextFileState.fileId)
				if (!file) {
					// The user might not have access to this file yet, because they just followed a link
					// let's allow them to create a file state for it if it exists and is shared.
					file = (await this.replicator.getFileRecord(nextFileState.fileId)) ?? undefined
				}
				if (!file) {
					throw new ZMutationError(ZErrorCode.bad_request, `File not found ${nextFileState.fileId}`)
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

	private async handleMutate(msg: ZClientSentMessage) {
		this.assertCache()
		try {
			;(await this.db.begin(async (sql) => {
				for (const update of msg.updates) {
					await this.assertValidMutation(update)
					switch (update.event) {
						case 'insert': {
							if (update.table === 'file_state') {
								const { fileId: _fileId, userId: _userId, ...rest } = update.row as any
								if (Object.keys(rest).length === 0) {
									await sql`insert into ${sql('public.' + update.table)} ${sql(update.row)} ON CONFLICT ("fileId", "userId") DO NOTHING`
								} else {
									await sql`insert into ${sql('public.' + update.table)} ${sql(update.row)} ON CONFLICT ("fileId", "userId") DO UPDATE SET ${sql(rest)}`
								}
								break
							} else {
								const { id: _id, ...rest } = update.row as any
								await sql`insert into ${sql('public.' + update.table)} ${sql(update.row)} ON CONFLICT ("id") DO UPDATE SET ${sql(rest)}`
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
								await sql`update public.file_state set ${sql(updates)} where "fileId" = ${fileId} and "userId" = ${userId}`
							} else {
								const { id, ...rest } = update.row as any

								await sql`update ${sql('public.' + update.table)} set ${sql(updates)} where id = ${id}`
								if (update.table === 'file') {
									const currentFile = this.cache.store.getFullData()?.files.find((f) => f.id === id)
									if (currentFile && currentFile.published !== rest.published) {
										if (rest.published) {
											await this.publishSnapshot(currentFile)
										} else {
											await this.unpublishSnapshot(currentFile)
										}
									} else if (
										currentFile &&
										currentFile.published &&
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
								await sql`delete from public.file_state where "fileId" = ${fileId} and "userId" = ${userId}`
							} else {
								const { id } = update.row as any
								await sql`delete from ${sql('public.' + update.table)} where id = ${id}`
							}
							if (update.table === 'file') {
								const { id } = update.row as TlaFile
								await this.deleteFileStuff(id)
							}
							break
					}
					this.cache.store.updateOptimisticData([update], msg.mutationId)
				}
			})) as any

			// TODO: We should probably handle a case where the above operation succeeds but the one below fails
			const result = await this
				.db`insert into public.user_mutation_number ("userId", "mutationNumber") values (${this.userId}, 1) on conflict ("userId") do update set "mutationNumber" = user_mutation_number."mutationNumber" + 1 returning "mutationNumber"`
			const mutationNumber = Number(result[0].mutationNumber)
			const currentMutationNumber = this.cache.mutations.at(-1)?.mutationNumber ?? 0
			assert(
				mutationNumber > currentMutationNumber,
				`mutation number did not increment mutationNumber: ${mutationNumber} current: ${currentMutationNumber}`
			)
			this.cache.mutations.push({ mutationNumber, mutationId: msg.mutationId })
		} catch (e) {
			const code = e instanceof ZMutationError ? e.errorCode : ZErrorCode.unknown_error
			this.captureException(e, {
				data: { errorCode: code, reason: 'mutation failed' },
			})
			await this.rejectMutation(msg.mutationId, code)
		}
	}

	/* ------- RPCs -------  */

	async handleReplicationEvent(event: ZReplicationEvent) {
		this.debug('replication event', event, !!this.cache)
		if (!this.cache) {
			return 'unregister'
		}

		this.cache.handleReplicationEvent(event)

		return 'ok'
	}

	/* --------------  */

	private async deleteFileStuff(id: string) {
		const fileRecord = await this.replicator.getFileRecord(id)
		const room = this.env.TLDR_DOC.get(this.env.TLDR_DOC.idFromName(`/${ROOM_PREFIX}/${id}`))
		await room.appFileRecordDidDelete()
		if (!fileRecord) {
			throw new Error('file record not found')
		}
		const publishedSlug = fileRecord.publishedSlug

		// Create a new slug for the published room
		await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(publishedSlug)

		// remove published files
		const publishedPrefixKey = getR2KeyForRoom({
			slug: `${id}/${publishedSlug}`,
			isApp: true,
		})
		const publishedHistory = await listAllObjectKeys(this.env.ROOM_SNAPSHOTS, publishedPrefixKey)
		await this.env.ROOM_SNAPSHOTS.delete(publishedHistory)
		// remove edit history
		const r2Key = getR2KeyForRoom({ slug: id, isApp: true })
		const editHistory = await listAllObjectKeys(this.env.ROOMS_HISTORY_EPHEMERAL, r2Key)
		await this.env.ROOMS_HISTORY_EPHEMERAL.delete(editHistory)
		// remove main file
		await this.env.ROOMS.delete(r2Key)
	}

	private async publishSnapshot(file: TlaFile) {
		if (file.ownerId !== this.userId) {
			throw new ZMutationError(ZErrorCode.forbidden, 'Cannot publish file that is not our own')
		}

		try {
			const serializedSnapshot = await getCurrentSerializedRoomSnapshot(file.id, this.env)

			// Create a new slug for the published room
			await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(file.publishedSlug, file.id)

			// Bang the snapshot into the database
			await this.env.ROOM_SNAPSHOTS.put(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}`, isApp: true }),
				serializedSnapshot
			)
			const currentTime = new Date().toISOString()
			await this.env.ROOM_SNAPSHOTS.put(
				getR2KeyForRoom({ slug: `${file.id}/${file.publishedSlug}|${currentTime}`, isApp: true }),
				serializedSnapshot
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
}

async function listAllObjectKeys(bucket: R2Bucket, prefix: string): Promise<string[]> {
	const keys: string[] = []
	let cursor: string | undefined

	do {
		const result = await bucket.list({ prefix, cursor })
		keys.push(...result.objects.map((o) => o.key))
		cursor = result.truncated ? result.cursor : undefined
	} while (cursor)

	return keys
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
